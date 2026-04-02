const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\ronny\\.gemini\\antigravity\\brain\\7d8377b2-489e-46a5-8ed3-01594ee09bc8';
const outputDir = 'c:\\Users\\ronny\\Desktop\\coffee-world\\assets\\images-webp';

const images = [
    { src: 'staff_kenyan_webp_1775167248487.png', dest: 'staff-kenyan.webp' },
    { src: 'event_seminar_webp_1775168441989.png', dest: 'event-seminar.webp' },
    { src: 'event_expo_branded_webp_1775168472148.png', dest: 'event-expo.webp' }
];

async function processImages() {
    for (const img of images) {
        const inputPath = path.join(brainDir, img.src);
        const outputPath = path.join(outputDir, img.dest);

        if (fs.existsSync(inputPath)) {
            try {
                await sharp(inputPath)
                    .webp({ quality: 80 })
                    .toFile(outputPath);
                console.log(`Converted: ${img.dest}`);
            } catch (err) {
                console.error(`Error converting ${img.src}:`, err);
            }
        } else {
            console.warn(`File not found: ${inputPath}`);
        }
    }
}

processImages();
