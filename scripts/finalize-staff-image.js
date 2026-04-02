const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\ronny\\.gemini\\antigravity\\brain\\7d8377b2-489e-46a5-8ed3-01594ee09bc8';
const outputDir = 'c:\\Users\\ronny\\Desktop\\coffee-world\\assets\\images-webp';

async function processImage() {
    const inputPath = path.join(brainDir, 'staff_kenyan_webp_1775167248487.png');
    const outputPath = path.join(outputDir, 'staff-kenyan.webp');

    if (fs.existsSync(inputPath)) {
        try {
            await sharp(inputPath)
                .webp({ quality: 80 })
                .toFile(outputPath);
            console.log(`Converted: staff-kenyan.webp`);
        } catch (err) {
            console.error(`Error converting:`, err);
        }
    } else {
        console.warn(`File not found: ${inputPath}`);
    }
}

processImage();
