import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAuthData {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface ProfileData {
  name: string;
  avatar_path: string | null;
  previous_avatars: string[];
}

contextBridge.exposeInMainWorld("electronErrorReporter", {
  reportError(error: { message: string; stack?: string; source?: string; lineno?: number; colno?: number }): void {
    ipcRenderer.send("renderer-error", error);
  },
  reportUnhandledRejection(error: { message: string; stack?: string }): void {
    ipcRenderer.send("renderer-unhandled-rejection", error);
  },
});

contextBridge.exposeInMainWorld("electron", {
  getApiPort(): Promise<number> {
    return ipcRenderer.invoke("getApiPort");
  },
  getAppVersion(): Promise<string> {
    return ipcRenderer.invoke("getAppVersion");
  },
  isLocalMode(): Promise<boolean> {
    return ipcRenderer.invoke("isLocalMode");
  },
  isFlaskReady(): Promise<boolean> {
    return ipcRenderer.invoke("isFlaskReady");
  },
  getAuthData(): Promise<ElectronAuthData | null> {
    return ipcRenderer.invoke("getAuthData");
  },
  isAuthenticated(): Promise<boolean> {
    return ipcRenderer.invoke("isAuthenticated");
  },
  logout(): Promise<void> {
    return ipcRenderer.invoke("logout");
  },
  getProfileData(): Promise<ProfileData | null> {
    return ipcRenderer.invoke("getProfileData");
  },
  saveProfile(data: { name?: string; avatarPath?: string | null }): Promise<ProfileData> {
    return ipcRenderer.invoke("saveProfile", data);
  },
  selectAvatarFile(): Promise<string | null> {
    return ipcRenderer.invoke("selectAvatarFile");
  },
  copyToAvatarDir(sourcePath: string): Promise<string> {
    return ipcRenderer.invoke("copyToAvatarDir", sourcePath);
  },
  reauthenticate(): Promise<ElectronAuthData | null> {
    return ipcRenderer.invoke("reauthenticate");
  },
  getCloudApiUrl(): Promise<string> {
    return ipcRenderer.invoke("getCloudApiUrl");
  },
  selectImageFile(): Promise<string | null> {
    return ipcRenderer.invoke("selectImageFile");
  },
  copyFileToDir(sourcePath: string, dirName: string): Promise<string> {
    return ipcRenderer.invoke("copyFileToDir", sourcePath, dirName);
  },
});

declare global {
  interface Window {
    electronErrorReporter: {
      reportError: (error: { message: string; stack?: string; source?: string; lineno?: number; colno?: number }) => void;
      reportUnhandledRejection: (error: { message: string; stack?: string }) => void;
    };
    electron: {
      getApiPort: () => Promise<number>;
      getAppVersion: () => Promise<string>;
      isLocalMode: () => Promise<boolean>;
      isFlaskReady: () => Promise<boolean>;
      getAuthData: () => Promise<ElectronAuthData | null>;
      isAuthenticated: () => Promise<boolean>;
      logout: () => Promise<void>;
      getProfileData: () => Promise<ProfileData | null>;
      saveProfile: (data: { name?: string; avatarPath?: string | null }) => Promise<ProfileData>;
      selectAvatarFile: () => Promise<string | null>;
      copyToAvatarDir: (sourcePath: string) => Promise<string>;
      reauthenticate: () => Promise<ElectronAuthData | null>;
      getCloudApiUrl: () => Promise<string>;
      selectImageFile: () => Promise<string | null>;
      copyFileToDir: (sourcePath: string, dirName: string) => Promise<string>;
    };
  }
}
