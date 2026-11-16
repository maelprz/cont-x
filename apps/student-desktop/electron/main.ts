import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { registerCompilerHandlers } from "./ipc/compilerHandlers";
import { startExamProcessMonitor } from "./native/examProcessMonitor";
import { checkExamApps } from "./native/disallowedProcesses";
import { muteSystemAudio, unmuteSystemAudio } from "./native/audioControl";
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

// Functions exported by the native keyboard-hook module.
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
    getRuntimePaths(
      app.isPackaged,
      process.resourcesPath,
      process.env.APP_ROOT,
    ).keyboardHook,
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
let restorePreflightLockdown: (() => void) | undefined;

function stopExamProcessMonitoring() {
  stopProcessMonitor?.();
  stopProcessMonitor = undefined;
}

ipcMain.on("set-exam-process-monitoring", (event, enabled: unknown) => {
  if (
    !win ||
    event.senderFrame !== win.webContents.mainFrame ||
    typeof enabled !== "boolean"
  ) {
    return;
  }

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

// Clear restrictions left by a previous crashed session.
function cleanupStaleLockdownState() {
  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true);

    unmuteSystemAudio();

    console.log("[lockdown] cleared any leftover state from last run");
  } catch (err) {
    console.error("[lockdown] cleanup failed:", err);
  }
}

// Apply restrictions only after startup dependencies have passed.
function registerLockdown() {
  try {
    keyboardHook?.startHook((violationType: string) => {
      win?.webContents.send("violation-detected", {
        violationType,
        occurredAt: new Date().toISOString(),
      });
    });

    keyboardHook?.setTaskManagerDisabled(true);
    keyboardHook?.setLockWorkstationDisabled(true);
    keyboardHook?.setChangePasswordDisabled(true);
    keyboardHook?.setFastUserSwitchingDisabled(true);
    keyboardHook?.setTaskbarVisible(false);

    muteSystemAudio();

    console.log("[lockdown] hook registered, taskbar hidden");
  } catch (err) {
    console.error("[lockdown] failed to register hook:", err);
    throw err;
  }
}

// Restore restrictions when the application exits or temporarily unlocks.
function unregisterLockdown() {
  try {
    keyboardHook?.stopHook();
    keyboardHook?.setTaskManagerDisabled(false);
    keyboardHook?.setLockWorkstationDisabled(false);
    keyboardHook?.setChangePasswordDisabled(false);
    keyboardHook?.setFastUserSwitchingDisabled(false);
    keyboardHook?.setTaskbarVisible(true);

    unmuteSystemAudio();

    console.log("[lockdown] hook unregistered, taskbar restored");
  } catch (err) {
    console.error("[lockdown] failed to unregister hook:", err);
  }
}

function endExamAppCheck() {
  preflightScan?.abort();
  preflightScan = undefined;
  detectedApps = [];
  restorePreflightLockdown?.();
  restorePreflightLockdown = undefined;
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

  const scan = new AbortController();
  preflightScan = scan;

  try {
    const remaining = await checkExamApps(
      scan.signal,
      closeApps ? detectedApps : [],
    );

    if (scan.signal.aborted || examWindow.isDestroyed()) {
      throw new Error("The exam app check ended.");
    }

    if (remaining.length > 0 && !restorePreflightLockdown) {
      // Let the student switch to save prompts and close detected apps.
      const wasKiosk = examWindow.isKiosk();
      const wasOnTop = examWindow.isAlwaysOnTop();

      restorePreflightLockdown = () => {
        if (examWindow.isDestroyed() || isExiting) return;

        examWindow.setKiosk(wasKiosk);
        examWindow.setAlwaysOnTop(wasOnTop, "screen-saver");
        registerLockdown();
      };

      unregisterLockdown();
      examWindow.setKiosk(false);
      examWindow.setAlwaysOnTop(false);
    }

    if (remaining.length === 0) {
      endExamAppCheck();
    } else {
      detectedApps = remaining;
    }

    return remaining;
  } finally {
    if (preflightScan === scan) {
      preflightScan = undefined;
    }
  }
});

ipcMain.on("end-exam-app-check", (event) => {
  if (win && event.senderFrame === win.webContents.mainFrame) {
    endExamAppCheck();
  }
});

function createWindow() {
  win = new BrowserWindow({
    title: "Cont/x",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    kiosk: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");

  win.on("minimize", () => {
    win?.restore();
  });

  win.on("close", (event) => {
    if (!isExiting) {
      event.preventDefault();
      console.log("[lockdown] close attempt blocked");
    }
  });

  win.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send(
      "main-process-message",
      new Date().toLocaleString(),
    );
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

// The existing logout flow requests this exit.
ipcMain.on("exit-app", () => {
  isExiting = true;
  endExamAppCheck();
  unregisterLockdown();

  if (win) {
    win.setAlwaysOnTop(false);
  }

  app.quit();
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

    await verifyDependencies();

    // Test setup and exit before creating the exam window or lockdown.
    if (process.argv.includes("--contx-check-setup")) {
      dialog.showMessageBoxSync({
        type: "info",
        title: "Cont/x setup verified",
        message: "Compiler and native components passed their startup checks.",
        detail:
          "Keyboard-hook module loaded.\n" +
          "Audio component loaded.\n" +
          "Bundled C compilation and execution passed.\n\n" +
          "Lockdown was not activated.",
      });

      isExiting = true;
      app.quit();
      return;
    }

    startupVerified = true;

    cleanupStaleLockdownState();
    registerCompilerHandlers();
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