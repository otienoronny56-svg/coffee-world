const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\ronny\\.gemini\\antigravity\\brain\\7d8377b2-489e-46a5-8ed3-01594ee09bc8';
const outputDir = 'c:\\Users\\ronny\\Desktop\\coffee-world\\assets\\images-webp';

const images = [
    { src: 'staff_uniform_branded_webp_1775166227968.png', dest: 'staff-uniform.webp' },
    { src: 'merch_group_branded_webp_1775166250118.png', dest: 'merch-group.webp' },
    { src: 'packaging_premium_branded_webp_1775166272679.png', dest: 'packaging-premium.webp' },
    { src: 'export_branded_webp_1775166294052.png', dest: 'export-branded.webp' }
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
                console.log(`Converted: ${img.src} -> ${img.dest}`);
            } catch (err) {
                console.error(`Error converting ${img.src}:`, err);
            }
        } else {
            console.warn(`File not found: ${inputPath}`);
        }
    }
}

processImages();
