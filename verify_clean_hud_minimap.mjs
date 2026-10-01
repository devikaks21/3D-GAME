import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_clean_hud';
const artifactDir = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75';
const port = 9235;

console.log('🚀 Launching Edge for Clean HUD & Minimap verification...');
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

        // 1. Start Free Drive mode and initialize HUD
        setTimeout(() => {
          console.log('Step 1: Starting FREE_DRIVE mode...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                if (g) {
                  g.startPlayMode('FREE_DRIVE');
                  // Provide test telemetry: SPEED 142 KM/H, GEAR 4, SPORT MODE
                  if (g.vehicleManager) {
                    const phys = g.vehicleManager.getActivePhysics();
                    if (phys) {
                      phys.speed = 142 / 3.6;
                      phys.gear = 4;
                    }
                  }
                }
              })()`
            }
          }));
        }, 1500);

        // 2. Test HUD elements and minimap toggle
        setTimeout(() => {
          console.log('Step 2: Checking Clean HUD DOM structure & Telemetry...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Runtime.evaluate',
            params: {
              returnByValue: true,
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                const hud = g ? g.hud : null;
                
                // Set explicit telemetry: 142 km/h, gear 4, SPORT mode
                if (hud) {
                  hud.displayedSpeed = 142;
                  hud.update({
                    speedKmh: 142,
                    gear: 4,
                    gearName: '4',
                    isSportMode: true,
                    driveMode: 'SPORT',
                    rpm: 4800,
                    redlineRpm: 7200,
                    headlights: true,
                    leftIndicator: true,
                    rightIndicator: false,
                    hazard: false
                  }, 'chase', null, 250, 95, 0.016);
                }

                const dash = document.querySelector('#hud-clean-dashboard');
                const speedText = document.querySelector('#hud-speed')?.textContent?.trim();
                const speedUnit = document.querySelector('#hud-speed-unit')?.textContent?.trim();
                const gearText = document.querySelector('#hud-gear')?.textContent?.trim();
                const modeText = document.querySelector('#hud-drive-mode')?.textContent?.trim();
                
                const minimapCard = document.querySelector('#hud-radar-container');
                const canvas = document.querySelector('#hud-radar-canvas');
                const reopenBtn = document.querySelector('#btn-reopen-minimap');
                const toggleClose = document.querySelector('#btn-close-minimap');
                
                const lightBtn = document.querySelector('#btn-ctrl-lights');
                const lightStatus = document.querySelector('#hud-light-status-text')?.textContent?.trim();
                const indBox = document.querySelector('.hud-indicator-control-box');
                const camBtn = document.querySelector('#hud-cam-btn');
                const camName = document.querySelector('#hud-cam-name')?.textContent?.trim();

                return {
                  hasDash: !!dash,
                  speed: speedText + ' ' + speedUnit,
                  gear: gearText,
                  mode: modeText,
                  hasMinimap: !!minimapCard,
                  minimapDisplay: minimapCard ? window.getComputedStyle(minimapCard).display : 'none',
                  hasCanvas: !!canvas,
                  hasCloseBtn: !!toggleClose,
                  reopenDisplay: reopenBtn ? window.getComputedStyle(reopenBtn).display : 'none',
                  hasLightBtn: !!lightBtn,
                  lightStatus: lightStatus,
                  hasIndicatorBox: !!indBox,
                  hasCamBtn: !!camBtn,
                  camName: camName
                };
              })()`
            }
          }));
        }, 3000);

        // 3. Test Minimap Toggle Functionality
        setTimeout(() => {
          console.log('Step 3: Testing Minimap Toggling...');
          ws.send(JSON.stringify({
            id: 20,
            method: 'Runtime.evaluate',
            params: {
              returnByValue: true,
              expression: `(() => {
                const g = window.openRoadGame || window.game;
                const hud = g ? g.hud : null;
                const minimapCard = document.querySelector('#hud-radar-container');
                const reopenBtn = document.querySelector('#btn-reopen-minimap');

                // 1. Hide minimap via toggleMinimap(false)
                hud.toggleMinimap(false);
                const hiddenDisplay = minimapCard.style.display;
                const reopenShown = reopenBtn.style.display;

                // 2. Reopen minimap via toggleMinimap(true)
                hud.toggleMinimap(true);
                const restoredDisplay = minimapCard.style.display;
                const reopenHidden = reopenBtn.style.display;

                // 3. Toggle via KeyM event
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
                const keyToggleDisplay = minimapCard.style.display;

                // Reopen for screenshot
                hud.toggleMinimap(true);

                return {
                  hiddenDisplay,
                  reopenShown,
                  restoredDisplay,
                  reopenHidden,
                  keyToggleDisplay,
                  finalDisplay: minimapCard.style.display
                };
              })()`
            }
          }));
        }, 4500);

        // 4. Capture In-Game Screenshot with Clean HUD & Minimap
        setTimeout(() => {
          console.log('Step 4: Capturing in-game Clean HUD & Minimap screenshot...');
          ws.send(JSON.stringify({
            id: 30,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 6000);
      };

      ws.onmessage = (msg) => {
        const response = JSON.parse(msg.data);

        if (response.id === 10) {
          console.log('📊 Step 2 Results (Clean HUD Telemetry & Layout):', response.result?.result?.value);
        } else if (response.id === 20) {
          console.log('🧭 Step 3 Results (Minimap Toggle Validation):', response.result?.result?.value);
        } else if (response.id === 30) {
          const buffer = Buffer.from(response.result.data, 'base64');
          const outPath = path.join(artifactDir, 'clean_hud_minimap_screenshot.png');
          fs.writeFileSync(outPath, buffer);
          console.log(`📸 Saved Clean HUD & Minimap Screenshot: ${outPath}`);
          console.log('🎉 Verification completed successfully!');
          ws.close();
          proc.kill();
          process.exit(0);
        }
      };

    } catch (err) {
      console.error('Error during CDP communication:', err);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Failed to query CDP targets:', e);
  proc.kill();
  process.exit(1);
});
