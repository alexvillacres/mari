import { ElectronAPI } from '@electron-toolkit/preload'

export interface Project {
  id: number
  name: string
  created_at: string
  last_used_at: string
}

export interface TimeEntry {
  id: number
  project_id: number
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

export interface DailySummary {
  project_id: number
  project_name: string
  total_seconds: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      hideTrayWindow: () => void
      resetSchedulerTimer: () => void
      db: {
        getProjects: () => Promise<Project[]>
        createProject: (name: string) => Promise<Project>
        deleteProject: (id: number) => Promise<void>
        startTracking: (projectId: number) => Promise<TimeEntry>
        stopTracking: () => Promise<TimeEntry | null>
        getActiveEntry: () => Promise<TimeEntry | undefined>
        getDailySummary: (date: string) => Promise<DailySummary[]>
        getSettings: () => Promise<Record<string, string>>
        setSetting: (key: string, value: string) => Promise<void>
        continueTracking: () => Promise<{ success: boolean }>
        getTimeEntriesByDate: (date: string) => Promise<DailySummary[]>
        getTimeEntriesByProject: (projectId: number, date: string) => Promise<TimeEntry[]>
        updateTimeEntry: (id: number, startedAt: string, endedAt: string) => Promise<TimeEntry>
        deleteTimeEntry: (id: number) => Promise<void>
        createManualEntry: (
          projectId: number,
          startedAt: string,
          endedAt: string
        ) => Promise<TimeEntry>
      }
    }
  }
}
