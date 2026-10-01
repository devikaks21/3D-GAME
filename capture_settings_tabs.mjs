import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_settings_tabs';
const artifactDir = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75';
const port = 9238;

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

await new Promise(r => setTimeout(r, 2000));

http.get(`http://127.0.0.1:${port}/json`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.type === 'page');
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      let msgId = 1;
      const send = (method, params = {}) => {
        return new Promise((resolve) => {
          const id = msgId++;
          const handler = (evt) => {
            const res = JSON.parse(evt.data);
            if (res.id === id) {
              ws.removeEventListener('message', handler);
              resolve(res.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      ws.onopen = async () => {
        await send('Runtime.enable');
        await send('Page.enable');
        await new Promise(r => setTimeout(r, 1000));

        // Open settings on graphics
        await send('Runtime.evaluate', {
          expression: `(() => {
            const g = window.game;
            g.gameState.setState('SETTINGS');
            g.settingsUI.show('graphics');
          })()`
        });
        await new Promise(r => setTimeout(r, 600));

        const shot1 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'settings_graphics_screenshot.png'), Buffer.from(shot1.data, 'base64'));

        // Switch to controls
        await send('Runtime.evaluate', {
          expression: `(() => {
            document.querySelector('#tab-btn-controls').click();
          })()`
        });
        await new Promise(r => setTimeout(r, 600));

        const shot2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'settings_controls_screenshot.png'), Buffer.from(shot2.data, 'base64'));

        console.log('Screenshots captured successfully.');
        ws.close();
        proc.kill();
        process.exit(0);
      };
    } catch (e) {
      console.error(e);
      proc.kill();
      process.exit(1);
    }
  });
});
