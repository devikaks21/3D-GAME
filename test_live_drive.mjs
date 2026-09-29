import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_debug';

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
    const targets = JSON.parse(data);
    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

      // Click Play
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: { expression: "document.getElementById('btn-menu-play')?.click();" }
        }));
      }, 1000);

      // Accelerate
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              window.openRoadGame.input.keys['KeyW'] = true;
              'Accelerating...'
            `
          }
        }));
      }, 1500);

      // Check speed after 1 second of accelerating
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 5,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              const speedText = document.getElementById('hud-speed-value')?.textContent;
              const gearText = document.getElementById('hud-gear-value')?.textContent;
              const modeText = document.getElementById('hud-mode-value')?.textContent;
              const carPos = window.openRoadGame.vehicleManager.getActiveVehicle().chassis.position;
              ({
                speedText,
                gearText,
                modeText,
                zPos: carPos.z
              })
            `,
            returnByValue: true
          }
        }));
      }, 2800);

      // Release W and test Sport mode toggle
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 6,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              window.openRoadGame.input.keys['KeyW'] = false;
              document.getElementById('hud-drive-mode')?.click();
              document.getElementById('hud-mode-value')?.textContent
            `,
            returnByValue: true
          }
        }));
      }, 3200);

      // Capture screenshot while driving
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 3600);

      setTimeout(() => {
        ws.close();
        proc.kill();
        process.exit(0);
      }, 4500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 5) {
        console.log('[ACCELERATION CHECK RESULT]:', msg.result?.result?.value);
      } else if (msg.id === 6) {
        console.log('[SPORT MODE TOGGLE RESULT]:', msg.result?.result?.value);
      } else if (msg.id === 10) {
        const base64 = msg.result?.data;
        if (base64) {
          const outPath = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75\\game_driving_screenshot.png';
          fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
          console.log('Saved driving screenshot to:', outPath);
        }
      }
    };
  });
});
