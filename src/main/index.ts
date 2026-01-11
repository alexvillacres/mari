import { app, shell, BrowserWindow, ipcMain, Tray, nativeImage, Menu, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as db from './database'
import { PromptScheduler } from './scheduler'

let tray: Tray | null = null
let trayWindow: BrowserWindow | null = null
let scheduler: PromptScheduler | null = null

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

function showTrayWindow(view: 'review' | 'prompt', projectId?: number): void {
  if (!trayWindow) {
    trayWindow = createTrayWindow()
  }

  // Build URL with query params
  const params = new URLSearchParams({ tray: 'true', view })
  if (projectId) params.set('projectId', String(projectId))

  const url = is.dev
    ? `${process.env['ELECTRON_RENDERER_URL']}?${params}`
    : `file://${join(__dirname, '../renderer/index.html')}?${params}`

  trayWindow.loadURL(url)

  // Position window based on view type
  positionTrayWindow(view)

  trayWindow.show()
  trayWindow.focus()
}

function positionTrayWindow(view: 'review' | 'prompt'): void {
  if (!trayWindow) return

  if (view === 'review') {
    // Position near tray icon
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
  } else {
    // Center on screen for Prompt View
    const display = screen.getPrimaryDisplay()
    const { width, height } = display.workAreaSize
    const windowBounds = trayWindow.getBounds()
    const x = Math.round(width / 2 - windowBounds.width / 2)
    const y = Math.round(height / 2 - windowBounds.height / 2)
    trayWindow.setPosition(x, y, false)
  }
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
    showTrayWindow('review')
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

  ipcMain.handle('db:get-time-entries-by-date', (_event, date: string) => {
    // This will be implemented when we add the database method
    // For now, we can use getDailySummary
    return db.getDailySummary(date)
  })

  ipcMain.handle('db:continue-tracking', () => {
    // Update lastPromptAt without modifying time entry
    db.setSetting('lastPromptAt', new Date().toISOString())
    return { success: true }
  })

  ipcMain.handle('db:get-time-entries-by-project', (_event, projectId: number, date: string) => {
    return db.getTimeEntriesByProjectAndDate(projectId, date)
  })

  ipcMain.handle(
    'db:update-time-entry',
    (_event, id: number, startedAt: string, endedAt: string) => {
      return db.updateTimeEntry(id, startedAt, endedAt)
    }
  )

  ipcMain.handle('db:delete-time-entry', (_event, id: number) => {
    db.deleteTimeEntry(id)
  })

  ipcMain.handle(
    'db:create-manual-entry',
    (_event, projectId: number, startedAt: string, endedAt: string) => {
      return db.createManualTimeEntry(projectId, startedAt, endedAt)
    }
  )

  ipcMain.on('scheduler-reset-timer', () => {
    if (scheduler) {
      scheduler.resetTimer()
    }
  })

  // Create system tray (menubar icon)
  createTray()

  // Show prompt view on app load
  setTimeout(() => {
    // Get active entry or use first project if available
    const activeEntry = db.getActiveTimeEntry()
    if (activeEntry) {
      showTrayWindow('prompt', activeEntry.project_id)
    } else {
      // Show prompt without project ID (will need to select/create one)
      showTrayWindow('prompt')
    }
  }, 1000)

  // Initialize scheduler
  scheduler = new PromptScheduler()
  scheduler.start((projectId: number) => {
    showTrayWindow('prompt', projectId)
  })

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
