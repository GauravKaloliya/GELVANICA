import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronLoading", {
  onProgress(callback: (percent: number, status: string) => void): void {
    ipcRenderer.on("loading-progress", (_event, data: { percent: number; status: string }) => {
      callback(data.percent, data.status);
    });
  },
  onComplete(callback: () => void): void {
    ipcRenderer.on("loading-complete", () => {
      callback();
    });
  },
  onError(callback: (message: string) => void): void {
    ipcRenderer.on("loading-error", (_event, message: string) => {
      callback(message);
    });
  },
});
