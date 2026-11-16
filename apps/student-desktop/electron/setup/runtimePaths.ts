import { join } from 'node:path';

// Resolve resources differently during development and after installation.
export function getRuntimePaths(
  isPackaged: boolean,
  resourcesPath: string,
  appRoot: string,
) {
  const mingw = isPackaged
    ? join(resourcesPath, 'mingw')
    : join(appRoot, 'electron', 'native', 'mingw');

  return {
    gcc: join(mingw, 'bin', 'gcc.exe'),
    keyboardHook: isPackaged
      ? join(resourcesPath, 'native', 'keyboard_hook.node')
      : join(
          appRoot,
          'electron',
          'native',
          'keyboard-hook',
          'build',
          'Release',
          'keyboard_hook.node',
        ),
  };
}