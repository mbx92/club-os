const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1'; // Adjust if needed
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.png');

// Test credentials
const TEST_USER = {
    email: 'admin@tenant-a.com',
    password: 'password123'
};

async function authenticate() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
        if (response.data.success) {
            return response.data.data.token;
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function testUpload() {
    try {
        // 1. Authenticate
        const token = await authenticate();
        if (!token) {
            console.log('Skipping upload test due to auth failure.');
            return;
        }
        console.log('✅ Authenticated successfully.');

        // 2. Create a dummy image file
        if (!fs.existsSync(TEST_IMAGE_PATH)) {
            // Create a 1x1 transparent PNG
            const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwAEQAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(TEST_IMAGE_PATH, buffer);
            console.log('Created dummy test image:', TEST_IMAGE_PATH);
        }

        // 3. Prepare FormData
        const formData = new FormData();
        formData.append('name', 'Test Product Upload ' + Date.now());
        formData.append('sku', 'TEST-UPLOAD-' + Date.now());
        formData.append('price', '10000');
        formData.append('cost', '5000');
        // Minimal required fields based on model
        formData.append('stockQuantity', '10');
        formData.append('minStockLevel', '5');

        formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));

        // 4. Send Request
        console.log('Sending upload request...');
        const response = await axios.post(`${BASE_URL}/restaurant/products`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response:', JSON.stringify(response.data, null, 2));

        if (response.data.success && response.data.data.image) {
            console.log('✅ Upload successful! Image path:', response.data.data.image);
        } else {
            console.error('❌ Upload failed or image path missing.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(TEST_IMAGE_PATH)) {
            fs.unlinkSync(TEST_IMAGE_PATH);
        }
    }
}

testUpload();
