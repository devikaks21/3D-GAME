import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_reset_verification';

console.log('🚀 Launching Edge for Vehicle Reset feature verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9227',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9227/json', (res) => {
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

      ws.onopen = () => {
        console.log('CDP Connected. Enabling Runtime & Page domains...');
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        // 1. Click PLAY to start driving
        setTimeout(() => {
          console.log('Starting Free Drive...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const playBtn = document.getElementById('btn-menu-play');
                if (playBtn) playBtn.click();
              `
            }
          }));
        }, 1500);

        // 2. Drive off the road into sidewalk/curb and flip orientation
        setTimeout(() => {
          console.log('Driving vehicle off-road / into curb...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.actions.throttle = 1.0;
                  game.inputManager.actions.steer = 0.8;
                }
              `
            }
          }));
        }, 2200);

        // 3. Press R key to trigger Reset Vehicle
        setTimeout(() => {
          console.log('Simulating Pressing "R" Key for Vehicle Reset...');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (() => {
                  // Dispatch keydown event for KeyR
                  const event = new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true });
                  window.dispatchEvent(event);

                  const game = window.openRoadGame || window.game;
                  const phys = game?.vehicleManager?.getActivePhysics();
                  return {
                    speedKmh: phys?.speedKmh,
                    pitch: phys?.chassisPitch,
                    roll: phys?.chassisRoll,
                    isGrounded: phys?.isGrounded,
                    gear: phys?.currentGear,
                    pos: { x: phys?.position?.x, y: phys?.position?.y, z: phys?.position?.z },
                    promptText: document.getElementById('hud-prompt-text')?.textContent || document.querySelector('.hud-prompt-banner')?.textContent || ''
                  };
                })()
              `,
              returnByValue: true
            }
          }));
        }, 4000);

        // 4. Capture screenshot of vehicle restored to road
        setTimeout(() => {
          console.log('Capturing screenshot of vehicle reset to road...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 5000);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 5) {
          console.log('Post-Reset Telemetry on Pressing R:');
          console.log(JSON.stringify(res.result?.result?.value || res.result, null, 2));
        }

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'vehicle_reset_road_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Vehicle reset screenshot saved to: ${outPath}`);

          ws.close();
          proc.kill();
          process.exit(0);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        proc.kill();
        process.exit(1);
      };
    } catch (e) {
      console.error('Error parsing CDP target:', e);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP error connecting to CDP:', err);
  proc.kill();
  process.exit(1);
});
