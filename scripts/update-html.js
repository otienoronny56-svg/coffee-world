const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../');
const supabaseBaseUrl = 'https://xbyaauotligcvlebiexp.supabase.co/storage/v1/object/public/coffee-assets';

// Find all HTML files recursively
function getHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                getHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const htmlFiles = getHtmlFiles(rootDir);

htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to match local image paths
    // Supports src="./assets/images/..." and href="./assets/images/..."
    // Captures the filename and ignores the extension
    const imageRegex = / (src|href|content)="(?:\.\/)?assets\/images\/(.*?)\.(?:png|jpg|jpeg|gif|avif|webp)"/g;
    
    const updatedContent = content.replace(imageRegex, (match, p1, p2) => {
        const newUrl = `${supabaseBaseUrl}/${p2}.webp`;
        console.log(`Updated link in ${path.basename(filePath)}: ${p2} -> CDN`);
        return ` ${p1}="${newUrl}"`;
    });
    
    if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Successfully updated ${path.basename(filePath)}`);
    }
});
