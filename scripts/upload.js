const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://xbyaauotligcvlebiexp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhieWFhdW90bGlnY3ZsZWJpZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDM2NTgsImV4cCI6MjA4NzA3OTY1OH0.mkSugT40RAhm5AJplfI6rGRxa6968ObQTOmUkoUaP0c';
const BUCKET_NAME = 'coffee-assets';

const inputDir = path.join(__dirname, '../assets/images-webp');

async function uploadFile(filePath, fileName) {
    return new Promise((resolve, reject) => {
        const fileContent = fs.readFileSync(filePath);
        const options = {
            hostname: 'xbyaauotligcvlebiexp.supabase.co',
            path: `/storage/v1/object/${BUCKET_NAME}/${fileName}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY,
                'Content-Type': 'image/webp',
                'Content-Length': fileContent.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`Successfully uploaded: ${fileName}`);
                    resolve();
                } else {
                    console.error(`Failed to upload ${fileName}: ${res.statusCode} ${body}`);
                    reject(new Error(`Status: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            reject(e);
        });

        req.write(fileContent);
        req.end();
    });
}

async function start() {
    const files = fs.readdirSync(inputDir);
    for (const file of files) {
        if (file.endsWith('.webp')) {
            try {
                await uploadFile(path.join(inputDir, file), file);
            } catch (err) {
                console.error(`Skipping ${file} due to error.`);
            }
        }
    }
    console.log('All uploads completed!');
}

start();
