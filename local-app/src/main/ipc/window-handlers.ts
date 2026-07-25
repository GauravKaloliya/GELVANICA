import { ipcMain, dialog, BrowserWindow } from 'electron'

export function registerWindowHandlers(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.on('window:set-title', (event, title: string) => {
    BrowserWindow.fromWebContents(event.sender)?.setTitle(title)
  })

  ipcMain.handle('dialog:open-file', async (_event, options: Electron.OpenDialogOptions) => {
    const win = BrowserWindow.fromWebContents(_event.sender) ?? undefined
    const result = await dialog.showOpenDialog(win!, options)
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:save-file', async (_event, options: Electron.SaveDialogOptions) => {
    const win = BrowserWindow.fromWebContents(_event.sender) ?? undefined
    const result = await dialog.showSaveDialog(win!, options)
    return result.canceled ? null : result.filePath
  })
}
