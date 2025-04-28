import os
import re
import json
import base64
import logging
import requests
import time
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from flask import Flask, request, render_template, jsonify, redirect, url_for, flash
from werkzeug.utils import secure_filename
from openai import OpenAI

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)
app.secret_key = os.getenv("SECRET_KEY", "trends-to-wordpress-secret-key")

# Configure upload folder
UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}

# Combine functionality from all three scripts
class GoogleTrendsAnalyzer:
    def __init__(self, api_key: str = None):
        """Initialize Google Trends Analyzer with Nebius API key."""
        self.api_key = api_key or os.getenv("NEBIUS_API_KEY")
        if not self.api_key:
            raise ValueError("Nebius API key is required. Set NEBIUS_API_KEY environment variable or pass it directly.")
        
        self.client = OpenAI(
            base_url="https://api.studio.nebius.com/v1/",
            api_key=self.api_key
        )

    def encode_image(self, image_path: str) -> str:
        """Encode an image file into a base64 string."""
        image_path = Path(image_path)
        if not image_path.is_file():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode("utf-8")

    def clean_json_response(self, text: str) -> str:
        """Remove Markdown-style ```json ... ``` wrappers from model output."""
        match = re.search(r"```(?:json)?\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        return text.strip()

    def parse_response(self, response_text: str) -> Dict[str, List[str]]:
        """Parse and clean model response text into a dictionary."""
        cleaned_text = self.clean_json_response(response_text)
        try:
            data = json.loads(cleaned_text)
            if isinstance(data, dict):
                return data
            else:
                raise ValueError("Parsed JSON is not a dictionary.")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {e}")

    def analyze_trends_screenshot(self, image_path: str) -> Dict[str, List[str]]:
        """Analyze a Google Trends screenshot and return extracted trends."""
        base64_image = self.encode_image(image_path)
        
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional data analyst specializing in interpreting Google Trends screenshots. "
                    "Extract all main trend titles and their associated keywords or trend breakdowns. "
                    "Return the extracted information in JSON format like: "
                    "{'Title1': ['keyword1', 'keyword2'], 'Title2': ['keyword1', 'keyword2'], ...}. "
                    "Only output valid JSON without any extra explanation or markdown."
                )
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze the following Google Trends screenshot and extract the trend titles and related keywords."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }
        ]

        response = self.client.chat.completions.create(
            model="google/gemma-3-27b-it-fast",
            max_tokens=512,
            temperature=0.5,
            top_p=0.9,
            extra_body={"top_k": 50},
            messages=messages
        )

        response_text = response.choices[0].message.content
        return self.parse_response(response_text)

class WordPressConfig:
    def __init__(self, wp_url=None, username=None, app_password=None):
        self.wp_url = wp_url or os.getenv("WP_URL", "").rstrip('/')
        self.username = username or os.getenv("WP_USERNAME", "")
        self.app_password = app_password or os.getenv("WP_APP_PASSWORD", "")
    
    @property
    def api_base(self) -> str:
        return f"{self.wp_url}/wp-json/wp/v2"

    def get_auth(self) -> Tuple[str, str]:
        return self.username, self.app_password

    def get_headers(self) -> dict:
        return {
            "User-Agent": "GoogleTrendsToWordPress/1.0",
            "Accept": "application/json"
        }

