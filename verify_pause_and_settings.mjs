import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_pause_settings';
const artifactDir = 'C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75';
const port = 9237;

console.log('🚀 Launching Edge for Pause Menu & Settings verification...');
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

await new Promise(r => setTimeout(r, 2500));

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

      let msgId = 1;
      const send = (method, params = {}) => {
        return new Promise((resolve, reject) => {
          const id = msgId++;
          const handler = (evt) => {
            const res = JSON.parse(evt.data);
            if (res.id === id) {
              ws.removeEventListener('message', handler);
              if (res.error) reject(res.error);
              else resolve(res.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id, method, params }));
        });
      };

      const evalScript = async (expression) => {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true });
        return res.result?.value;
      };

      ws.onopen = async () => {
        console.log('CDP Connected.');
        await send('Runtime.enable');
        await send('Page.enable');

        await new Promise(r => setTimeout(r, 1500));

        // 1. Launch Game into PLAYING mode
        console.log('\n--- TEST 1: Launch Free Drive ---');
        const launchRes = await evalScript(`(() => {
          const g = window.openRoadGame || window.game;
          if (!g) return { ok: false, error: 'game not found' };
          g.startPlayMode('FREE_DRIVE');
          return { ok: true, state: g.gameState.currentState };
        })()`);
        console.log('Launch status:', launchRes);

        await new Promise(r => setTimeout(r, 1000));

        // 2. Press 'KeyP' to pause
        console.log('\n--- TEST 2: Press P to Pause ---');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
        await new Promise(r => setTimeout(r, 400));

        const pauseCheck1 = await evalScript(`(() => {
          const g = window.openRoadGame || window.game;
          const pauseModal = document.querySelector('#modal-pause');
          const title = pauseModal?.querySelector('.pause-title')?.textContent?.trim();
          const buttons = Array.from(pauseModal?.querySelectorAll('.pause-action-btn') || []).map(b => b.querySelector('.btn-text')?.textContent?.trim() || b.textContent.trim());
          return {
            state: g.gameState.currentState,
            modalVisible: pauseModal && pauseModal.style.display !== 'none',
            title,
            buttons
          };
        })()`);
        console.log('Pause Check (KeyP):', pauseCheck1);

        if (pauseCheck1.state !== 'PAUSED' || !pauseCheck1.modalVisible) {
          throw new Error('Game did not enter PAUSED state on KeyP');
        }

        // Capture screenshot of Pause Menu
        console.log('📸 Capturing Pause Menu screenshot...');
        const pauseShot = await send('Page.captureScreenshot', { format: 'png' });
        const pauseShotPath = path.join(artifactDir, 'pause_menu_screenshot.png');
        fs.writeFileSync(pauseShotPath, Buffer.from(pauseShot.data, 'base64'));
        console.log('Saved Pause Menu screenshot to:', pauseShotPath);

        // 3. Click RESUME button
        console.log('\n--- TEST 3: Click RESUME button ---');
        const resumeRes = await evalScript(`(() => {
          const resumeBtn = document.querySelector('#btn-pause-resume');
          if (resumeBtn) resumeBtn.click();
          const g = window.openRoadGame || window.game;
          return {
            state: g.gameState.currentState,
            modalDisplay: document.querySelector('#modal-pause')?.style.display
          };
        })()`);
        console.log('Resume button check:', resumeRes);
        if (resumeRes.state !== 'PLAYING') throw new Error('Game did not resume on RESUME button click');

        await new Promise(r => setTimeout(r, 400));

        // 4. Press Escape to pause, and Escape to resume
        console.log('\n--- TEST 4: Press ESC to pause and ESC to resume ---');
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Escape', key: 'Escape' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' });
        await new Promise(r => setTimeout(r, 400));

        let escCheck = await evalScript(`window.game.gameState.currentState`);
        console.log('State after first ESC:', escCheck);
        if (escCheck !== 'PAUSED') throw new Error('First ESC did not pause game');

        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Escape', key: 'Escape' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' });
        await new Promise(r => setTimeout(r, 400));

        escCheck = await evalScript(`window.game.gameState.currentState`);
        console.log('State after second ESC:', escCheck);
        if (escCheck !== 'PLAYING') throw new Error('Second ESC did not resume game');

        // 5. Press KeyP to pause, and KeyP to resume
        console.log('\n--- TEST 5: Press P to toggle pause and resume ---');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
        await new Promise(r => setTimeout(r, 400));
        let pCheck = await evalScript(`window.game.gameState.currentState`);
        console.log('State after P pause:', pCheck);
        if (pCheck !== 'PAUSED') throw new Error('P did not pause game');

        await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
        await new Promise(r => setTimeout(r, 400));
        pCheck = await evalScript(`window.game.gameState.currentState`);
        console.log('State after P resume:', pCheck);
        if (pCheck !== 'PLAYING') throw new Error('P did not resume game');

        // 6. Pause and click CONTROLS
        console.log('\n--- TEST 6: Click CONTROLS from Pause Menu ---');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyP', key: 'p' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyP', key: 'p' });
        await new Promise(r => setTimeout(r, 400));

        const openControlsRes = await evalScript(`(() => {
          const ctrlBtn = document.querySelector('#btn-pause-controls');
          ctrlBtn.click();
          const settingsRoot = document.querySelector('#settings-root');
          const activeTabBtn = document.querySelector('.settings-tab-btn.active')?.dataset.tab;
          const activePage = document.querySelector('.settings-tab-page.active')?.id;
          const rowsCount = document.querySelectorAll('.matrix-row').length;
          return {
            state: window.game.gameState.currentState,
            settingsVisible: settingsRoot && settingsRoot.style.display !== 'none',
            activeTabBtn,
            activePage,
            rowsCount
          };
        })()`);
        console.log('Controls screen check:', openControlsRes);
        if (openControlsRes.activeTabBtn !== 'controls' || openControlsRes.rowsCount < 5) {
          throw new Error('Controls tab not displayed properly from Pause Menu');
        }

        // Test key rebinding: Rebind lights action
        console.log('\n--- TEST 7: Rebind a key and reset to defaults ---');
        const startRebind = await evalScript(`(() => {
          const lightsRow = document.querySelector('.matrix-row[data-action="lights"]');
          const primaryBtn = lightsRow.querySelector('.key-bind-btn[data-slot="0"]');
          primaryBtn.click();
          return {
            isRebinding: primaryBtn.classList.contains('is-rebinding'),
            btnText: primaryBtn.querySelector('.btn-key-code')?.textContent
          };
        })()`);
        console.log('Started rebinding:', startRebind);

        // Press 'KeyJ' to rebind lights to J
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyJ', key: 'j' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyJ', key: 'j' });
        await new Promise(r => setTimeout(r, 400));

        const rebindVerification = await evalScript(`(() => {
          const g = window.game;
          const binding = g.inputManager.bindings.lights.keys;
          const lightsRow = document.querySelector('.matrix-row[data-action="lights"]');
          const primaryCode = lightsRow.querySelector('.key-bind-btn[data-slot="0"] .btn-key-code')?.textContent;
          return {
            keysInInputManager: binding,
            displayedCode: primaryCode
          };
        })()`);
        console.log('Rebind verification:', rebindVerification);
        if (rebindVerification.displayedCode !== 'J') {
          throw new Error('Key was not rebound to J');
        }

        // Click Reset Defaults button
        const resetRes = await evalScript(`(() => {
          const resetBtn = document.querySelector('#btn-reset-controls');
          resetBtn.click();
          const g = window.game;
          const binding = g.inputManager.bindings.lights.keys;
          const lightsRow = document.querySelector('.matrix-row[data-action="lights"]');
          const primaryCode = lightsRow.querySelector('.key-bind-btn[data-slot="0"] .btn-key-code')?.textContent;
          return {
            keysInInputManager: binding,
            displayedCode: primaryCode
          };
        })()`);
        console.log('Reset controls verification:', resetRes);
        if (resetRes.displayedCode !== 'L') {
          throw new Error('Reset controls failed to restore L');
        }

        // Return from Settings back to Pause
        console.log('\n--- TEST 8: Return back to Pause Menu ---');
        const returnRes = await evalScript(`(() => {
          const backBtn = document.querySelector('#settings-back-btn');
          backBtn.click();
          return {
            state: window.game.gameState.currentState,
            pauseModalVisible: document.querySelector('#modal-pause')?.style.display !== 'none',
            settingsVisible: document.querySelector('#settings-root')?.style.display !== 'none'
          };
        })()`);
        console.log('Return to Pause check:', returnRes);
        if (returnRes.state !== 'PAUSED' || !returnRes.pauseModalVisible) {
          throw new Error('Return button did not return to PAUSED state');
        }

        // 9. Click SETTINGS from Pause Menu
        console.log('\n--- TEST 9: Click SETTINGS from Pause Menu & test Graphics/Audio/Gameplay ---');
        await evalScript(`document.querySelector('#btn-pause-settings').click();`);
        await new Promise(r => setTimeout(r, 400));

        const settingsTabsCheck = await evalScript(`(() => {
          const tabs = Array.from(document.querySelectorAll('.settings-tab-btn')).map(t => t.dataset.tab);
          const activeTab = document.querySelector('.settings-tab-btn.active')?.dataset.tab;
          return { tabs, activeTab };
        })()`);
        console.log('Settings tabs check:', settingsTabsCheck);

        // Test Graphics Settings: change Quality, Shadows, Reflections, View distance, Anti-aliasing
        console.log('Changing Graphics options...');
        const graphicsTestRes = await evalScript(`(() => {
          // Select ULTRA quality
          document.querySelector('#ctrl-graphics-quality button[data-val="ultra"]').click();
          // Select HIGH shadows
          document.querySelector('#ctrl-graphics-shadows button[data-val="high"]').click();
          // Select SIMPLE reflections
          document.querySelector('#ctrl-graphics-reflections button[data-val="simple"]').click();
          // Select 2500m view distance
          document.querySelector('#ctrl-graphics-viewdist button[data-val="2500m"]').click();
          // Select FXAA
          document.querySelector('#ctrl-graphics-antialiasing button[data-val="fxaa"]').click();

          const g = window.game;
          return {
            settings: { ...g.gameState.settings },
            camFar: g.camera.far,
            shadowMapSize: g.sunLight.shadow.mapSize.width
          };
        })()`);
        console.log('Graphics test result:', graphicsTestRes);
        if (graphicsTestRes.camFar !== 2500 || graphicsTestRes.shadowMapSize !== 4096) {
          throw new Error('Graphics settings were not applied properly');
        }

        // Switch to Audio Tab and test volume sliders
        console.log('\nSwitching to Audio tab...');
        await evalScript(`document.querySelector('#tab-btn-audio').click();`);
        await new Promise(r => setTimeout(r, 300));

        const audioTestRes = await evalScript(`(() => {
          const master = document.querySelector('#slider-audio-master');
          const engine = document.querySelector('#slider-audio-engine');
          const env = document.querySelector('#slider-audio-environment');
          const ui = document.querySelector('#slider-audio-ui');

          master.value = 95; master.dispatchEvent(new Event('input'));
          engine.value = 85; engine.dispatchEvent(new Event('input'));
          env.value = 70; env.dispatchEvent(new Event('input'));
          ui.value = 90; ui.dispatchEvent(new Event('input'));

          const g = window.game;
          return {
            masterVal: document.querySelector('#val-audio-master').textContent,
            engineVal: document.querySelector('#val-audio-engine').textContent,
            envVal: document.querySelector('#val-audio-environment').textContent,
            uiVal: document.querySelector('#val-audio-ui').textContent,
            savedMaster: g.gameState.settings.audioMasterVolume,
            savedEngine: g.gameState.settings.audioEngineVolume
          };
        })()`);
        console.log('Audio sliders test result:', audioTestRes);

        // Switch to Gameplay Tab and test Traffic density, Driving assistance, Automatic/manual gear
        console.log('\nSwitching to Gameplay tab...');
        await evalScript(`document.querySelector('#tab-btn-gameplay').click();`);
        await new Promise(r => setTimeout(r, 300));

        const gameplayTestRes = await evalScript(`(() => {
          // Traffic density -> HIGH
          document.querySelector('#ctrl-trafficdensity button[data-val="high"]').click();
          // Driving assistance -> FULL
          document.querySelector('#ctrl-driving-assist button[data-val="full"]').click();
          // Transmission -> MANUAL
          document.querySelector('#ctrl-transmission button[data-val="manual"]').click();

          const g = window.game;
          const phys = g.vehicleManager?.getActivePhysics();
          return {
            trafficDensity: g.gameState.settings.trafficDensity,
            drivingAssistance: g.gameState.settings.drivingAssistance,
            transmission: g.gameState.settings.transmission,
            physAssistance: phys?.drivingAssistance,
            physTransmission: phys?.transmissionMode
          };
        })()`);
        console.log('Gameplay options test result:', gameplayTestRes);
        if (gameplayTestRes.physAssistance !== 'full' || gameplayTestRes.physTransmission !== 'manual') {
          throw new Error('Gameplay driving assist or transmission was not applied to physics');
        }

        // Capture screenshot of Settings UI
        console.log('📸 Capturing Settings UI screenshot...');
        const settingsShot = await send('Page.captureScreenshot', { format: 'png' });
        const settingsShotPath = path.join(artifactDir, 'settings_screen_screenshot.png');
        fs.writeFileSync(settingsShotPath, Buffer.from(settingsShot.data, 'base64'));
        console.log('Saved Settings screenshot to:', settingsShotPath);

        // 10. Press ESC while in Settings to return to Pause Menu
        console.log('\n--- TEST 10: Press ESC to exit Settings back to Pause Menu ---');
        await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Escape', key: 'Escape' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' });
        await new Promise(r => setTimeout(r, 500));

        const escFromSettingsCheck = await evalScript(`(() => {
          return {
            state: window.game.gameState.currentState,
            pauseModalVisible: document.querySelector('#modal-pause')?.style.display !== 'none'
          };
        })()`);
        console.log('ESC from settings check:', escFromSettingsCheck);
        if (escFromSettingsCheck.state !== 'PAUSED') {
          throw new Error('ESC from settings did not return to PAUSED state');
        }

        // 11. Click MAIN MENU from Pause Menu
        console.log('\n--- TEST 11: Click MAIN MENU from Pause Menu ---');
        const mainMenuRes = await evalScript(`(() => {
          document.querySelector('#btn-pause-mainmenu').click();
          return {
            state: window.game.gameState.currentState,
            mainMenuVisible: document.querySelector('.main-menu-overlay')?.style.display !== 'none'
          };
        })()`);
        console.log('Main menu check:', mainMenuRes);
        if (mainMenuRes.state !== 'MENU') {
          throw new Error('Did not return to MENU state');
        }

        console.log('\n🎉 ALL 11 PAUSE MENU AND SETTINGS TESTS PASSED SUCCESSFULLY! 🎉\n');

        ws.close();
        proc.kill();
        process.exit(0);
      };
    } catch (err) {
      console.error('Fatal test error:', err);
      proc.kill();
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Failed to reach CDP port:', err.message);
  proc.kill();
  process.exit(1);
});
