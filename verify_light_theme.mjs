import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_light_theme';
const artifactDir = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75';
const port = 9241;

console.log('🚀 Launching Edge for Light Theme Verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2600));

http.get(`http://127.0.0.1:${port}/json`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.type === 'page');
      if (!pageTarget) {
        console.error('❌ No page target found');
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      let msgId = 1;
      const send = (method, params = {}) => {
        return new Promise((resolve, reject) => {
          const id = msgId++;
          const handler = (evt) => {
            const res = JSON.parse(evt.data);
            if (res.id === id) {
              ws.removeEventListener('message', handler);
              if (res.error) reject(res.error);
              else resolve(res.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      const evalScript = async (expression) => {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true });
        return res.result?.value;
      };

      const takeScreenshot = async (filename) => {
        const res = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = path.join(artifactDir, filename);
        fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
        console.log(`  📸 Screenshot saved: ${filename}`);
      };

      ws.onopen = async () => {
        console.log('CDP Connected.');
        await send('Page.enable');
        await send('Runtime.enable');

        await new Promise(r => setTimeout(r, 1500));

        // 1. Verify default Light theme
        console.log('\n--- 1. VERIFYING DEFAULT LIGHT THEME ---');
        const themeInfo = await evalScript(`(() => ({
          hasLightClass: document.body.classList.contains('theme-light'),
          dataTheme: document.body.getAttribute('data-theme'),
          bgColor: window.getComputedStyle(document.body).backgroundColor,
          skyColor: window.game?.scene?.background?.getHexString(),
          fogColor: window.game?.scene?.fog?.color?.getHexString(),
          timeMode: window.game?.environmentSystem?.timeMode
        }))()`);
        console.log('  ✓ Initial Theme & Atmosphere state:', themeInfo);
        if (!themeInfo.hasLightClass) throw new Error('Body should have theme-light class');
        if (themeInfo.skyColor === '090b10') throw new Error('Daytime sky must not be pitch black!');

        await takeScreenshot('light_theme_driving_screenshot.png');

        // 2. Open Settings in Light Theme
        console.log('\n--- 2. VERIFYING SETTINGS MENU IN LIGHT THEME ---');
        await evalScript(`window.game.settingsUI.show()`);
        await new Promise(r => setTimeout(r, 400));
        await evalScript(`document.getElementById('tab-btn-gameplay').click()`);
        await new Promise(r => setTimeout(r, 300));

        const settingsThemeState = await evalScript(`(() => ({
          themeButtons: Array.from(document.querySelectorAll('#ctrl-theme .seg-btn')).map(b => b.dataset.val),
          themeActive: document.querySelector('#ctrl-theme .seg-btn.active')?.dataset?.val
        }))()`);
        console.log('  ✓ Settings Theme Controls:', settingsThemeState);
        if (!settingsThemeState.themeButtons.includes('light') || !settingsThemeState.themeButtons.includes('dark')) {
          throw new Error('Settings must contain light and dark options');
        }

        await takeScreenshot('light_theme_settings_screenshot.png');

        // 3. Test toggle via Settings
        console.log('\n--- 3. VERIFYING TOGGLE BETWEEN LIGHT AND DARK ---');
        await evalScript(`document.querySelector('#ctrl-theme .seg-btn[data-val="dark"]').click()`);
        await new Promise(r => setTimeout(r, 200));
        const darkCheck = await evalScript(`(() => ({
          hasLightClass: document.body.classList.contains('theme-light'),
          dataTheme: document.body.getAttribute('data-theme')
        }))()`);
        console.log('  ✓ Switched to Dark:', darkCheck);
        if (darkCheck.hasLightClass) throw new Error('Dark mode should remove theme-light');

        // Switch back to Light
        await evalScript(`document.querySelector('#ctrl-theme .seg-btn[data-val="light"]').click()`);
        await new Promise(r => setTimeout(r, 200));
        const lightCheckAgain = await evalScript(`(() => ({
          hasLightClass: document.body.classList.contains('theme-light')
        }))()`);
        console.log('  ✓ Switched back to Light:', lightCheckAgain);
        if (!lightCheckAgain.hasLightClass) throw new Error('Should have theme-light class');

        // Return to driving
        await evalScript(`window.game.settingsUI.hide(); window.game.gameState.setState('PLAYING');`);
        await new Promise(r => setTimeout(r, 400));

        console.log('\n======================================================');
        console.log('🎉 LIGHT THEME SYSTEM FULLY VERIFIED 100%!');
        console.log('======================================================\n');

        ws.close();
        proc.kill();
        process.exit(0);
      };
    } catch (err) {
      console.error('❌ Verification failed:', err);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP connect error:', err);
  proc.kill();
  process.exit(1);
});
