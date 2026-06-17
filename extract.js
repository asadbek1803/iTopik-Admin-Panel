const fs = require('fs');
const path = require('path');

const dir = __dirname;
const pagesDir = path.join(dir, 'pages');

if (!fs.existsSync(pagesDir)){
    fs.mkdirSync(pagesDir);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    const pageContentMatch = content.match(/<div class="page-content">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
    // Alternatively, a safer regex:
    const regex = /<div class="page-content">\s*(<div id="page-[^"]+" class="page-section[^"]*">[\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;
    const match = content.match(regex);
    
    if (match && match[1]) {
        // extract the inner page-section content
        // wait, let's just grab the page-section div completely
        const sectionMatch = content.match(/<div id="page-[^"]+" class="page-section[^"]*">[\s\S]*?<\/div>\s*<!--/);
        // Wait, html parsing with regex is hard.
        // Let's use JSDOM or just a simple string split.
        const startMarker = '<div class="page-content">';
        let startIndex = content.indexOf(startMarker);
        if (startIndex !== -1) {
            startIndex += startMarker.length;
            // The content we want is until the end of page-section.
            // Let's find the script tag at the bottom and stop before the ending divs of main-content.
            let endMarker1 = '</div>\n    </div>\n  </div>\n</div>';
            let endMarker2 = '<!-- User Modal -->';
            let endIndex = content.indexOf(endMarker2);
            if (endIndex === -1) {
                endIndex = content.indexOf(endMarker1);
            }
            if (endIndex !== -1) {
                const snippet = content.substring(startIndex, endIndex).trim();
                // some snippets might end with extra </div> tags.
                // Let's just grab from `<div id="page-` to the end of that div.
                const idMatch = snippet.match(/<div id="page-[a-zA-Z0-9-]+" class="page-section/);
                if (idMatch) {
                    const startDiv = idMatch.index;
                    // Just take snippet
                    fs.writeFileSync(path.join(pagesDir, file), snippet);
                    console.log(`Extracted: ${file}`);
                } else {
                     console.log(`Failed to find id in: ${file}`);
                }
            }
        }
    }
}
