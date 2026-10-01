import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_course_parking';
const artifactDir = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75';

console.log('🚀 Launching Edge for Course Test & Parking Test verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9232',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9232/json', (res) => {
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

        // 1. Start Course Test Mode
        setTimeout(() => {
          console.log('Step 1: Starting COURSE_TEST mode...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                if (g) {
                  g.startPlayMode('COURSE_TEST');
                }
              })()`
            }
          }));
        }, 1500);

        // 2. Set Course Test Telemetry & Inspect In-Game HUD
        setTimeout(() => {
          console.log('Step 2: Checking Course Test In-Game HUD...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                const ds = g?.missionManager?.drivingSchoolManager;
                if (ds) {
                  ds.courseTimer = 84; // 01:24
                  ds.courseCollisions = 0;
                  ds.courseMissedCheckpoints = 0;
                  ds.courseAccuracy = 96;
                  ds.currentCheckpointIndex = 4; // Stage 5: Narrow Road Corridor
                }
                const panel = document.getElementById('hud-mission-panel');
                return {
                  title: document.getElementById('hud-mission-title')?.textContent,
                  badge: document.getElementById('hud-mission-badge')?.textContent,
                  panelHtml: panel?.innerHTML
                };
              })()`,
              returnByValue: true
            }
          }));
        }, 2500);

        // 3. Capture Course Test Screenshot
        setTimeout(() => {
          console.log('Step 3: Capturing Course Test Screenshot...');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 3400);

        // 4. Start Parking Test Mode & Position Vehicle Inside Marked Bay
        setTimeout(() => {
          console.log('Step 4: Starting PARKING_TEST challenge mode and positioning vehicle inside marked bay...');
          ws.send(JSON.stringify({
            id: 6,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                if (g) {
                  g.startPlayMode('PARKING_TEST');
                  const phys = g.vehicleManager?.getActivePhysics();
                  if (phys) {
                    phys.resetPosition(-135, 0.45, 103, 0.05);
                  }
                  const ds = g.missionManager?.drivingSchoolManager;
                  if (ds) {
                    ds.parkingAccuracy = 86;
                    ds.isInsideParkingBay = true;
                  }
                }
              })()`
            }
          }));
        }, 4400);

        // 5. Inspect Parking Test In-Game HUD
        setTimeout(() => {
          console.log('Step 5: Inspecting Parking Test In-Game HUD...');
          ws.send(JSON.stringify({
            id: 7,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const panel = document.getElementById('hud-mission-panel');
                return {
                  title: document.getElementById('hud-mission-title')?.textContent,
                  badge: document.getElementById('hud-mission-badge')?.textContent,
                  instruction: panel?.querySelector('.pt-prompt-instruction')?.textContent,
                  accuracy: panel?.querySelector('.pt-acc-val')?.textContent,
                  type: panel?.querySelector('.pt-stall-badge')?.textContent,
                  panelHtml: panel?.innerHTML
                };
              })()`,
              returnByValue: true
            }
          }));
        }, 5300);

        // 6. Capture Parking Test Screenshot
        setTimeout(() => {
          console.log('Step 6: Capturing Parking Test Screenshot...');
          ws.send(JSON.stringify({
            id: 8,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 6100);

        // 7. Complete Verification and Exit
        setTimeout(() => {
          console.log('🎉 Verification complete, cleaning up...');
          ws.close();
          proc.kill();
          process.exit(0);
        }, 7200);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.error || msg.result?.exceptionDetails) {
          console.error(`Error on ID ${msg.id}:`, msg.error || msg.result?.exceptionDetails);
        }
        if (msg.id === 4) {
          console.log('Course Test Telemetry Status:', msg.result?.result?.value);
        } else if (msg.id === 5) {
          const buffer = Buffer.from(msg.result.data, 'base64');
          const outPath = path.join(artifactDir, 'course_test_hud_screenshot.png');
          fs.writeFileSync(outPath, buffer);
          console.log(`📸 Saved Course Test Screenshot: ${outPath}`);
        } else if (msg.id === 7) {
          console.log('Parking Test Telemetry Status:', msg.result?.result?.value);
        } else if (msg.id === 8) {
          const buffer = Buffer.from(msg.result.data, 'base64');
          const outPath = path.join(artifactDir, 'parking_test_hud_screenshot.png');
          fs.writeFileSync(outPath, buffer);
          console.log(`📸 Saved Parking Test Screenshot: ${outPath}`);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        proc.kill();
        process.exit(1);
      };
    } catch (e) {
      console.error('Error handling JSON response:', e);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('HTTP Request failed:', e);
  proc.kill();
  process.exit(1);
});
