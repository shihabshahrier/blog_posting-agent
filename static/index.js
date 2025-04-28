document.addEventListener('DOMContentLoaded', function () {
    // Store data between steps
    const appData = {
        nebius: {
            apiKey: '',
            connected: false
        },
        wordpress: {
            url: '',
            username: '',
            password: '',
            connected: false
        },
        trends: {
            imageFile: null,
            extracted: null
        },
        content: {
            title: '',
            excerpt: '',
            content: '',
            mainTopic: '',
            keywords: []
        },
        post: {
            id: null,
            link: '',
            status: 'draft'
        }
    };

    // DOM Elements
    const elements = {
        // Steps
        steps: {
            step1: document.getElementById('step-1'),
            step2: document.getElementById('step-2'),
            step3: document.getElementById('step-3'),
            step4: document.getElementById('step-4'),
            step5: document.getElementById('step-5')
        },
        // Sections
        sections: {
            config: document.getElementById('config-section'),
            upload: document.getElementById('upload-section'),
            generate: document.getElementById('generate-section'),
            publish: document.getElementById('publish-section'),
            results: document.getElementById('results-section')
        },
        // Navigation buttons
        nav: {
            step1Next: document.getElementById('step1-next'),
            step2Prev: document.getElementById('step2-prev'),
            step2Next: document.getElementById('step2-next'),
            step3Prev: document.getElementById('step3-prev'),
            step3Next: document.getElementById('step3-next'),
            step4Prev: document.getElementById('step4-prev'),
            step4Next: document.getElementById('step4-next'),
            restart: document.getElementById('restart-btn')
        },
        // API Configuration
        api: {
            nebiusApiKey: document.getElementById('nebius-api-key'),
            testNebiusBtn: document.getElementById('test-nebius-btn'),
            nebiusStatus: document.getElementById('nebius-status'),
            wpUrl: document.getElementById('wp-url'),
            wpUsername: document.getElementById('wp-username'),
            wpAppPassword: document.getElementById('wp-app-password'),
            testWpBtn: document.getElementById('test-wp-btn'),
            wpStatus: document.getElementById('wp-status')
        },
        // Upload Section
        upload: {
            trendsImage: document.getElementById('trends-image'),
            fileLabel: document.getElementById('file-label'),
            imagePreviewContainer: document.getElementById('image-preview-container'),
            imagePreview: document.getElementById('image-preview'),
            analyzeSection: document.getElementById('analyze-section'),
            analyzeBtn: document.getElementById('analyze-btn'),
            analyzeLoader: document.getElementById('analyze-loader'),
            analyzeResults: document.getElementById('analyze-results'),
            trendsList: document.getElementById('trends-list')
        },
        // Generate Section
        generate: {
            mainTopic: document.getElementById('main-topic'),
            keywords: document.getElementById('keywords'),
            tone: document.getElementById('tone'),
            postType: document.getElementById('post-type'),
            wordCount: document.getElementById('word-count'),
            generateBtn: document.getElementById('generate-btn'),
            generateLoader: document.getElementById('generate-loader'),
            contentPreview: document.getElementById('content-preview'),
            previewTitle: document.getElementById('preview-title'),
            previewExcerpt: document.getElementById('preview-excerpt'),
            previewContent: document.getElementById('preview-content')
        },
        // Publish Section
        publish: {
            postStatus: document.getElementById('post-status'),
            categories: document.getElementById('categories'),
            tags: document.getElementById('tags'),
            featureImage: document.getElementById('feature-image'),
            featureImageName: document.getElementById('feature-image-name'),
            publishBtn: document.getElementById('publish-btn'),
            publishLoader: document.getElementById('publish-loader')
        },
        // Results Section
        results: {
            resultTitle: document.getElementById('result-title'),
            resultStatus: document.getElementById('result-status'),
            resultId: document.getElementById('result-id'),
            resultLink: document.getElementById('result-link'),
            viewPostBtn: document.getElementById('view-post-btn')
        },
        // Alert
        alert: {
            container: document.getElementById('alert-container'),
            content: document.getElementById('alert')
        }
    };

    // Helper Functions
    function showStep(stepNumber) {
        // Hide all sections
        Object.values(elements.sections).forEach(section => {
            section.classList.add('hidden');
        });

        // Reset step status
        Object.values(elements.steps).forEach(step => {
            step.classList.remove('active', 'completed');
        });

        // Set active step and section
        const stepKey = `step${stepNumber}`;
        const sectionKeys = ['config', 'upload', 'generate', 'publish', 'results'];
        const sectionKey = sectionKeys[stepNumber - 1];

        elements.steps[stepKey].classList.add('active');
        elements.sections[sectionKey].classList.remove('hidden');

        // Mark previous steps as completed
        for (let i = 1; i < stepNumber; i++) {
            elements.steps[`step${i}`].classList.add('completed');
        }
    }

    function showAlert(message, type = 'error') {
        elements.alert.container.classList.remove('hidden');
        elements.alert.content.textContent = message;
        elements.alert.content.className = 'p-4 rounded';

        if (type === 'error') {
            elements.alert.content.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
        } else if (type === 'success') {
            elements.alert.content.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
        } else if (type === 'info') {
            elements.alert.content.classList.add('bg-blue-50', 'text-blue-700', 'border', 'border-blue-200');
        } else if (type === 'warning') {
            elements.alert.content.classList.add('bg-yellow-50', 'text-yellow-700', 'border', 'border-yellow-200');
        }

        // Hide after 5 seconds
        setTimeout(() => {
            elements.alert.container.classList.add('hidden');
        }, 5000);
    }

    // API Functions
    async function testNebiusConnection() {
        const apiKey = elements.api.nebiusApiKey.value.trim();
        if (!apiKey) {
            showAlert('Please enter a Nebius API key');
            return;
        }

        elements.api.testNebiusBtn.disabled = true;
        elements.api.testNebiusBtn.textContent = 'Testing...';

        try {
            const formData = new FormData();
            formData.append('nebius_api_key', apiKey);

            const response = await fetch('/test-nebius', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                appData.nebius.apiKey = apiKey;
                appData.nebius.connected = true;
                elements.api.nebiusStatus.innerHTML = '<span class="status-indicator connected"></span> Connected';
                showAlert('Nebius API connection successful!', 'success');
            } else {
                elements.api.nebiusStatus.innerHTML = '<span class="status-indicator disconnected"></span> Connection failed';
                showAlert(`Connection failed: ${data.message}`);
            }
        } catch (error) {
            elements.api.nebiusStatus.innerHTML = '<span class="status-indicator disconnected"></span> Connection failed';
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.api.testNebiusBtn.disabled = false;
            elements.api.testNebiusBtn.textContent = 'Test';
        }
    }

    async function testWordPressConnection() {
        const wpUrl = elements.api.wpUrl.value.trim();
        const wpUsername = elements.api.wpUsername.value.trim();
        const wpAppPassword = elements.api.wpAppPassword.value.trim();

        if (!wpUrl || !wpUsername || !wpAppPassword) {
            showAlert('Please enter all WordPress credentials');
            return;
        }

        elements.api.testWpBtn.disabled = true;
        elements.api.testWpBtn.textContent = 'Testing...';

        try {
            const formData = new FormData();
            formData.append('wp_url', wpUrl);
            formData.append('wp_username', wpUsername);
            formData.append('wp_app_password', wpAppPassword);

            const response = await fetch('/test-wordpress', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'ok') {
                appData.wordpress.url = wpUrl;
                appData.wordpress.username = wpUsername;
                appData.wordpress.password = wpAppPassword;
                appData.wordpress.connected = true;
                elements.api.wpStatus.innerHTML = '<span class="status-indicator connected"></span> Connected';
                showAlert('WordPress connection successful!', 'success');
            } else {
                elements.api.wpStatus.innerHTML = '<span class="status-indicator disconnected"></span> Connection failed';
                showAlert(`Connection failed: ${data.message || 'Check your credentials'}`);
            }
        } catch (error) {
            elements.api.wpStatus.innerHTML = '<span class="status-indicator disconnected"></span> Connection failed';
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.api.testWpBtn.disabled = false;
            elements.api.testWpBtn.textContent = 'Test';
        }
    }

    async function analyzeTrendsImage() {
        if (!appData.trends.imageFile) {
            showAlert('Please upload a Google Trends screenshot first');
            return;
        }

        if (!appData.nebius.apiKey) {
            showAlert('Please configure and test Nebius API key first');
            return;
        }

        elements.upload.analyzeBtn.disabled = true;
        elements.upload.analyzeLoader.classList.remove('hidden');
        elements.upload.analyzeResults.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('trends_image', appData.trends.imageFile);
            formData.append('nebius_api_key', appData.nebius.apiKey);

            const response = await fetch('/analyze-trends', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                appData.trends.extracted = data.trends;
                displayExtractedTrends(data.trends);
                elements.upload.analyzeResults.classList.remove('hidden');
                elements.nav.step2Next.classList.remove('hidden');
                showAlert('Trends analysis completed successfully!', 'success');
            } else {
                showAlert(`Analysis failed: ${data.message}`);
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.upload.analyzeBtn.disabled = false;
            elements.upload.analyzeLoader.classList.add('hidden');
        }
    }

    function displayExtractedTrends(trends) {
        elements.upload.trendsList.innerHTML = '';

        if (!trends || Object.keys(trends).length === 0) {
            elements.upload.trendsList.innerHTML = '<p class="text-gray-500">No trends extracted</p>';
            return;
        }

        const trendsList = document.createElement('ul');
        trendsList.className = 'space-y-2';

        for (const [trend, keywords] of Object.entries(trends)) {
            const trendItem = document.createElement('li');
            trendItem.className = 'border-b pb-2';

            const trendTitle = document.createElement('div');
            trendTitle.className = 'font-medium text-blue-700 cursor-pointer hover:underline';
            trendTitle.textContent = trend;

            // Add click handler to select this trend for content generation
            trendTitle.addEventListener('click', () => {
                elements.generate.mainTopic.value = trend;
                elements.generate.keywords.value = keywords.join(', ');
                showStep(3);
            });

            const keywordsEl = document.createElement('div');
            keywordsEl.className = 'text-sm text-gray-600 mt-1';
            keywordsEl.textContent = `Keywords: ${keywords.join(', ')}`;

            trendItem.appendChild(trendTitle);
            trendItem.appendChild(keywordsEl);
            trendsList.appendChild(trendItem);
        }

        elements.upload.trendsList.appendChild(trendsList);
    }

    async function generateContent() {
        const mainTopic = elements.generate.mainTopic.value.trim();
        const keywords = elements.generate.keywords.value.trim();
        const tone = elements.generate.tone.value;
        const postType = elements.generate.postType.value;
        const wordCount = elements.generate.wordCount.value;

        if (!mainTopic || !keywords) {
            showAlert('Please enter a main topic and keywords');
            return;
        }

        if (!appData.nebius.apiKey) {
            showAlert('Please configure and test Nebius API key first');
            return;
        }

        elements.generate.generateBtn.disabled = true;
        elements.generate.generateLoader.classList.remove('hidden');
        elements.generate.contentPreview.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('nebius_api_key', appData.nebius.apiKey);
            formData.append('main_topic', mainTopic);
            formData.append('keywords', keywords);
            formData.append('tone', tone);
            formData.append('post_type', postType);
            formData.append('word_count', wordCount);

            const response = await fetch('/generate-content', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store content for publishing
                appData.content.title = data.content.title;
                appData.content.excerpt = data.content.excerpt;
                appData.content.content = data.content.content;
                appData.content.mainTopic = mainTopic;
                appData.content.keywords = keywords.split(',').map(k => k.trim());

                // Display preview
                elements.generate.previewTitle.textContent = data.content.title;
                elements.generate.previewExcerpt.textContent = data.content.excerpt;
                elements.generate.previewContent.innerHTML = data.content.content;
                elements.generate.contentPreview.classList.remove('hidden');
                elements.nav.step3Next.classList.remove('hidden');

                showAlert('Content generated successfully!', 'success');
            } else {
                showAlert(`Content generation failed: ${data.message}`);
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.generate.generateBtn.disabled = false;
            elements.generate.generateLoader.classList.add('hidden');
        }
    }

    async function publishToWordPress() {
        if (!appData.wordpress.connected) {
            showAlert('Please configure and test WordPress connection first');
            return;
        }

        if (!appData.content.title || !appData.content.content) {
            showAlert('Please generate content first');
            return;
        }

        const status = elements.publish.postStatus.value;
        const categories = elements.publish.categories.value.trim();
        const tags = elements.publish.tags.value.trim();
        const featureImageFile = elements.publish.featureImage.files[0];

        elements.publish.publishBtn.disabled = true;
        elements.publish.publishLoader.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('wp_url', appData.wordpress.url);
            formData.append('wp_username', appData.wordpress.username);
            formData.append('wp_app_password', appData.wordpress.password);
            formData.append('title', appData.content.title);
            formData.append('content', appData.content.content);
            formData.append('excerpt', appData.content.excerpt);
            formData.append('status', status);

            if (categories) {
                formData.append('categories', categories);
            }

            if (tags) {
                formData.append('tags', tags);
            }

            if (featureImageFile) {
                formData.append('feature_image', featureImageFile);
            }

            const response = await fetch('/publish-to-wordpress', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Store post information
                appData.post.id = data.post_id;
                appData.post.link = data.link;
                appData.post.status = status;

                // Display results
                elements.results.resultTitle.textContent = appData.content.title;
                elements.results.resultStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                elements.results.resultId.textContent = data.post_id;
                elements.results.resultLink.textContent = data.link;
                elements.results.resultLink.href = data.link;
                elements.results.viewPostBtn.href = data.link;

                elements.nav.step4Next.classList.remove('hidden');
                showAlert('Post published successfully!', 'success');
                showStep(5);
            } else {
                showAlert(`Publishing failed: ${data.message}`);
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.publish.publishBtn.disabled = false;
            elements.publish.publishLoader.classList.add('hidden');
        }
    }

    async function executeFullWorkflow() {
        if (!appData.nebius.connected || !appData.wordpress.connected) {
            showAlert('Please configure and test both API connections first');
            return;
        }

        const mainTopic = elements.generate.mainTopic.value.trim();
        const keywords = elements.generate.keywords.value.trim();
        const tone = elements.generate.tone.value;
        const postType = elements.generate.postType.value;
        const wordCount = elements.generate.wordCount.value;
        const status = elements.publish.postStatus.value;
        const categories = elements.publish.categories.value.trim();
        const tags = elements.publish.tags.value.trim();
        const featureImageFile = elements.publish.featureImage.files[0];

        if (!mainTopic || !keywords) {
            showAlert('Please enter a main topic and keywords');
            return;
        }

        elements.publish.publishBtn.disabled = true;
        elements.publish.publishLoader.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('nebius_api_key', appData.nebius.apiKey);
            formData.append('wp_url', appData.wordpress.url);
            formData.append('wp_username', appData.wordpress.username);
            formData.append('wp_app_password', appData.wordpress.password);
            formData.append('main_topic', mainTopic);
            formData.append('keywords', keywords);
            formData.append('tone', tone);
            formData.append('post_type', postType);
            formData.append('word_count', wordCount);
            formData.append('status', status);

            if (categories) {
                formData.append('categories', categories);
            }

            if (tags) {
                formData.append('tags', tags);
            }

            if (featureImageFile) {
                formData.append('feature_image', featureImageFile);
            }

            const response = await fetch('/full-workflow', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Save content and post data
                appData.content.title = data.content_generation.title;
                appData.content.excerpt = data.content_generation.excerpt;
                appData.post.id = data.wordpress_publishing.post_id;
                appData.post.link = data.wordpress_publishing.link;
                appData.post.status = status;

                // Display results
                elements.results.resultTitle.textContent = data.content_generation.title;
                elements.results.resultStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                elements.results.resultId.textContent = data.wordpress_publishing.post_id;
                elements.results.resultLink.textContent = data.wordpress_publishing.link;
                elements.results.resultLink.href = data.wordpress_publishing.link;
                elements.results.viewPostBtn.href = data.wordpress_publishing.link;

                showAlert('Full workflow completed successfully!', 'success');
                showStep(5);
            } else {
                showAlert(`Workflow failed: ${data.message}`);
            }
        } catch (error) {
            showAlert(`Error: ${error.message}`);
        } finally {
            elements.publish.publishBtn.disabled = false;
            elements.publish.publishLoader.classList.add('hidden');
        }
    }

    // Event Listeners - Navigation
    elements.nav.step1Next.addEventListener('click', () => {
        if (!appData.nebius.connected) {
            showAlert('Please test Nebius API connection first', 'warning');
            return;
        }
        showStep(2);
    });

    elements.nav.step2Prev.addEventListener('click', () => {
        showStep(1);
    });

    elements.nav.step2Next.addEventListener('click', () => {
        showStep(3);
    });

    elements.nav.step3Prev.addEventListener('click', () => {
        showStep(2);
    });

    elements.nav.step3Next.addEventListener('click', () => {
        showStep(4);
    });

    elements.nav.step4Prev.addEventListener('click', () => {
        showStep(3);
    });

    elements.nav.step4Next.addEventListener('click', () => {
        showStep(5);
    });

    elements.nav.restart.addEventListener('click', () => {
        // Reset form fields but keep API keys
        elements.generate.mainTopic.value = '';
        elements.generate.keywords.value = '';
        elements.generate.tone.value = 'informative';
        elements.generate.postType.value = 'article';
        elements.generate.wordCount.value = '800';
        elements.publish.postStatus.value = 'draft';
        elements.publish.categories.value = '';
        elements.publish.tags.value = '';
        elements.publish.featureImage.value = '';
        elements.publish.featureImageName.textContent = '';
        elements.publish.featureImageName.classList.add('hidden');

        // Reset preview sections
        elements.upload.imagePreviewContainer.classList.add('hidden');
        elements.upload.analyzeSection.classList.add('hidden');
        elements.upload.analyzeResults.classList.add('hidden');
        elements.generate.contentPreview.classList.add('hidden');

        // Hide navigation buttons
        elements.nav.step2Next.classList.add('hidden');
        elements.nav.step3Next.classList.add('hidden');
        elements.nav.step4Next.classList.add('hidden');

        // Start from step 1
        showStep(1);
    });

    // Event Listeners - API Tests
    elements.api.testNebiusBtn.addEventListener('click', testNebiusConnection);
    elements.api.testWpBtn.addEventListener('click', testWordPressConnection);

    // Event Listeners - File Upload
    elements.upload.trendsImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            appData.trends.imageFile = file;
            elements.upload.fileLabel.textContent = file.name;

            // Display image preview
            const reader = new FileReader();
            reader.onload = function (event) {
                elements.upload.imagePreview.src = event.target.result;
                elements.upload.imagePreviewContainer.classList.remove('hidden');
                elements.upload.analyzeSection.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    // Feature image preview
    elements.publish.featureImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.publish.featureImageName.textContent = `Selected: ${file.name}`;
            elements.publish.featureImageName.classList.remove('hidden');
        }
    });

    // Event Listeners - Actions
    elements.upload.analyzeBtn.addEventListener('click', analyzeTrendsImage);
    elements.generate.generateBtn.addEventListener('click', generateContent);
    elements.publish.publishBtn.addEventListener('click', publishToWordPress);

    // Initialize the app with the first step
    showStep(1);
});