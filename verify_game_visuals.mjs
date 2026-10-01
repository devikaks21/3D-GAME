import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_debug';

console.log('Starting Edge with remote debugging...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.type === 'page');
      if (!pageTarget) {
        console.error('No page target found');
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      ws.onopen = () => {
        console.log('CDP Connected. Enabling domains...');
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        // Wait 1.5s for initial render, then click PLAY
        setTimeout(() => {
          console.log('Clicking PLAY button to start driving...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const playBtn = document.getElementById('btn-menu-play');
                if (playBtn) playBtn.click();
                ({
                  hasGame: !!window.openRoadGame,
                  state: window.openRoadGame?.gameState?.currentState,
                  hudDisplay: document.getElementById('hud-container')?.style.display,
                  dashboardSpeed: document.getElementById('hud-speed-value')?.textContent,
                  dashboardGear: document.getElementById('hud-gear-value')?.textContent,
                  dashboardMode: document.getElementById('hud-mode-value')?.textContent
                })
              `,
              returnByValue: true
            }
          }));
        }, 1500);

        // After 3.5s, capture a screenshot of the running game
        setTimeout(() => {
          console.log('Capturing screenshot of running game...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 3500);

        // Terminate after 5.5s
        setTimeout(() => {
          ws.close();
          proc.kill();
          process.exit(0);
        }, 5500);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        } else if (msg.id === 3) {
          console.log('[GAME STATE CHECK]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 10) {
          const base64 = msg.result?.data;
          if (base64) {
            const outPath = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75\\game_running_screenshot.png';
            fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
            console.log('Saved screenshot successfully to:', outPath);
          }
        }
      };

      ws.onerror = (err) => console.error('WS Error:', err);
    } catch (e) {
      console.error('Parse error:', e);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP error:', err.message);
});
