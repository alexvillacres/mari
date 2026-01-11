import { useState, useEffect } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { X } from 'lucide-react'

type Project = Awaited<ReturnType<typeof window.api.db.getProjects>>[number]

interface AddEntryModalProps {
  onClose: () => void
  onSave: () => void
  date?: string // YYYY-MM-DD format, defaults to today
}

export function AddEntryModal({ onClose, onSave, date }: AddEntryModalProps): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProjects()
    // Default to current time for end, 1 hour ago for start
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    setEndTime(now.toTimeString().slice(0, 5))
    setStartTime(oneHourAgo.toTimeString().slice(0, 5))
  }, [])

  const loadProjects = async (): Promise<void> => {
    try {
      const allProjects = await window.api.db.getProjects()
      setProjects(allProjects)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!startTime || !endTime) return

    setSaving(true)
    try {
      let projectId = selectedProjectId

      // Create new project if needed
      if (!projectId && newProjectName.trim()) {
        const newProject = await window.api.db.createProject(newProjectName.trim())
        projectId = newProject.id
      }

      if (!projectId) {
        setSaving(false)
        return
      }

      // Create the manual entry
      const entryDate = date || new Date().toISOString().split('T')[0]
      const startedAt = new Date(`${entryDate}T${startTime}:00`).toISOString()
      const endedAt = new Date(`${entryDate}T${endTime}:00`).toISOString()

      await window.api.db.createManualEntry(projectId, startedAt, endedAt)
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to create entry:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleProjectSelect = (id: number): void => {
    setSelectedProjectId(id)
    setNewProjectName('')
  }

  const handleNewProjectInput = (value: string): void => {
    setNewProjectName(value)
    setSelectedProjectId(null)
  }

  const isValid = (selectedProjectId || newProjectName.trim()) && startTime && endTime

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl w-80 max-h-96 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-medium">Add Time Entry</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 space-y-3">
          {/* Project selection */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Task</label>
            <Input
              placeholder="New task name..."
              value={newProjectName}
              onChange={(e) => handleNewProjectInput(e.target.value)}
              className="h-8 text-sm"
            />
            {projects.length > 0 && !newProjectName && (
              <div className="max-h-24 overflow-y-auto space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                      selectedProjectId === project.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time inputs */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Start</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <span className="text-muted-foreground mt-5">-</span>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">End</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1 h-8" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1 h-8" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving...' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </div>
  )
}
