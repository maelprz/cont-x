// wraps system volume muting so main.ts stays clean
import winAudio from "win-audio";

// grabs the speaker (output) controller from win-audio
const speaker = winAudio.speaker;

// mutes the entire system volume, called when exam lockdown starts
export function muteSystemAudio() {
  try {
    speaker.mute(); // tells Windows to mute all system audio
    console.log("[audio] system muted");
  } catch (err) {
    console.error("[audio] failed to mute:", err); // don't crash app if this fails
  }
}

// restores system volume, called whenever lockdown is lifted
export function unmuteSystemAudio() {
  try {
    speaker.unmute(); // tells Windows to unmute system audio
    console.log("[audio] system unmuted");
  } catch (err) {
    console.error("[audio] failed to unmute:", err); // don't crash app if this fails
  }
}