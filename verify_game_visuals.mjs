import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_debug';

console.log('Starting Edge with remote debugging...');
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
    try {
      const targets = JSON.parse(data);
      const pageTarget = targets.find(t => t.type === 'page');
      if (!pageTarget) {
        console.error('No page target found');
        proc.kill();
        process.exit(1);
      }

      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      ws.onopen = () => {
        console.log('CDP Connected. Enabling domains...');
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

        // Wait 2.0s for initial render, then click PLAY
        setTimeout(() => {
          console.log('Clicking PLAY button to start driving...');
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const playBtn = document.getElementById('btn-menu-play');
                if (playBtn) playBtn.click();
                ({
                  hasGame: !!window.openRoadGame,
                  state: window.openRoadGame?.gameState?.currentState
                })
              `,
              returnByValue: true
            }
          }));
        }, 2000);

        // At 3.8s, test Left Indicator key [KeyI]
        setTimeout(() => {
          console.log('Triggering Left Indicator [KeyI] in live game...');
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('toggleLeftIndicator');
                }
                const veh = game?.vehicleManager?.getActiveVehicle();
                ({
                  leftIndicatorOn: veh?.leftIndicatorOn,
                  rightIndicatorOn: veh?.rightIndicatorOn,
                  hazardOn: veh?.hazardOn,
                  hudLeftBlink: document.getElementById('hud-ind-left')?.classList.contains('active-blink')
                })
              `,
              returnByValue: true
            }
          }));
        }, 3800);

        // At 4.8s, test Right Indicator key [KeyK]
        setTimeout(() => {
          console.log('Triggering Right Indicator [KeyK] in live game...');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('toggleRightIndicator');
                }
                const veh = game?.vehicleManager?.getActiveVehicle();
                ({
                  leftIndicatorOn: veh?.leftIndicatorOn,
                  rightIndicatorOn: veh?.rightIndicatorOn,
                  hazardOn: veh?.hazardOn,
                  hudRightBlink: document.getElementById('hud-ind-right')?.classList.contains('active-blink')
                })
              `,
              returnByValue: true
            }
          }));
        }, 4800);

        // At 5.8s, test Hazard key [KeyH]
        setTimeout(() => {
          console.log('Triggering Hazard [KeyH] in live game...');
          ws.send(JSON.stringify({
            id: 6,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('toggleHazard');
                }
                const veh = game?.vehicleManager?.getActiveVehicle();
                ({
                  leftIndicatorOn: veh?.leftIndicatorOn,
                  hazardOn: veh?.hazardOn,
                  hudHazardBlink: document.getElementById('hud-hazard-icon')?.classList.contains('active-blink')
                })
              `,
              returnByValue: true
            }
          }));
        }, 5800);

        // At 6.8s, test Indicators OFF [KeyJ]
        setTimeout(() => {
          console.log('Triggering Indicators OFF [KeyJ] in live game...');
          ws.send(JSON.stringify({
            id: 7,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('indicatorsOff');
                }
                const veh = game?.vehicleManager?.getActiveVehicle();
                ({
                  leftIndicatorOn: veh?.leftIndicatorOn,
                  rightIndicatorOn: veh?.rightIndicatorOn,
                  hazardOn: veh?.hazardOn,
                  hudOffDim: document.getElementById('hud-ind-off')?.classList.contains('active-dim')
                })
              `,
              returnByValue: true
            }
          }));
        }, 6800);

        // At 7.6s, activate Left Indicator again for visual screenshot display
        setTimeout(() => {
          console.log('Activating Left Indicator for visual screenshot verification...');
          ws.send(JSON.stringify({
            id: 8,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const game = window.openRoadGame;
                if (game && game.inputManager) {
                  game.inputManager.triggerAction('toggleLeftIndicator');
                }
                true
              `,
              returnByValue: true
            }
          }));
        }, 7600);

        // After 8.5s, capture screenshot of running game with dashboard indicator active
        setTimeout(() => {
          console.log('Capturing screenshot of running game...');
          ws.send(JSON.stringify({
            id: 10,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
          }));
        }, 8500);

        // Terminate after 10.5s
        setTimeout(() => {
          ws.close();
          proc.kill();
          process.exit(0);
        }, 10500);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        } else if (msg.id === 3) {
          console.log('[GAME PLAY LAUNCHED]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 4) {
          console.log('[LEFT INDICATOR TEST]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 5) {
          console.log('[RIGHT INDICATOR TEST]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 6) {
          console.log('[HAZARD TEST]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 7) {
          console.log('[INDICATORS OFF TEST]:', JSON.stringify(msg.result?.result?.value, null, 2));
        } else if (msg.id === 10) {
          const base64 = msg.result?.data;
          if (base64) {
            const outPath = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75\\game_running_screenshot.png';
            fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
            console.log('Saved screenshot successfully to:', outPath);
          }
        }
      };

      ws.onerror = (err) => console.error('WS Error:', err);
    } catch (e) {
      console.error('Parse error:', e);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP error:', err.message);
});
