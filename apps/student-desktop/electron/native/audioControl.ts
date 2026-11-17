import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Load the native module when needed so startup errors can be displayed.
function getSpeaker() {
  return require('win-audio').speaker;
}

export function verifyAudioDependency(): void {
  const speaker = getSpeaker();

  if (
    !speaker ||
    typeof speaker.mute !== 'function' ||
    typeof speaker.unmute !== 'function'
  ) {
    throw new Error('The Windows audio component is unavailable.');
  }
}

export function muteSystemAudio(): void {
  try {
    getSpeaker().mute();
    console.log('[audio] system muted');
  } catch (error) {
    console.error('[audio] failed to mute:', error);
  }
}

export function unmuteSystemAudio(): void {
  try {
    getSpeaker().unmute();
    console.log('[audio] system unmuted');
  } catch (error) {
    console.error('[audio] failed to unmute:', error);
  }
}