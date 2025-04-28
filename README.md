# Google Trends to WordPress

A powerful Flask application that automates the process of analyzing Google Trends screenshots, generating SEO-optimized content, and publishing it directly to WordPress. This tool uses Nebius AI API for image analysis and content generation.

## Features

- **Google Trends Analysis**: Upload screenshots of Google Trends and automatically extract trending topics and keywords
- **AI-Powered Content Generation**: Create SEO-optimized blog posts with proper structure and keyword placement
- **WordPress Integration**: Directly publish generated content to your WordPress site
- **User-Friendly Interface**: Step-by-step wizard interface with progress tracking
- **Customization Options**: Control tone, content type, word count, and publishing status

## Prerequisites

- Python 3.8+
- Flask
- A Nebius API key (for AI functionality)
- WordPress site with REST API access
- WordPress application password

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/google-trends-to-wordpress.git
   cd google-trends-to-wordpress
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root with your credentials:
   ```
   # API Keys
   NEBIUS_API_KEY=your_nebius_api_key_here
   SECRET_KEY=your_secret_key_for_flask_sessions

   # WordPress Configuration
   WP_URL=https://your-wordpress-site.com
   WP_USERNAME=your_wordpress_username
   WP_APP_PASSWORD=your_application_password
   ```

## Getting Your WordPress Application Password

To generate an application password for WordPress:

1. Log in to your WordPress admin panel
2. Go to Users → Profile
3. Scroll down to the "Application Passwords" section
4. Enter a name for the application (e.g., "Google Trends to WordPress")
5. Click "Add New Application Password"
6. Copy the generated password (you won't be able to see it again)

## Project Structure

```
google-trends-to-wordpress/
│
├── app.py                  # Main Flask application
├── static/                 # Static files (CSS, JavaScript)
│   ├── css/                # CSS styles
│   └── js/                 # JavaScript files
│       └── main.js         # Main JavaScript file
│
├── templates/              # HTML templates
│   └── index.html          # Main application page
│
├── uploads/                # Uploaded images directory
├── .env                    # Environment variables (create this)
└── requirements.txt        # Python dependencies
```

## Usage

1. Run the application:
   ```bash
   python app.py
   ```

2. Open your browser and navigate to `http://127.0.0.1:5000`

3. Follow the step-by-step process:
   - **Step 1**: Configure API keys and WordPress credentials
   - **Step 2**: Upload and analyze a Google Trends screenshot
   - **Step 3**: Generate content based on extracted trends
   - **Step 4**: Configure publishing options
   - **Step 5**: View results and access your published post

## How to Get a Google Trends Screenshot

1. Visit [Google Trends](https://trends.google.com/)
2. Navigate to the "Trending Searches" section
3. Take a screenshot of the trending topics
4. Save the image and upload it to the application

## Creating requirements.txt

Ensure your `requirements.txt` file includes:

```
Flask==2.3.3
python-dotenv==1.0.0
requests==2.31.0
openai==1.3.0
Werkzeug==2.3.7
```

## Troubleshooting

- **API Connection Issues**: Verify your Nebius API key is correct and has sufficient credits
- **WordPress Connection Issues**: 
  - Ensure your WordPress site has REST API enabled
  - Verify your application password is correct
  - Check that your user has appropriate publishing permissions
- **Image Analysis Problems**: Make sure screenshots are clear and actually show Google Trends data
- **Content Generation Failures**: Try again with slightly different keywords or main topic

## Security Notes

- Store your API keys and WordPress credentials securely
- Do not commit the `.env` file to version control
- Consider implementing rate limiting for production use
- Use HTTPS if deploying to a production environment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Nebius AI for image analysis and content generation capabilities
- WordPress REST API for publishing integration
- Flask framework for the web application