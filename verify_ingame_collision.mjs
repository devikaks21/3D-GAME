import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_collision_test';

console.log('🚀 Launching Edge for in-game collision and reset verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9226/json', (res) => {
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

        // 2. Steer car towards building / sidewalk tree
        setTimeout(() => {
          console.log('Driving car into sidewalk tree / obstacle...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.actions.throttle = 1.0;
                  game.inputManager.actions.steer = 0.55; // steer toward sidewalk obstacle
                }
              `
            }
          }));
        }, 2200);

        // 3. Inspect collision telemetry after impact
        setTimeout(() => {
          console.log('Evaluating collision response & stability...');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                const phys = game?.vehicleManager?.getActivePhysics();
                ({
                  speedKmh: phys?.speedKmh,
                  altitude: phys?.position?.y,
                  isGrounded: phys?.isGrounded,
                  lastCollision: phys?.lastCollision,
                  pos: { x: phys?.position?.x, z: phys?.position?.z }
                })
              `,
              returnByValue: true
            }
          }));
        }, 4000);

        // 4. Trigger Reset option
        setTimeout(() => {
          console.log('Triggering Vehicle Reset option (Key R / Action resetVehicle)...');
          ws.send(JSON.stringify({
            id: 6,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('resetVehicle');
                }
                const phys = game?.vehicleManager?.getActivePhysics();
                ({
                  speedAfterReset: phys?.velocity?.length(),
                  pitchAfterReset: phys?.chassisPitch,
                  rollAfterReset: phys?.chassisRoll,
                  posAfterReset: { x: phys?.position?.x, y: phys?.position?.y, z: phys?.position?.z }
                })
              `,
              returnByValue: true
            }
          }));
        }, 4500);

        // 5. Capture screenshot of vehicle reset
        setTimeout(() => {
          console.log('Capturing post-reset driving screenshot...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 5500);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 5) {
          console.log('Collision Telemetry:');
          console.log(JSON.stringify(res.result?.value, null, 2));
        }

        if (res.id === 6) {
          console.log('Reset Telemetry:');
          console.log(JSON.stringify(res.result?.value, null, 2));
        }

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'collision_reset_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Screenshot successfully saved to: ${outPath}`);

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