class ContentGenerator:
    def __init__(self, api_key: str = None):
        """Initialize Content Generator with Nebius API key."""
        self.api_key = api_key or os.getenv("NEBIUS_API_KEY")
        if not self.api_key:
            raise ValueError("Nebius API key is required. Set NEBIUS_API_KEY environment variable or pass it directly.")
        
        self.client = OpenAI(
            base_url="https://api.studio.nebius.com/v1/",
            api_key=self.api_key
        )
    
    def generate_seo_blog_content(
        self,
        main_topic: str,
        keywords: List[str],
        tone: str = "informative",
        post_type: str = "article",
        word_count: int = 800,
        max_retries: int = 3,
        retry_delay: int = 2
    ) -> Dict[str, str]:
        """Generate SEO-optimized blog content with title, excerpt, and body."""
        # Construct a detailed prompt
        prompt = f"""
        Generate SEO-optimized content for a WordPress blog post with the following components:

        MAIN TOPIC: {main_topic}
        
        KEY SEO KEYWORDS: {', '.join(keywords)}
        
        REQUIRED FORMAT (output as JSON):
        {{
            "title": "SEO-optimized title (60-70 characters, include 1-2 primary keywords, compelling and clickable)",
            "excerpt": "SEO-optimized meta description / excerpt (150-160 characters, include 1-2 keywords, entice clicks)",
            "content": "Full blog post content (formatted with proper HTML tags)"
        }}
        
        CONTENT REQUIREMENTS:
        - Title: Must be attention-grabbing and under 70 characters
        - Excerpt: Must summarize value proposition in under 160 characters
        - Content Structure: Use proper HTML tags (<h2>, <h3>, <p>, <ul>, <ol>, <li>)
        - Strategically place keywords in title, headings, first paragraph, and throughout content
        - Maintain keyword density of 1-2% for primary keywords
        - Include at least one call-to-action
        - Content should be {tone} in tone
        - Format as a {post_type}
        - Approximately {word_count} words for the main content
        
        IMPORTANT: Respond ONLY with the JSON. Do not include any other text.
        """
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating SEO content for topic: {main_topic}")
                
                response = self.client.chat.completions.create(
                    model="deepseek-ai/DeepSeek-V3",
                    messages=[
                        {"role": "system", "content": "You are an expert SEO content writer specializing in creating high-quality, optimized blog content."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=2000,
                    temperature=0.7,
                    top_p=0.95,
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content
                
                # Parse JSON response
                try:
                    result = json.loads(content)
                    
                    # Validate the result has required fields
                    if not all(k in result for k in ["title", "excerpt", "content"]):
                        raise ValueError("Response missing required fields")
                    
                    logger.info(f"Successfully generated SEO content. Title: {result['title']}")
                    return result
                    
                except json.JSONDecodeError:
                    logger.error("Failed to parse JSON response")
                    if attempt == max_retries - 1:
                        return {
                            "title": f"Article about {main_topic}",
                            "excerpt": f"Learn more about {main_topic} and {', '.join(keywords[:2])}.",
                            "content": "Error generating content. Please try again."
                        }
                
            except Exception as e:
                logger.error(f"Error generating SEO content (attempt {attempt+1}/{max_retries}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    return {
                        "title": f"Article about {main_topic}",
                        "excerpt": f"Learn more about {main_topic} and {', '.join(keywords[:2])}.",
                        "content": "Error generating content. Please try again."
                    }

class WordPressPublisher:
    def __init__(self, wp_config: WordPressConfig):
        """Initialize WordPress Publisher with WordPress configuration."""
        self.wp_config = wp_config
    
    async def test_connection(self) -> Dict:
        """Test connection to WordPress REST API."""
        try:
            test_url = f"{self.wp_config.api_base}/posts"
            logger.info(f"Testing WordPress connection at: {test_url}")

            resp = requests.get(
                test_url,
                auth=self.wp_config.get_auth(),
                headers=self.wp_config.get_headers(),
                params={"per_page": 1}
            )

            try:
                data = resp.json()
                is_json = True
            except ValueError:
                data = resp.text[:500]
                is_json = False

            return {
                "status": "ok" if resp.status_code < 400 else "error",
                "status_code": resp.status_code,
                "is_json": is_json,
                "data": data
            }

        except requests.RequestException as e:
            logger.error(f"Connection test failed: {e}")
            return {"status": "error", "error": str(e)}
    
    def post_to_wordpress(
        self,
        title: str,
        content: str,
        excerpt: Optional[str] = None,
        status: str = "draft",
        categories: Optional[List[int]] = None,
        tags: Optional[List[int]] = None,
        feature_image_path: Optional[str] = None
    ) -> Dict:
        """Post content to WordPress via REST API."""
        # Validate WordPress configuration
        if not all([self.wp_config.wp_url, self.wp_config.username, self.wp_config.app_password]):
            raise ValueError("Missing WordPress credentials")

        post_data = {
            "title": title,
            "content": content,
            "status": status
        }

        if excerpt:
            post_data["excerpt"] = excerpt
        if categories:
            post_data["categories"] = categories
        if tags:
            post_data["tags"] = tags

        try:
            # Check WordPress connection before posting
            logger.info("Testing WordPress connection before posting...")
            test_response = requests.get(
                f"{self.wp_config.api_base}/posts",
                auth=self.wp_config.get_auth(),
                headers=self.wp_config.get_headers(),
                params={"per_page": 1}
            )

            if test_response.status_code >= 400:
                logger.error(f"Connection failed: {test_response.status_code} {test_response.text}")
                return {"status": "error", "message": "WordPress connection failed", "code": test_response.status_code}

            # Handle feature image upload if provided
            media_id = None
            if feature_image_path and os.path.exists(feature_image_path):
                logger.info("Uploading feature image...")
                with open(feature_image_path, "rb") as img_file:
                    file_content = img_file.read()
                
                media_data = {
                    'file': (os.path.basename(feature_image_path), file_content, 'image/jpeg')
                }
                media_response = requests.post(
                    f"{self.wp_config.api_base}/media",
                    auth=self.wp_config.get_auth(),
                    headers=self.wp_config.get_headers(),
                    files=media_data
                )

                if media_response.status_code >= 400:
                    logger.error(f"Feature image upload failed: {media_response.status_code} {media_response.text}")
                else:
                    media_json = media_response.json()
                    media_id = media_json.get('id')
                    if media_id:
                        post_data['featured_media'] = media_id

            # Create post
            logger.info(f"Posting blog: {title}")
            post_response = requests.post(
                f"{self.wp_config.api_base}/posts",
                auth=self.wp_config.get_auth(),
                headers=self.wp_config.get_headers(),
                json=post_data
            )

            if post_response.status_code >= 400:
                logger.error(f"Post creation failed: {post_response.status_code} {post_response.text}")
                return {"status": "error", "message": post_response.text, "code": post_response.status_code}

            post_json = post_response.json()
            return {
                "status": "success",
                "post_id": post_json.get("id"),
                "link": post_json.get("link")
            }

        except requests.RequestException as e:
            logger.error(f"Post request error: {e}")
            return {"status": "error", "message": f"Failed to communicate with WordPress: {str(e)}"}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Flask routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/test-nebius', methods=['POST'])
def test_nebius():
    api_key = request.form.get('nebius_api_key') 
    print("Testing Nebius API key...", api_key)
    # api_key = os.getenv("NEBIUS_API_KEY")
    if not api_key:
        return jsonify({"status": "error", "message": "API key is required"})
    
    try:
        client = OpenAI(
            base_url="https://api.studio.nebius.com/v1/",
            api_key=api_key
        )
        
        response = client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one word."}
            ],
            max_tokens=10
        )
        
        content = response.choices[0].message.content
        # print(f"Response from Nebius: {content}")
        return jsonify({"status": "success", "message": f"Connection successful: {content}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/test-wordpress', methods=['POST'])
def test_wordpress():
    wp_url = request.form.get('wp_url')
    wp_username = request.form.get('wp_username')
    wp_app_password = request.form.get('wp_app_password')
    
    if not all([wp_url, wp_username, wp_app_password]):
        return jsonify({"status": "error", "message": "All WordPress credentials are required"})
    
    try:
        wp_config = WordPressConfig(wp_url, wp_username, wp_app_password)
        publisher = WordPressPublisher(wp_config)
        
        # Test connection is async, but we can work around it for Flask
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(publisher.test_connection())
        loop.close()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/analyze-trends', methods=['POST'])
def analyze_trends():
    # Check if the POST request has the file part
    if 'trends_image' not in request.files:
        return jsonify({"status": "error", "message": "No file part"})
    
    file = request.files['trends_image']
    nebius_api_key = request.form.get('nebius_api_key')
    
    # If user doesn't select file, browser also submits an empty file without filename
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"})
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        try:
            analyzer = GoogleTrendsAnalyzer(api_key=nebius_api_key)
            trends = analyzer.analyze_trends_screenshot(file_path)
            
            return jsonify({
                "status": "success", 
                "trends": trends
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})
    
    return jsonify({"status": "error", "message": "Invalid file format"})

@app.route('/generate-content', methods=['POST'])
def generate_content():
    nebius_api_key = request.form.get('nebius_api_key')
    main_topic = request.form.get('main_topic')
    keywords = request.form.get('keywords')
    tone = request.form.get('tone', 'informative')
    post_type = request.form.get('post_type', 'article')
    word_count = int(request.form.get('word_count', 800))
    
    if not all([nebius_api_key, main_topic, keywords]):
        return jsonify({"status": "error", "message": "Missing required parameters"})
    
    try:
        keywords_list = [k.strip() for k in keywords.split(',') if k.strip()]
        generator = ContentGenerator(api_key=nebius_api_key)
        
        content = generator.generate_seo_blog_content(
            main_topic=main_topic,
            keywords=keywords_list,
            tone=tone,
            post_type=post_type,
            word_count=word_count
        )
        
        return jsonify({
            "status": "success",
            "content": content
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/publish-to-wordpress', methods=['POST'])
def publish_to_wordpress():
    wp_url = request.form.get('wp_url')
    wp_username = request.form.get('wp_username')
    wp_app_password = request.form.get('wp_app_password')
    
    title = request.form.get('title')
    content = request.form.get('content')
    excerpt = request.form.get('excerpt')
    status = request.form.get('status', 'draft')
    
    categories_str = request.form.get('categories', '')
    tags_str = request.form.get('tags', '')
    
    feature_image_path = None
    if 'feature_image' in request.files:
        file = request.files['feature_image']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            feature_image_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(feature_image_path)
    
    if not all([wp_url, wp_username, wp_app_password, title, content]):
        return jsonify({"status": "error", "message": "Missing required parameters"})
    
    try:
        # Parse categories and tags
        categories = [int(cat.strip()) for cat in categories_str.split(',') if cat.strip().isdigit()] if categories_str else None
        tags = [int(tag.strip()) for tag in tags_str.split(',') if tag.strip().isdigit()] if tags_str else None
        
        wp_config = WordPressConfig(wp_url, wp_username, wp_app_password)
        publisher = WordPressPublisher(wp_config)
        
        result = publisher.post_to_wordpress(
            title=title,
            content=content,
            excerpt=excerpt,
            status=status,
            categories=categories,
            tags=tags,
            feature_image_path=feature_image_path
        )
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/full-workflow', methods=['POST'])
def full_workflow():
    # Step 1: Extract form data
    nebius_api_key = request.form.get('nebius_api_key')
    wp_url = request.form.get('wp_url')
    wp_username = request.form.get('wp_username')
    wp_app_password = request.form.get('wp_app_password')
    
    # For content generation
    main_topic = request.form.get('main_topic')
    keywords = request.form.get('keywords')
    tone = request.form.get('tone', 'informative')
    post_type = request.form.get('post_type', 'article')
    word_count = int(request.form.get('word_count', 800))
    
    # For WordPress posting
    status = request.form.get('status', 'draft')
    categories_str = request.form.get('categories', '')
    tags_str = request.form.get('tags', '')
    
    # Check required fields
    if not all([nebius_api_key, wp_url, wp_username, wp_app_password, main_topic, keywords]):
        return jsonify({"status": "error", "message": "Missing required parameters"})
    
    try:
        # Step 2: Generate content
        keywords_list = [k.strip() for k in keywords.split(',') if k.strip()]
        generator = ContentGenerator(api_key=nebius_api_key)
        
        content_result = generator.generate_seo_blog_content(
            main_topic=main_topic,
            keywords=keywords_list,
            tone=tone,
            post_type=post_type,
            word_count=word_count
        )
        
        if not content_result or "title" not in content_result:
            return jsonify({"status": "error", "message": "Failed to generate content"})
        
        # Step 3: Handle feature image if provided
        feature_image_path = None
        if 'feature_image' in request.files:
            file = request.files['feature_image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                feature_image_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(feature_image_path)
        
        # Step 4: Parse categories and tags
        categories = [int(cat.strip()) for cat in categories_str.split(',') if cat.strip().isdigit()] if categories_str else None
        tags = [int(tag.strip()) for tag in tags_str.split(',') if tag.strip().isdigit()] if tags_str else None
        
        # Step 5: Post to WordPress
        wp_config = WordPressConfig(wp_url, wp_username, wp_app_password)
        publisher = WordPressPublisher(wp_config)
        
        post_result = publisher.post_to_wordpress(
            title=content_result["title"],
            content=content_result["content"],
            excerpt=content_result["excerpt"],
            status=status,
            categories=categories,
            tags=tags,
            feature_image_path=feature_image_path
        )
        
        # Return the combined results
        return jsonify({
            "status": "success",
            "content_generation": {
                "title": content_result["title"],
                "excerpt": content_result["excerpt"],
                "content_preview": content_result["content"][:200] + "..." if len(content_result["content"]) > 200 else content_result["content"]
            },
            "wordpress_publishing": post_result
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True)