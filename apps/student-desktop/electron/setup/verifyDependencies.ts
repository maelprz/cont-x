import { dirname } from 'node:path';
import {
  compileSource,
  runBinary,
  cleanupDir,
} from '../compiler/compilerService';
import { verifyAudioDependency } from '../native/audioControl';

export async function verifyDependencies(): Promise<void> {
  // Check audio without changing the system volume.
  verifyAudioDependency();

  // Verify the bundled compiler, linker, libraries, and runtime.
  const compiled = compileSource(
    '#include <stdio.h>\n' +
    'int main(void) {\n' +
    '  puts("CONTX_READY");\n' +
    '  return 0;\n' +
    '}\n',
  );

  if (!compiled.success || !compiled.binaryPath) {
    throw new Error(
      'The bundled C compiler could not compile a test program.\n' +
      compiled.stderr,
    );
  }

  try {
    const result = await runBinary(compiled.binaryPath, '', 5_000);

    if (
      result.timedOut ||
      result.exitCode !== 0 ||
      result.stdout.trim() !== 'CONTX_READY'
    ) {
      throw new Error(
        'The compiled test program could not run successfully.\n' +
        result.stderr,
      );
    }
  } finally {
    cleanupDir(dirname(compiled.binaryPath));
  }
}