// Run with Electron, not Node. No kiosk, keyboard hooks, audio changes or real exam data.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
app.setPath('userData', path.join(os.tmpdir(), 'contx-sandbox-smoke-' + process.pid));
app.whenReady().then(async () => {
  try {
    const window = new BrowserWindow({ show: false, webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.mjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true,
    } });
    await window.loadURL('data:text/html,<title>Sandbox test</title>');
    const state = await window.webContents.executeJavaScript(`({
      requireType: typeof require,
      processType: typeof process,
      invokeType: typeof window.ipcRenderer?.invoke,
      exitType: typeof window.ipcRenderer?.exitApp,
      sendType: typeof window.ipcRenderer?.send,
      blocked: (() => { try { window.ipcRenderer.invoke('open-file', '/private'); return false; } catch { return true; } })()
    })`);
    assert.equal(state.requireType, 'undefined');
    assert.equal(state.processType, 'undefined');
    assert.equal(state.invokeType, 'function');
    assert.equal(state.exitType, 'function');
    assert.equal(state.sendType, 'undefined');
    assert.equal(state.blocked, true);
    assert.equal(window.webContents.getLastWebPreferences().sandbox, true);
    console.log('PASS: actual sandboxed Electron renderer loads preload and exposes only restricted APIs.');
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error);
    app.exit(1);
  }
});
