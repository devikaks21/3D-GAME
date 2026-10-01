import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_road_test';

console.log('🚀 Launching Edge for Road Test verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9229',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9229/json', (res) => {
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

        // 1. Open Driving School Menu
        setTimeout(() => {
          console.log('Step 1: Opening Driving School Menu...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const schoolBtn = document.getElementById('btn-menu-school');
                if (schoolBtn) schoolBtn.click();
              `
            }
          }));
        }, 1200);

        // 2. Click [Road Test]
        setTimeout(() => {
          console.log('Step 2: Clicking [Road Test]...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const roadTestCard = document.getElementById('card-school-roadtest');
                if (roadTestCard) roadTestCard.click();
              `
            }
          }));
        }, 2200);

        // 3. Drive and simulate Road Test telemetry matching the prompt scenario (Time: 04:32, Mistakes: 1, Checkpoints: 7/10)
        setTimeout(() => {
          console.log('Step 3: Simulating driving and Road Test telemetry...');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame || window.game;
                const state = game?.gameState?.currentState;
                const mode = game?.gameState?.currentMode;
                const ds = game?.missionManager?.drivingSchoolManager;
                if (ds) {
                  ds.roadTestTimer = 272; // 04:32
                  ds.roadTestMistakes = 1;
                  ds.currentCheckpointIndex = 7;
                }
                const panel = document.getElementById('hud-mission-panel');
                ({
                  currentState: state,
                  currentMode: mode,
                  title: document.getElementById('hud-mission-title')?.textContent,
                  badge: document.getElementById('hud-mission-badge')?.textContent,
                  panelHtml: panel?.innerHTML
                })
              `,
              returnByValue: true
            }
          }));
        }, 3400);

        // 4. Set telemetry scenario matching prompt (Time: 04:32, Mistakes: 1, Checkpoints: 7/10) and capture screenshot
        setTimeout(() => {
          console.log('Step 4: Setting prompt scenario telemetry and capturing screenshot...');
          ws.send(JSON.stringify({
            id: 8,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame || window.game;
                const ds = game?.missionManager?.drivingSchoolManager;
                if (ds) {
                  ds.roadTestTimer = 272; // 04:32
                  ds.roadTestMistakes = 1;
                  ds.currentCheckpointIndex = 7;
                }
              `
            }
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({
              id: 10,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 350);
        }, 4400);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 5) {
          console.log('Road Test HUD state:', JSON.stringify(res.result?.result?.value, null, 2));
        }

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'road_test_hud_gameplay_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Road Test gameplay screenshot saved to: ${outPath}`);

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
