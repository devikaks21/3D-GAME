import fs from 'fs';
import path from 'path';

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkDir(full);
    } else if (f.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      const importRegex = /from\s+['"]([^'"]+)['"]/g;
      let m;
      while ((m = importRegex.exec(code)) !== null) {
        const imp = m[1];
        if (imp.startsWith('.')) {
          const resolved = path.resolve(dir, imp);
          if (!fs.existsSync(resolved)) {
            console.error('BROKEN IMPORT in', full, '-->', imp, '(resolved:', resolved, ')');
          }
        }
      }
    }
  }
}

checkDir('./src');
console.log('Done checking all imports.');
