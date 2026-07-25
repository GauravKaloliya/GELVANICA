import { ipcMain, clipboard } from 'electron'

export function registerClipboardHandlers(): void {
  ipcMain.on('clipboard:write-text', (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle('clipboard:read-text', () => {
    return clipboard.readText()
  })
}
