import { BrowserWindow, app, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";
import path from "node:path";
//#region electron/compiler/compilerService.ts
var GCC_PATH = join(process.env.APP_ROOT ?? "", "electron", "native", "mingw", "bin", "gcc.exe");
function compileSource(sourceCode) {
	const workDir = mkdtempSync(join(tmpdir(), "contx-"));
	const sourcePath = join(workDir, "submission.c");
	const binaryPath = join(workDir, "submission.exe");
	writeFileSync(sourcePath, sourceCode, "utf-8");
	const proc = spawnSync(GCC_PATH, [
		"-std=c11",
		"-Wall",
		"-Werror",
		sourcePath,
		"-o",
		binaryPath
	], { encoding: "utf-8" });
	if (proc.status !== 0) {
		cleanupDir(workDir);
		return {
			success: false,
			stderr: proc.stderr ?? ""
		};
	}
	return {
		success: true,
		binaryPath,
		stderr: proc.stderr ?? ""
	};
}
function runBinary(binaryPath, stdinInput, timeoutMs) {
	return new Promise((resolve) => {
		const child = spawn(binaryPath);
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, timeoutMs);
		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		child.stdin.write(stdinInput);
		child.stdin.end();
		child.on("close", (exitCode) => {
			clearTimeout(timer);
			resolve({
				stdout,
				stderr,
				timedOut,
				exitCode
			});
		});
	});
}
function cleanupDir(workDir) {
	rmSync(workDir, {
		recursive: true,
		force: true
	});
}
//#endregion
//#region electron/ipc/compilerHandlers.ts
function buildSource(code, programType, mainCode) {
	if (programType === "program") return code;
	return `${code}\n\n${mainCode ?? ""}`;
}
function registerCompilerHandlers() {
	ipcMain.handle("run-test-cases", async (_event, payload) => {
		const compileResult = compileSource(buildSource(payload.code, payload.programType, payload.mainCode));
		if (!compileResult.success || !compileResult.binaryPath) return {
			compileError: compileResult.stderr,
			results: []
		};
		const results = [];
		for (const testCase of payload.testCases) {
			const runResult = await runBinary(compileResult.binaryPath, testCase.input, testCase.timeLimitMs);
			const passed = !runResult.timedOut && runResult.exitCode === 0 && runResult.stdout === testCase.expectedOutput;
			results.push({
				testCaseId: testCase.id,
				passed,
				actualOutput: runResult.stdout,
				executionTimeMs: null,
				timedOut: runResult.timedOut
			});
		}
		cleanupDir(dirname(compileResult.binaryPath));
		return {
			compileError: null,
			results
		};
	});
}
//#endregion
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
var win = null;
var isExiting = false;
function cleanupStaleLockdownState() {
	try {
		keyboardHook?.stopHook();
		keyboardHook?.setTaskManagerDisabled(false);
		keyboardHook?.setLockWorkstationDisabled(false);
		keyboardHook?.setChangePasswordDisabled(false);
		keyboardHook?.setFastUserSwitchingDisabled(false);
		keyboardHook?.setTaskbarVisible(true);
		console.log("[lockdown] cleared any leftover state from last run");
	} catch (err) {
		console.error("[lockdown] cleanup failed:", err);
	}
}
function registerLockdown() {
	try {
		keyboardHook?.startHook();
		keyboardHook?.setTaskManagerDisabled(true);
		keyboardHook?.setLockWorkstationDisabled(true);
		keyboardHook?.setChangePasswordDisabled(true);
		keyboardHook?.setFastUserSwitchingDisabled(true);
		keyboardHook?.setTaskbarVisible(false);
		console.log("[lockdown] hook registered, taskbar hidden");
	} catch (err) {
		console.error("[lockdown] failed to register hook:", err);
	}
}
function unregisterLockdown() {
	try {
		keyboardHook?.stopHook();
		keyboardHook?.setTaskManagerDisabled(false);
		keyboardHook?.setLockWorkstationDisabled(false);
		keyboardHook?.setChangePasswordDisabled(false);
		keyboardHook?.setFastUserSwitchingDisabled(false);
		keyboardHook?.setTaskbarVisible(true);
		console.log("[lockdown] hook unregistered, taskbar restored");
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
	win.on("close", (event) => {
		if (!isExiting) {
			event.preventDefault();
			console.log("[lockdown] close attempt blocked");
		}
	});
	win.on("page-title-updated", (evt) => evt.preventDefault());
	win.webContents.on("did-finish-load", () => {
		win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
ipcMain.on("exit-app", () => {
	isExiting = true;
	unregisterLockdown();
	if (win) win.setAlwaysOnTop(false);
	app.quit();
});
process.on("exit", () => {
	try {
		keyboardHook?.stopHook();
		keyboardHook?.setTaskManagerDisabled(false);
		keyboardHook?.setLockWorkstationDisabled(false);
		keyboardHook?.setChangePasswordDisabled(false);
		keyboardHook?.setFastUserSwitchingDisabled(false);
		keyboardHook?.setTaskbarVisible(true);
	} catch {}
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(() => {
	cleanupStaleLockdownState();
	createWindow();
	registerLockdown();
	registerCompilerHandlers();
});
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
