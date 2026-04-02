const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\ronny\\.gemini\\antigravity\\brain\\7d8377b2-489e-46a5-8ed3-01594ee09bc8';
const outputDir = 'c:\\Users\\ronny\\Desktop\\coffee-world\\assets\\images-webp';

const images = [
    { src: 'event_expo_v2_webp_1775169143339.png', dest: 'event-expo-v2.webp' },
    { src: 'origin_story_webp_1775169169856.png', dest: 'origin-story.webp' },
    { src: 'event_seminar_v3_webp_1775169201002.png', dest: 'event-seminar-v2.webp' }
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
