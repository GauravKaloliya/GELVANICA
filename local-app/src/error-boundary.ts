import { ipcMain } from "electron";

export function initRendererErrorHandler(): void {
  ipcMain.on("renderer-error", (_event, error: { message: string; stack?: string; source?: string; lineno?: number; colno?: number }) => {
    console.error("[Renderer Error]", error.message, {
      stack: error.stack,
      source: error.source,
      line: error.lineno,
      col: error.colno,
    });
  });

  ipcMain.on("renderer-unhandled-rejection", (_event, error: { message: string; stack?: string }) => {
    console.error("[Renderer Unhandled Rejection]", error.message, {
      stack: error.stack,
    });
  });
}

export function getRendererErrorHandlerPreload(): string {
  return `
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronErrorReporter", {
  reportError: (error) => ipcRenderer.send("renderer-error", error),
  reportUnhandledRejection: (error) => ipcRenderer.send("renderer-unhandled-rejection", error),
});
`;
}
