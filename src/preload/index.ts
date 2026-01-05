import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  hideTrayWindow: () => {
    ipcRenderer.send('tray-window-hide')
  },
  // Database APIs
  db: {
    getProjects: () => ipcRenderer.invoke('db:get-projects'),
    createProject: (name: string) => ipcRenderer.invoke('db:create-project', name),
    deleteProject: (id: number) => ipcRenderer.invoke('db:delete-project', id),
    startTracking: (projectId: number) => ipcRenderer.invoke('db:start-tracking', projectId),
    stopTracking: () => ipcRenderer.invoke('db:stop-tracking'),
    getActiveEntry: () => ipcRenderer.invoke('db:get-active-entry'),
    getDailySummary: (date: string) => ipcRenderer.invoke('db:get-daily-summary', date),
    getSettings: () => ipcRenderer.invoke('db:get-settings'),
    setSetting: (key: string, value: string) =>
      ipcRenderer.invoke('db:set-setting', key, value)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
