// Run this directly with node to test if MinGW compiles and runs code
// Usage: npx tsx electron/compiler/testCompiler.ts

import { compileSource, runBinary, cleanupDir } from './compilerService';
import { dirname } from 'path';

async function main() {
  const sampleCode = `
#include <stdio.h>
int main() {
  printf("hello");
  return 0;
}
`;

  console.log('Compiling...');
  const compileResult = compileSource(sampleCode);

  if (!compileResult.success || !compileResult.binaryPath) {
    console.error('Compile failed:');
    console.error(compileResult.stderr);
    return;
  }

  console.log('Compile succeeded. Running binary...');
  const runResult = await runBinary(compileResult.binaryPath, '', 5000);

  console.log('stdout:', runResult.stdout);
  console.log('stderr:', runResult.stderr);
  console.log('exitCode:', runResult.exitCode);
  console.log('timedOut:', runResult.timedOut);

  cleanupDir(dirname(compileResult.binaryPath));
}

main();