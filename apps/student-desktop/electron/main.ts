import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerCompilerHandlers } from "./ipc/compilerHandlers";
import { installEditorSandbox } from "./editorSandbox";
import { registerOfflineExamHandlers } from "./ipc/offlineExamHandlers";
import { checkOfflineExamStorage, closeOfflineExamStorage, setOfflineStorageConfigFile } from "./storage/offlineExamStorage";
import { startExamProcessMonitor } from "./native/examProcessMonitor";
import { checkExamApps } from "./native/disallowedProcesses";
import { autoCloseDisallowedApps } from "../shared/examAppPolicy";
import { muteSystemAudio, unmuteSystemAudio } from "./native/audioControl"; // audio mute/unmute, sits next to keyboard-hook folder
import path from "node:path";

import { getRuntimePaths } from "./setup/runtimePaths";
import { verifyDependencies } from "./setup/verifyDependencies";

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
    getRuntimePaths(app.isPackaged, process.resourcesPath, process.env.APP_ROOT).keyboardHook,
  );
  console.log("[lockdown] keyboard hook loaded successfully");
} catch (err) {
  console.error("[lockdown] keyboard hook failed to load:", err);
}

let win: BrowserWindow | null = null;
let isExiting = false;
let startupVerified = false;
let stopProcessMonitor: (() => void) | undefined;
let preflightScan: AbortController | undefined;
let detectedApps: string[] = [];

function stopExamProcessMonitoring() {
  stopProcessMonitor?.();
  stopProcessMonitor = undefined;
}

ipcMain.on("set-exam-process-monitoring", (event, enabled: unknown) => {
  if (
    !win ||
    event.senderFrame !== win.webContents.mainFrame ||
    typeof enabled !== "boolean"
  )
    return;
  if (!enabled) {
    stopExamProcessMonitoring();
  } else if (
    process.platform === "win32" &&
    !isExiting &&
    !stopProcessMonitor
  ) {
    endExamAppCheck();
    stopProcessMonitor = startExamProcessMonitor(
      ({ appName, executableName }) => {
        win?.webContents.send("violation-detected", {
          violationType: "disallowed_process",
          occurredAt: new Date().toISOString(),
          process: { appName, executableName },
        });
      },
    );
  }
});

app.on("before-quit", stopExamProcessMonitoring);
app.on("before-quit", closeOfflineExamStorage);

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
    throw err;
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

function endExamAppCheck() {
  preflightScan?.abort();
  preflightScan = undefined;
  detectedApps = [];
}

ipcMain.handle("check-exam-apps", async (event, closeApps: unknown) => {
  const examWindow = win;
  if (
    !examWindow ||
    event.senderFrame !== examWindow.webContents.mainFrame ||
    isExiting ||
    stopProcessMonitor ||
    preflightScan ||
    typeof closeApps !== "boolean"
  ) {
    throw new Error("The exam app check is unavailable.");
  }
  if (!autoCloseDisallowedApps) return [];

  const scan = new AbortController();
  preflightScan = scan;
  try {
    const remaining = await checkExamApps(
      scan.signal,
      closeApps ? detectedApps : [],
      !!VITE_DEV_SERVER_URL,
    );
    if (scan.signal.aborted || examWindow.isDestroyed()) {
      throw new Error("The exam app check ended.");
    }
    if (remaining.length === 0) endExamAppCheck();
    else detectedApps = remaining;
    return remaining;
  } finally {
    if (preflightScan === scan) preflightScan = undefined;
  }
});

ipcMain.on("end-exam-app-check", (event) => {
  if (win && event.senderFrame === win.webContents.mainFrame) endExamAppCheck();
});

function createWindow() {
  win = new BrowserWindow({
    title: "Cont/x",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    kiosk: true, // covers the taskbar area at the OS level as a secondary layer
    frame: false, // removes the title bar and window controls
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });

  // keeps the app above all other windows at the highest z-order level
  installEditorSandbox(
    win,
    VITE_DEV_SERVER_URL ||
      pathToFileURL(path.join(RENDERER_DIST, "index.html")).href,
  );
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
  win.webContents.on(
    "did-start-navigation",
    (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) {
        stopExamProcessMonitoring();
        endExamAppCheck();
      }
    },
  );
  win.webContents.on("render-process-gone", stopExamProcessMonitoring);
  win.webContents.on("render-process-gone", endExamAppCheck);
  win.on("closed", stopExamProcessMonitoring);
  win.on("closed", endExamAppCheck);

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// called when the student clicks logout — the only valid exit path
ipcMain.on("exit-app", (event) => {
  if (!win || event.senderFrame !== win.webContents.mainFrame) return;
  isExiting = true; // tell the close handler to allow the next close
  endExamAppCheck();
  unregisterLockdown(); // restore taskbar, remove hooks, re-enable task manager, unmute audio
  if (win) {
    win.setAlwaysOnTop(false); // release always-on-top before quitting
  }
  app.quit(); // now the close event fires and isExiting = true lets it through
});

// Avoid changing Windows state if startup verification never passed.
process.on("exit", () => {
  if (!startupVerified) return;

  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true);

    unmuteSystemAudio();
  } catch {
    // The process is already exiting.
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (
    startupVerified &&
    BrowserWindow.getAllWindows().length === 0
  ) {
    createWindow();
  }
});

// Verify dependencies before creating the kiosk window or applying lockdown.
app.whenReady().then(async () => {
  try {
    if (process.platform !== "win32" || process.arch !== "x64") {
      throw new Error("This application requires Windows x64.");
    }

    if (!keyboardHook) {
      throw new Error(
        "The keyboard-hook component could not be loaded.",
      );
    }

    const mysqlConfigPath = path.join(app.getPath("userData"), "offline-mysql.env");
    if (app.isPackaged) setOfflineStorageConfigFile(mysqlConfigPath);

    await verifyDependencies();

    // Test setup and exit before creating the exam window or lockdown.
    if (process.argv.includes("--contx-check-setup")) {
      let storageStatus: string;
      let storageReady = false;
      try {
        storageReady = await checkOfflineExamStorage();
        storageStatus = storageReady
          ? "Local MySQL storage passed its schema check."
          : "Local MySQL storage needs configuration.";
      } catch {
        storageStatus = "Local MySQL storage is unavailable. Check the local server, database, and credentials.";
      }

      dialog.showMessageBoxSync({
        type: storageReady ? "info" : "warning",
        title: storageReady ? "Cont/x setup verified" : "Cont/x offline setup needs attention",
        message: "Compiler and native components passed their startup checks.",
        detail:
          "Keyboard-hook module loaded.\n" +
          "Audio component loaded.\n" +
          "Bundled C compilation and execution passed.\n\n" +
          storageStatus + (storageReady ? "" : `\nConfiguration: ${mysqlConfigPath}`),
      });

      isExiting = true;
      app.quit();
      return;
    }

    startupVerified = true;

    cleanupStaleLockdownState();
    registerCompilerHandlers(() => win);
    registerOfflineExamHandlers(() => win);
    createWindow();
    registerLockdown();
  } catch (error) {
    isExiting = true;

    if (startupVerified) {
      unregisterLockdown();
    }

    const details =
      error instanceof Error ? error.message : String(error);

    dialog.showErrorBox(
      "Cont/x setup needs repair",
      details +
        "\n\nClose Cont/x and rerun the latest installer." +
        "\nIf the problem continues, send this message to your teacher.",
    );

    app.quit();
  }
});
