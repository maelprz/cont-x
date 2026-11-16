const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('Build this installer on Windows x64.');
}

const appRoot = join(__dirname, '..');
const electronVersion = require('electron/package.json').version;

console.log(`Building keyboard hook for Electron ${electronVersion}...`);

const result = spawnSync(
  process.execPath,
  [
    require.resolve('node-gyp/bin/node-gyp.js'),
    'rebuild',
    `--target=${electronVersion}`,
    '--arch=x64',
    '--dist-url=https://electronjs.org/headers',
  ],
  {
    cwd: join(appRoot, 'electron/native/keyboard-hook'),
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);