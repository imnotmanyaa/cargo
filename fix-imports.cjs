const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

let count = 0;
files.forEach(f => {
    const orig = fs.readFileSync(f, 'utf8');
    // Replace versioned imports like "lucide-react@0.487.0" or "@radix-ui/react-select@2.1.6"
    // Pattern: inside quotes, find package name followed by @semver and strip the @semver part
    const updated = orig.replace(/(['"])([^'"]+?)@\d+\.\d+[\.\d\-a-z]*(['"])/g, '$1$2$3');
    if (orig !== updated) {
        fs.writeFileSync(f, updated, 'utf8');
        console.log(`  Fixed: ${path.relative(__dirname, f)}`);
        count++;
    }
});
console.log(`\nDone. Fixed imports in ${count} files.`);
