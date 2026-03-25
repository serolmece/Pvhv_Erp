const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'src');

function findAndReplace(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndReplace(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // replace baseURL in axios.js
            if (file === 'axios.js') {
                content = content.replace(/baseURL:\s*'http:\/\/localhost:500[0-9]\/api'/g, "baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api'");
            } else {
                // For other files, replace the absolute string with the base URL + endpoint,
                // actually we can just use the axios instance in these files but that's a larger refactor.
                // Alternatively, replace "http://localhost:5001/api" with `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}`
                content = content.replace(/'http:\/\/localhost:5001\/api([^']*)'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}$1`");
                content = content.replace(/"http:\/\/localhost:5001\/api([^"]*)"/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}$1`");
                content = content.replace(/`http:\/\/localhost:5001\/api([^`]*)`/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}$1`");
            }
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    });
}

findAndReplace(directoryPath);
