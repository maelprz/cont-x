const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(outputText, { exports, URL, require: (name) => mocks[name] ?? require(name) });
  return exports;
}

test('only the app document can navigate; popups, subframes, downloads and permissions are blocked', () => {
  for (const document of ['http://localhost:5173/', 'file:///C:/Contx/dist/index.html']) {
    const events = {};
    const sessionEvents = {};
    const contents = {
      on: (event, fn) => { events[event] = fn; },
      setWindowOpenHandler: (fn) => { contents.open = fn; },
      session: {
        on: (event, fn) => { sessionEvents[event] = fn; },
        setPermissionRequestHandler: (fn) => { contents.permission = fn; },
        setPermissionCheckHandler: (fn) => { contents.checkPermission = fn; },
      },
    };
    load('electron/editorSandbox.ts').installEditorSandbox({ webContents: contents }, document);
    assert.equal(contents.open().action, 'deny');
    for (const target of ['https://example.org', 'file:///C:/private.txt', 'javascript:alert(1)', document + '?other=1']) {
      let blocked = false;
      events['will-navigate']({ preventDefault() { blocked = true; } }, target);
      assert.ok(blocked, target);
    }
    events['will-navigate']({ preventDefault() { assert.fail('reload blocked'); } }, document);
    let blocked = false;
    events['will-frame-navigate']({ url: document, isMainFrame: false, preventDefault() { blocked = true; } });
    assert.ok(blocked);
    for (const handler of [events['will-attach-webview'], sessionEvents['will-download']]) {
      let prevented = false;
      handler({ preventDefault() { prevented = true; } });
      assert.ok(prevented);
    }
    assert.equal(contents.checkPermission(), false);
    contents.permission(null, 'filesystem', (allowed) => assert.equal(allowed, false));
  }
});

test('preload allows compilation but cannot invoke arbitrary IPC channels', () => {
  let api;
  const calls = [];
  load('electron/preload.ts', { electron: {
    contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
    ipcRenderer: { invoke: (...args) => { calls.push(args); return Promise.resolve(); } },
  } });
  api.invoke('run-test-cases', { code: 'int main() {}' });
  assert.equal(calls.length, 1);
  assert.throws(() => api.invoke('open-file', '/private'), /not allowed/);
  for (const method of ['on', 'off', 'send']) assert.equal(api[method], undefined);
});

test('compiler rejects untrusted frames and malformed payloads before executing anything', async () => {
  let handler;
  const frame = {};
  const compile = { compileSource() { assert.fail('compiler must not execute'); } };
  load('electron/ipc/compilerHandlers.ts', {
    electron: { ipcMain: { handle: (_channel, fn) => { handler = fn; } } },
    '../compiler/compilerService': compile,
  }).registerCompilerHandlers(() => ({ webContents: { mainFrame: frame } }));
  await assert.rejects(handler({ senderFrame: {} }, {}), /exam window/);
  for (const payload of [null, {}, { code: '', programType: 'shell', testCases: [] },
    { code: '', programType: 'cProgram', testCases: [{ id: 'a', input: '', expectedOutput: '', timeLimitMs: -1 }] }]) {
    await assert.rejects(handler({ senderFrame: frame }, payload), /Invalid compilation/);
  }
});
