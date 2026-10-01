import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_driving_school_test';

console.log('🚀 Launching Edge for Driving School verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9228',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2000));

http.get('http://127.0.0.1:9228/json', (res) => {
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

        // 1. Click "DRIVING SCHOOL" in Main Menu
        setTimeout(() => {
          console.log('Step 1: Clicking DRIVING SCHOOL in Main Menu...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const schoolBtn = document.getElementById('btn-menu-school');
                if (schoolBtn) schoolBtn.click();
                const modal = document.getElementById('driving-school-menu-modal');
                ({
                  modalVisible: modal ? modal.style.display : 'none',
                  cards: Array.from(document.querySelectorAll('.school-card')).map(c => c.querySelector('.mode-title')?.textContent)
                })
              `,
              returnByValue: true
            }
          }));
        }, 1200);

        // 2. Capture screenshot of the Driving School Menu Modal
        setTimeout(() => {
          console.log('Step 2: Capturing screenshot of Driving School Menu...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 2200);

        // 3. Click [Practice] in the Driving School Menu (after menu capture)
        setTimeout(() => {
          console.log('Step 3: Clicking [Practice] in Driving School Menu...');
          ws.send(JSON.stringify({
            id: 20,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const practiceCard = document.getElementById('card-school-practice');
                if (practiceCard) practiceCard.click();

                const tutorOverlay = document.getElementById('practice-tutor-overlay');
                const skillTabs = Array.from(document.querySelectorAll('.skill-tab')).map(t => t.querySelector('.skill-tab-name')?.textContent);
                ({
                  tutorVisible: tutorOverlay ? tutorOverlay.style.display : 'none',
                  activeSkill: document.getElementById('tutor-active-skill')?.textContent,
                  skillTabs: skillTabs
                })
              `,
              returnByValue: true
            }
          }));
        }, 3400);

        // 4. Capture screenshot of Practice Mode gameplay with Tutor HUD
        setTimeout(() => {
          console.log('Step 4: Capturing screenshot of Practice Mode in-game...');
          ws.send(JSON.stringify({
            id: 30,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 5000);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 3) {
          console.log('Driving School Menu Response:', JSON.stringify(res.result?.result?.value, null, 2));
        }

        if (res.id === 10 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'driving_school_menu_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Driving School Menu screenshot saved to: ${outPath}`);
        }

        if (res.id === 20) {
          console.log('Practice Mode Response:', JSON.stringify(res.result?.result?.value, null, 2));
        }

        if (res.id === 30 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'practice_mode_gameplay_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Practice Mode Gameplay screenshot saved to: ${outPath}`);

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
