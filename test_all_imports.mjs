import fs from 'fs';
import path from 'path';

async function testImports(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      await testImports(full);
    } else if (f.endsWith('.js')) {
      const fileUrl = 'file:///' + path.resolve(full).replace(/\\/g, '/');
      try {
        await import(fileUrl);
        console.log('✓ Loaded:', f);
      } catch (e) {
        console.error('❌ FAILED TO IMPORT:', full);
        console.error(e);
      }
    }
  }
}

// Setup minimal globals so files that reference window or document don't blow up on top-level
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {}
};
global.document = {
  getElementById: () => ({ appendChild: () => {}, querySelector: () => null, addEventListener: () => {} }),
  createElement: () => ({ appendChild: () => {}, querySelector: () => null, addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } }),
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

testImports('./src').then(() => {
  console.log('\n--- All files tested ---');
});
