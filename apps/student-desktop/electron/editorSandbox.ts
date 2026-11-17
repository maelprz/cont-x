import type { BrowserWindow } from "electron";

// The renderer can reload its own document, but cannot become a browser.
export function installEditorSandbox(window: BrowserWindow, documentUrl: string): void {
  const allowed = new URL(documentUrl);
  allowed.hash = "";
  const canNavigate = (target: string) => {
    try {
      const url = new URL(target);
      url.hash = "";
      return url.href === allowed.href;
    } catch {
      return false;
    }
  };
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!canNavigate(url)) event.preventDefault();
  });
  window.webContents.on("will-redirect", (event, url) => {
    if (!canNavigate(url)) event.preventDefault();
  });
  window.webContents.on("will-frame-navigate", (event) => {
    if (!event.isMainFrame || !canNavigate(event.url)) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.session.on("will-download", (event) => event.preventDefault());
}
