import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_road_test_results';

console.log('🚀 Launching Edge for Road Test Result Verification...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9230',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-sync',
  '--window-size=1280,720',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

await new Promise(r => setTimeout(r, 2200));

http.get('http://127.0.0.1:9230/json', (res) => {
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

        // 1. Trigger Road Test PASSED dialog
        setTimeout(() => {
          console.log('Step 1: Triggering ROAD TEST COMPLETE (PASSED) Modal...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (() => {
                  const game = window.openRoadGame || window.game;
                  if (game && game.missionUI) {
                    game.missionUI.showResult(true, 'ROAD TEST COMPLETE', 'PASSED', 6000, {
                      isRoadTest: true,
                      timeFormatted: '04:32',
                      mistakes: 1,
                      totalCheckpoints: 10
                    });
                  }
                  const card = document.getElementById('rt-passed-card');
                  const title = card?.querySelector('.rt-res-title')?.textContent;
                  const status = card?.querySelector('.rt-res-status')?.textContent;
                  const time = document.getElementById('rt-res-time')?.textContent;
                  const mistakes = document.getElementById('rt-res-mistakes')?.textContent;
                  const cps = document.getElementById('rt-res-checkpoints')?.textContent;
                  const reward = document.getElementById('rt-res-reward')?.textContent;
                  const btn = document.getElementById('btn-rt-continue')?.textContent;
                  return { title, status, time, mistakes, cps, reward, btn };
                })()
              `,
              returnByValue: true
            }
          }));

          // Capture Passed Screenshot
          setTimeout(() => {
            console.log('Capturing Passed screenshot...');
            ws.send(JSON.stringify({
              id: 20,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 400);
        }, 1500);

        // 2. Trigger Road Test FAILED dialog
        setTimeout(() => {
          console.log('Step 2: Triggering TEST FAILED Modal...');
          ws.send(JSON.stringify({
            id: 30,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (() => {
                  const game = window.openRoadGame || window.game;
                  if (game && game.missionUI) {
                    game.missionUI.hideResult();
                    game.missionUI.showResult(false, 'TEST FAILED', 'Too many mistakes.', 0, {
                      isRoadTest: true,
                      failReason: 'Too many mistakes.'
                    });
                  }
                  const card = document.getElementById('rt-failed-card');
                  const title = card?.querySelector('.rt-res-title')?.textContent;
                  const heading = card?.querySelector('.rt-reason-heading')?.textContent;
                  const reason = document.getElementById('rt-res-reason')?.textContent;
                  const retryBtn = document.getElementById('btn-rt-retry')?.textContent;
                  const exitBtn = document.getElementById('btn-rt-exit')?.textContent;
                  return { title, heading, reason, retryBtn, exitBtn };
                })()
              `,
              returnByValue: true
            }
          }));

          // Capture Failed Screenshot
          setTimeout(() => {
            console.log('Capturing Failed screenshot...');
            ws.send(JSON.stringify({
              id: 40,
              method: 'Page.captureScreenshot',
              params: { format: 'png' }
            }));
          }, 400);
        }, 3200);
      };

      ws.onmessage = (msg) => {
        const res = JSON.parse(msg.data);

        if (res.id === 10) {
          console.log('Passed Screen Verified:', JSON.stringify(res.result?.result?.value, null, 2));
        }

        if (res.id === 20 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'road_test_passed_result_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Road Test PASSED screenshot saved to: ${outPath}`);
        }

        if (res.id === 30) {
          console.log('Failed Screen Verified:', JSON.stringify(res.result?.result?.value, null, 2));
        }

        if (res.id === 40 && res.result?.data) {
          const imgBuffer = Buffer.from(res.result.data, 'base64');
          const outPath = path.resolve('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75', 'road_test_failed_result_screenshot.png');
          fs.writeFileSync(outPath, imgBuffer);
          console.log(`📸 Road Test FAILED screenshot saved to: ${outPath}`);

          ws.close();
          proc.kill();
          console.log('🎉 Verification complete!');
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
