import { spawn } from 'child_process';
import fs from 'fs';

async function testMobileViewport() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--window-size=412,915',
    'http://localhost:3000'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const listRes = await fetch('http://127.0.0.1:9226/json/list');
  const tabs = await listRes.json();
  const page = tabs[0];
  const wsUrl = page.webSocketDebuggerUrl;

  const ws = new globalThis.WebSocket(wsUrl);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const data = JSON.parse(evt.data.toString());
      if (data.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => {
    if (ws.readyState === 1) r();
    else ws.addEventListener('open', r, { once: true });
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 2,
    mobile: true,
    hasTouch: true
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });

  await new Promise(r => setTimeout(r, 2000));

  const touchEval = await send('Runtime.evaluate', {
    expression: 'Boolean(document.querySelector("#mobile-controls-root") && document.querySelector("#mobile-controls-root").style.display !== "none")'
  });
  console.log('Mobile controls visible in landscape phone mode:', touchEval.result.value);

  // Take screenshot of landscape phone view
  const ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\DEVIKA\\.gemini\\antigravity-ide\\brain\\709039b5-b290-4c66-9c54-3cd02b281e75\\phone_gameplay_screenshot.png', Buffer.from(ss.data, 'base64'));
  console.log('Saved phone_gameplay_screenshot.png');

  ws.close();
  proc.kill();
}

testMobileViewport().catch(console.error);
