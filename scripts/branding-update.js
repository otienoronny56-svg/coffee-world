const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../');
const supabaseBaseUrl = 'https://xbyaauotligcvlebiexp.supabase.co/storage/v1/object/public/coffee-assets';

const replacements = {
    'kenyan_coffee_masters.webp': 'staff-uniform.webp',
    'packaging2.webp': 'packaging-premium.webp',
    'export.webp': 'export-branded.webp'
};

function getHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') getHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) fileList.push(filePath);
    });
    return fileList;
}

const htmlFiles = getHtmlFiles(rootDir);

htmlFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const [oldImg, newImg] of Object.entries(replacements)) {
        const oldUrl = `${supabaseBaseUrl}/${oldImg}`;
        const newUrl = `${supabaseBaseUrl}/${newImg}`;
        content = content.split(oldUrl).join(newUrl);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated branding in ${path.basename(filePath)}`);
    }
});
