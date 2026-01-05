import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

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

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'mari.db')

  db = new Database(dbPath)

  // Enable foreign keys
  db.pragma('foreign_keys = ON')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      started_at DATETIME NOT NULL,
      ended_at DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON time_entries(started_at);
  `)

  // Initialize default settings if they don't exist
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  insertSetting.run('promptIntervalMinutes', '20')
  insertSetting.run('idleThresholdMinutes', '5')

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// Project operations
export function getAllProjects(): Project[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects ORDER BY last_used_at DESC')
  return stmt.all() as Project[]
}

export function getProjectById(id: number): Project | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?')
  return stmt.get(id) as Project | undefined
}

export function createProject(name: string): Project {
  const db = getDatabase()
  const stmt = db.prepare('INSERT INTO projects (name) VALUES (?)')
  const result = stmt.run(name)
  return getProjectById(result.lastInsertRowid as number)!
}

export function updateProjectLastUsed(projectId: number): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE projects SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?')
  stmt.run(projectId)
}

export function deleteProject(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
  stmt.run(id)
}

// Time entry operations
export function createTimeEntry(projectId: number, startedAt?: string): TimeEntry {
  const db = getDatabase()
  const stmt = db.prepare(
    'INSERT INTO time_entries (project_id, started_at) VALUES (?, ?)'
  )
  const timestamp = startedAt || new Date().toISOString()
  const result = stmt.run(projectId, timestamp)

  // Update project's last_used_at
  updateProjectLastUsed(projectId)

  return getTimeEntryById(result.lastInsertRowid as number)!
}

export function getTimeEntryById(id: number): TimeEntry | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE id = ?')
  return stmt.get(id) as TimeEntry | undefined
}

export function getActiveTimeEntry(): TimeEntry | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM time_entries WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1')
  return stmt.get() as TimeEntry | undefined
}

export function endTimeEntry(id: number, endedAt?: string): TimeEntry {
  const db = getDatabase()
  const timestamp = endedAt || new Date().toISOString()

  const entry = getTimeEntryById(id)
  if (!entry) {
    throw new Error(`Time entry ${id} not found`)
  }

  const startTime = new Date(entry.started_at).getTime()
  const endTime = new Date(timestamp).getTime()
  const durationSeconds = Math.floor((endTime - startTime) / 1000)

  const stmt = db.prepare(
    'UPDATE time_entries SET ended_at = ?, duration_seconds = ? WHERE id = ?'
  )
  stmt.run(timestamp, durationSeconds, id)

  return getTimeEntryById(id)!
}

export function getTimeEntriesByDate(date: string): TimeEntry[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM time_entries
    WHERE DATE(started_at) = DATE(?)
    ORDER BY started_at ASC
  `)
  return stmt.all(date) as TimeEntry[]
}

export function getDailySummary(date: string): DailySummary[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT
      p.id as project_id,
      p.name as project_name,
      SUM(te.duration_seconds) as total_seconds
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    WHERE DATE(te.started_at) = DATE(?)
      AND te.ended_at IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY total_seconds DESC
  `)
  return stmt.all(date) as DailySummary[]
}

// Settings operations
export function getSetting(key: string): string | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  const result = stmt.get(key) as { value: string } | undefined
  return result?.value
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  stmt.run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase()
  const stmt = db.prepare('SELECT key, value FROM settings')
  const rows = stmt.all() as { key: string; value: string }[]
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {})
}
