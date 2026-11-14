import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { registerCompilerHandlers } from "./ipc/compilerHandlers";
import { startExamProcessMonitor } from "./native/examProcessMonitor";
import { muteSystemAudio, unmuteSystemAudio } from "./native/audioControl"; // audio mute/unmute, sits next to keyboard-hook folder
import path from "node:path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// type definition for every function exported by the C++ native module
let keyboardHook: {
  startHook: (onViolation: (label: string) => void) => void;
  stopHook: () => void;
  setTaskManagerDisabled: (disable: boolean) => void;
  setLockWorkstationDisabled: (disable: boolean) => void;
  setChangePasswordDisabled: (disable: boolean) => void;
  setFastUserSwitchingDisabled: (disable: boolean) => void;
  setTaskbarVisible: (visible: boolean) => void;
} | null = null;

try {
  keyboardHook = require(
    path.join(
      process.env.APP_ROOT,
      "electron/native/keyboard-hook/build/Release/keyboard_hook.node",
    ),
  );
  console.log("[lockdown] keyboard hook loaded successfully");
} catch (err) {
  console.error("[lockdown] keyboard hook failed to load:", err);
}

let win: BrowserWindow | null = null;
let isExiting = false;
let stopProcessMonitor: (() => void) | undefined;

function stopExamProcessMonitoring() {
  stopProcessMonitor?.();
  stopProcessMonitor = undefined;
}

ipcMain.on("set-exam-process-monitoring", (event, enabled: unknown) => {
  if (!win || event.senderFrame !== win.webContents.mainFrame || typeof enabled !== "boolean") return;
  if (!enabled) {
    stopExamProcessMonitoring();
  } else if (process.platform === "win32" && !isExiting && !stopProcessMonitor) {
    stopProcessMonitor = startExamProcessMonitor(({ appName, executableName }) => {
      win?.webContents.send("violation-detected", {
        violationType: "disallowed_process",
        occurredAt: new Date().toISOString(),
        process: { appName, executableName },
      });
    });
  }
});

app.on("before-quit", stopExamProcessMonitoring);

// clears any leftover restrictions from a crashed previous session
// runs before createWindow so a clean state is guaranteed on startup
function cleanupStaleLockdownState() {
  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true); // restore taskbar if it was hidden by a crash
    unmuteSystemAudio(); // restore audio in case last run crashed while muted
    console.log("[lockdown] cleared any leftover state from last run");
  } catch (err) {
    console.error("[lockdown] cleanup failed:", err);
  }
}

// installs the WH_KEYBOARD_LL hook and applies all OS-level restrictions
function registerLockdown() {
  try {
    keyboardHook?.startHook((violationType: string) => {
      win?.webContents.send("violation-detected", {
        violationType, // which combo was blocked, e.g. 'alt_tab'
        occurredAt: new Date().toISOString(), // when main process saw it
      });
    });
    keyboardHook?.setTaskManagerDisabled(true);
    keyboardHook?.setLockWorkstationDisabled(true);
    keyboardHook?.setChangePasswordDisabled(true);
    keyboardHook?.setFastUserSwitchingDisabled(true);
    keyboardHook?.setTaskbarVisible(false); // hide taskbar so student can't close app from it
    muteSystemAudio(); // mute system audio the moment lockdown begins
    console.log("[lockdown] hook registered, taskbar hidden");
  } catch (err) {
    console.error("[lockdown] failed to register hook:", err);
  }
}

// removes all restrictions — called before app quits or exam ends
function unregisterLockdown() {
  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true); // always restore taskbar before exit
    unmuteSystemAudio(); // restore audio when exam ends or app exits normally
    console.log("[lockdown] hook unregistered, taskbar restored");
  } catch (err) {
    console.error("[lockdown] failed to unregister hook:", err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    title: "Cont/x",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    kiosk: true, // covers the taskbar area at the OS level as a secondary layer
    frame: false, // removes the title bar and window controls
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // keeps the app above all other windows at the highest z-order level
  win.setAlwaysOnTop(true, "screen-saver"); //comment this out for testing without restrictions

  // if somehow minimized (e.g. via a hotkey we didn't catch), restore immediately
  win.on("minimize", () => {
    win?.restore();
  });

  // prevents the student from closing the app via taskbar right-click → Close
  // or any other close attempt while the app is running
  win.on("close", (event) => {
    if (!isExiting) {
      // student tried to close via taskbar, Alt+F4, or anything else — block it
      event.preventDefault();
      console.log("[lockdown] close attempt blocked");
    }
    // if isExiting is true, we let the close proceed naturally
  });

  // prevents Vite from overriding the window title during dev
  win.on("page-title-updated", (evt) => evt.preventDefault());

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });
  win.webContents.on("did-start-navigation", (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) stopExamProcessMonitoring();
  });
  win.webContents.on("render-process-gone", stopExamProcessMonitoring);
  win.on("closed", stopExamProcessMonitoring);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// called when the student clicks logout — the only valid exit path
ipcMain.on("exit-app", () => {
  isExiting = true; // tell the close handler to allow the next close
  unregisterLockdown(); // restore taskbar, remove hooks, re-enable task manager, unmute audio
  if (win) {
    win.setAlwaysOnTop(false); // release always-on-top before quitting
  }
  app.quit(); // now the close event fires and isExiting = true lets it through
});

// last-resort cleanup if the process exits unexpectedly
// restores the taskbar and audio even if unregisterLockdown() was never called
process.on("exit", () => {
  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true); // critical — stuck hidden taskbar is very bad UX
    unmuteSystemAudio(); // critical — stuck muted audio is very bad UX
  } catch {
    // silently ignore — process is already exiting
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // unregisterLockdown already called by exit-app — don't call again here
    // just make sure the process actually exits
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  cleanupStaleLockdownState(); // undo any restrictions left by a previous crash
  createWindow();
  registerLockdown(); // lockdown starts the moment the window is ready, comment this out for testing without restrictions
  registerCompilerHandlers(); // sets up the run-test-cases IPC channel
});
