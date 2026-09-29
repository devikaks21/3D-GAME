import { spawn } from 'child_process';
import http from 'http';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'C:\\Users\\DEVIKA\\AppData\\Local\\Temp\\edge_cdp_debug';

console.log('Starting Edge with remote debugging...');
const proc = spawn(edgePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  'http://localhost:3000'
], { stdio: 'ignore' });

// Wait 2 seconds for Edge to start
await new Promise(r => setTimeout(r, 2000));

// Query CDP endpoint
http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const targets = JSON.parse(data);
      console.log('Targets found:', targets.length);
      const pageTarget = targets.find(t => t.type === 'page');
      if (!pageTarget) {
        console.error('No page target found');
        proc.kill();
        process.exit(1);
      }

      console.log('Connecting to WebSocket:', pageTarget.webSocketDebuggerUrl);
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

      ws.onopen = () => {
        console.log('Connected to CDP! Enabling Console, Runtime, and Page...');
        ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

        // Evaluate location and check for errors
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: { expression: 'document.title + " | " + document.body.innerHTML.substring(0, 300)' }
          }));
        }, 1000);

        // Click PLAY button to see what happens
        setTimeout(() => {
          console.log('\n--- Simulating click on #btn-menu-play ---');
          ws.send(JSON.stringify({
            id: 5,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                const playBtn = document.getElementById('btn-menu-play');
                console.log('playBtn exists:', !!playBtn);
                if (playBtn) {
                  playBtn.click();
                  console.log('playBtn clicked!');
                  console.log('openRoadGame state:', window.openRoadGame ? window.openRoadGame.gameState.currentState : 'no game');
                }
              `
            }
          }));
        }, 2000);

        // Close after 4 seconds
        setTimeout(() => {
          ws.close();
          proc.kill();
          process.exit(0);
        }, 4000);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        } else if (msg.id === 4) {
          console.log('[DOM CHECK]:', msg.result?.result?.value);
        } else if (msg.id === 5) {
          console.log('[CLICK EVAL RESULT]:', msg.result?.result?.value);
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
  proc.kill();
  process.exit(1);
});
