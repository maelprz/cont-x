import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// set APP_ROOT first before anything else uses it
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// safely load the C++ keyboard hook addon
// if it fails, the app still opens — lockdown just won't be active
let keyboardHook: { startHook: () => void; stopHook: () => void } | null = null;

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

let win: BrowserWindow | null;

// installs the WH_KEYBOARD_LL hook — blocks restricted keys system-wide
function registerLockdown() {
  try {
    keyboardHook?.startHook();
    console.log("[lockdown] hook registered");
  } catch (err) {
    console.error("[lockdown] failed to register hook:", err);
  }
}

// removes the WH_KEYBOARD_LL hook — called before app quits
function unregisterLockdown() {
  try {
    keyboardHook?.stopHook();
    console.log("[lockdown] hook unregistered");
  } catch (err) {
    console.error("[lockdown] failed to unregister hook:", err);
  }
}

function createWindow() {
  win = new BrowserWindow({
    title: "Cont/x",
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    kiosk: true, // covers the taskbar
    frame: false, // removes the title bar and window controls
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // keeps the app above all other windows
  win.setAlwaysOnTop(true, "screen-saver");

  // if somehow minimized, restore it immediately
  win.on("minimize", () => {
    win?.restore();
  });

  // prevents Vite from overriding the window title
  win.on("page-title-updated", (evt) => evt.preventDefault());

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// called when the student clicks logout — cleans up and exits
ipcMain.on("exit-app", () => {
  unregisterLockdown();
  if (win) {
    win.closable = true; // allow the window to close
    win.setAlwaysOnTop(false); // release always-on-top before quitting
  }
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    unregisterLockdown();
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
  createWindow();
  registerLockdown(); // lockdown starts the moment the app is ready
});
