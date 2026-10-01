import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_traffic_debug';

console.log('🚀 Launching Edge for Traffic System & Settings verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9223/json', (res) => {
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

        // 1. Open Settings and check Traffic Density controls
        setTimeout(() => {
          console.log('Testing Settings UI Traffic Density segmented control...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                // Open Settings
                const settingsBtn = document.getElementById('btn-menu-settings');
                if (settingsBtn) settingsBtn.click();

                // Switch to Simulation Tab
                const simTab = document.getElementById('tab-btn-simulation');
                if (simTab) simTab.click();

                const densityControl = document.getElementById('ctrl-trafficdensity');
                const buttons = Array.from(densityControl?.querySelectorAll('.seg-btn') || []).map(b => ({
                  val: b.dataset.val,
                  text: b.textContent.trim(),
                  isActive: b.classList.contains('active')
                }));

                // Click HIGH density
                const highBtn = densityControl?.querySelector('[data-val="high"]');
                if (highBtn) highBtn.click();

                const game = window.openRoadGame;
                ({
                  settingsOpened: document.getElementById('settings-root')?.style.display !== 'none',
                  buttonsFound: buttons,
                  newDensityInSettings: game?.gameState?.settings?.trafficDensity,
                  trafficManagerDensity: game?.trafficManager?.getDensity(),
                  trafficVehiclesCount: game?.trafficManager?.cars?.length
                })
              `,
              returnByValue: true
            }
          }));
        }, 1500);

        // 2. Return to menu and start PLAYING to inspect live traffic in 3D world
        setTimeout(() => {
          console.log('Returning to main menu and launching gameplay...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const backBtn = document.getElementById('settings-back-btn');
                if (backBtn) backBtn.click();

                const playBtn = document.getElementById('btn-menu-play');
                if (playBtn) playBtn.click();

                const game = window.openRoadGame;
                ({
                  gameState: game?.gameState?.currentState,
                  trafficCarsCount: game?.trafficManager?.cars?.length,
                  trafficPositionsSample: game?.trafficManager?.getTrafficPositions()?.slice(0, 3)
                })
              `,
              returnByValue: true
            }
          }));
        }, 3000);

        // 3. Take screenshot of live driving with traffic
        setTimeout(() => {
          console.log('Capturing screenshot of live driving with traffic...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 5500);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 3) {
          console.log('Settings Traffic Density Evaluation Result:');
          console.log(JSON.stringify(res.result?.value, null, 2));
        }

        if (res.id === 4) {
          console.log('Live Gameplay Traffic State Result:');
          console.log(JSON.stringify(res.result?.value, null, 2));
        }

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'traffic_gameplay_screenshot.png');
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
