const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../assets/images');
const outputDir = path.join(__dirname, '../assets/images-webp');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir);

files.forEach(file => {
    const filePath = path.join(inputDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && /\.(png|jpg|jpeg|avif)$/i.test(file)) {
        const outputFilename = file.replace(/\.[^.]+$/, '.webp');
        const outputPath = path.join(outputDir, outputFilename);

        sharp(filePath)
            .webp({ quality: 75, effort: 6 }) // High compression, good quality
            .toFile(outputPath)
            .then(info => {
                const originalSize = (stats.size / 1024 / 1024).toFixed(2);
                const optimizedSize = (info.size / 1024 / 1024).toFixed(2);
                console.log(`Optimized: ${file} (${originalSize}MB -> ${optimizedSize}MB)`);
            })
            .catch(err => {
                console.error(`Error optimizing ${file}:`, err);
            });
    }
});
