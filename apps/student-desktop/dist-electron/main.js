import { BrowserWindow, app, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
//#region electron/main.ts
var require = createRequire(import.meta.url);
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
var keyboardHook = null;
try {
	keyboardHook = require(path.join(process.env.APP_ROOT, "electron/native/keyboard-hook/build/Release/keyboard_hook.node"));
	console.log("[lockdown] keyboard hook loaded successfully");
} catch (err) {
	console.error("[lockdown] keyboard hook failed to load:", err);
}
var win;
function registerLockdown() {
	try {
		keyboardHook?.startHook();
		console.log("[lockdown] hook registered");
	} catch (err) {
		console.error("[lockdown] failed to register hook:", err);
	}
}
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
		kiosk: true,
		frame: false,
		webPreferences: { preload: path.join(__dirname, "preload.mjs") }
	});
	win.setAlwaysOnTop(true, "screen-saver");
	win.on("minimize", () => {
		win?.restore();
	});
	win.on("page-title-updated", (evt) => evt.preventDefault());
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
ipcMain.on("exit-app", () => {
	unregisterLockdown();
	if (win) {
		win.closable = true;
		win.setAlwaysOnTop(false);
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
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(() => {
	createWindow();
	registerLockdown();
});
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
