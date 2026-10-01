import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_settings_panel';

console.log('🚀 Launching Edge for Settings Panel verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9224/json', (res) => {
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

        setTimeout(() => {
          console.log('Navigating to Settings -> Simulation & Audio and scrolling to Traffic Density...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const settingsBtn = document.getElementById('btn-menu-settings');
                if (settingsBtn) settingsBtn.click();

                const simTab = document.getElementById('tab-btn-simulation');
                if (simTab) simTab.click();

                const pageSim = document.getElementById('page-simulation');
                if (pageSim) pageSim.scrollTop = 120;

                const densityControl = document.getElementById('ctrl-trafficdensity');
                const highBtn = densityControl?.querySelector('[data-val="high"]');
                if (highBtn) highBtn.click();
              `
            }
          }));
        }, 1500);

        setTimeout(() => {
          console.log('Capturing screenshot of Settings UI showing Traffic Density...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 2500);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'settings_traffic_density_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Settings screenshot saved to: ${outPath}`);

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
