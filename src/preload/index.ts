import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  hideTrayWindow: () => {
    ipcRenderer.send('tray-window-hide')
  },
  resetSchedulerTimer: () => {
    ipcRenderer.send('scheduler-reset-timer')
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
    setSetting: (key: string, value: string) => ipcRenderer.invoke('db:set-setting', key, value),
    continueTracking: () => ipcRenderer.invoke('db:continue-tracking'),
    getTimeEntriesByDate: (date: string) => ipcRenderer.invoke('db:get-time-entries-by-date', date),
    getTimeEntriesByProject: (projectId: number, date: string) =>
      ipcRenderer.invoke('db:get-time-entries-by-project', projectId, date),
    updateTimeEntry: (id: number, startedAt: string, endedAt: string) =>
      ipcRenderer.invoke('db:update-time-entry', id, startedAt, endedAt),
    deleteTimeEntry: (id: number) => ipcRenderer.invoke('db:delete-time-entry', id),
    createManualEntry: (projectId: number, startedAt: string, endedAt: string) =>
      ipcRenderer.invoke('db:create-manual-entry', projectId, startedAt, endedAt)
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
