import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as db from './database'

let tray: Tray | null = null
let trayWindow: BrowserWindow | null = null

function createTrayWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 400,
    height: 450,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Load the tray window using index.html with a query parameter
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?tray=true`)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { tray: 'true' }
    })
  }

  // Hide window when it loses focus (clicking outside)
  window.on('blur', () => {
    window.hide()
  })

  return window
}

function createTray(): void {
  // Create tray icon from PNG
  // Use the resources path relative to the app root
  const iconPath = is.dev
    ? join(process.cwd(), 'resources/binto.png')
    : join(process.resourcesPath, 'binto.png')

  let trayIcon: Electron.NativeImage

  try {
    // Load the PNG icon
    trayIcon = nativeImage.createFromPath(iconPath)

    // If empty, fallback to default icon
    if (trayIcon.isEmpty()) {
      throw new Error('PNG icon is empty')
    }
  } catch (error) {
    // Fallback to the app icon if PNG fails
    console.warn('Failed to load binto.png, using app icon:', error)
    trayIcon = nativeImage.createFromPath(icon)
  }

  // Resize icon for tray (typically 16x16 or 22x22 on macOS)
  const iconSize = process.platform === 'darwin' ? 22 : 16
  const resizedIcon = trayIcon.resize({ width: iconSize, height: iconSize })
  tray = new Tray(resizedIcon)

  tray.setToolTip('Binto')

  tray.on('click', () => {
    if (!trayWindow) {
      trayWindow = createTrayWindow()
    }

    if (trayWindow.isVisible()) {
      trayWindow.hide()
    } else {
      // Position the window near the tray icon
      if (!tray) return
      const bounds = tray.getBounds()
      const windowBounds = trayWindow.getBounds()

      // Center the window horizontally relative to the tray icon
      const x = Math.round(bounds.x - windowBounds.width / 2 + bounds.width / 2)
      // Position above the tray icon (macOS) or below (Windows/Linux)
      const y =
        process.platform === 'darwin'
          ? Math.round(bounds.y - windowBounds.height - 10)
          : Math.round(bounds.y + bounds.height + 10)

      trayWindow.setPosition(x, y, false)
      trayWindow.show()
      trayWindow.focus()
    }
  })

  // No context menu - user requested to disable it
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Disable the default application menu
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }
  Menu.setApplicationMenu(null)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  db.initDatabase()

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // IPC handler to hide tray window (for ESC key)
  ipcMain.on('tray-window-hide', () => {
    if (trayWindow) {
      trayWindow.hide()
    }
  })

  // Database IPC handlers
  ipcMain.handle('db:get-projects', () => {
    return db.getAllProjects()
  })

  ipcMain.handle('db:create-project', (_event, name: string) => {
    return db.createProject(name)
  })

  ipcMain.handle('db:delete-project', (_event, id: number) => {
    db.deleteProject(id)
  })

  ipcMain.handle('db:start-tracking', (_event, projectId: number) => {
    // End any active time entry first
    const activeEntry = db.getActiveTimeEntry()
    if (activeEntry) {
      db.endTimeEntry(activeEntry.id)
    }
    // Start new time entry
    return db.createTimeEntry(projectId)
  })

  ipcMain.handle('db:stop-tracking', () => {
    const activeEntry = db.getActiveTimeEntry()
    if (activeEntry) {
      return db.endTimeEntry(activeEntry.id)
    }
    return null
  })

  ipcMain.handle('db:get-active-entry', () => {
    return db.getActiveTimeEntry()
  })

  ipcMain.handle('db:get-daily-summary', (_event, date: string) => {
    return db.getDailySummary(date)
  })

  ipcMain.handle('db:get-settings', () => {
    return db.getAllSettings()
  })

  ipcMain.handle('db:set-setting', (_event, key: string, value: string) => {
    db.setSetting(key, value)
  })

  // Create system tray (menubar icon)
  createTray()

  // Optionally create main window (comment out if you only want tray)
  // createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Don't quit when all windows are closed - this is a menubar app
// The app will stay running until explicitly quit via tray menu
app.on('window-all-closed', () => {
  // Keep the app running even when all windows are closed
  // This allows the tray icon to remain active
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
