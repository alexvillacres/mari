import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TimeEntryRow } from './TimeEntryRow'

type TimeEntry = Awaited<ReturnType<typeof window.api.db.getTimeEntriesByProject>>[number]

interface TaskListItemProps {
  projectId: number
  projectName: string
  duration: string
  isActive: boolean
  onRefresh: () => void
}

export function TaskListItem({
  projectId,
  projectName,
  duration,
  isActive,
  onRefresh
}: TaskListItemProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)

  const loadEntries = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const timeEntries = await window.api.db.getTimeEntriesByProject(projectId, today)
      setEntries(timeEntries)
    } catch (error) {
      console.error('Failed to load time entries:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (isExpanded) {
      loadEntries()
    }
  }, [isExpanded, loadEntries])

  const handleClick = (): void => {
    setIsExpanded(!isExpanded)
  }

  const handleUpdateEntry = async (
    id: number,
    startedAt: string,
    endedAt: string
  ): Promise<void> => {
    await window.api.db.updateTimeEntry(id, startedAt, endedAt)
    await loadEntries()
    onRefresh()
  }

  const handleDeleteEntry = async (id: number): Promise<void> => {
    await window.api.db.deleteTimeEntry(id)
    await loadEntries()
    onRefresh()
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        onClick={handleClick}
        className="p-3 cursor-pointer transition-colors hover:bg-accent/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {isActive && <span className="text-green-500">●</span>}
            <span className="text-sm font-medium">{projectName}</span>
          </div>
          <span className="text-sm text-muted-foreground">{duration}</span>
        </div>

        {isActive && (
          <div className="mt-1 ml-6">
            <span className="text-xs text-green-500">Active</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border">
          <div className="pt-2 space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground py-2">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No entries</p>
            ) : (
              entries.map((entry) => (
                <TimeEntryRow
                  key={entry.id}
                  id={entry.id}
                  startedAt={entry.started_at}
                  endedAt={entry.ended_at}
                  durationSeconds={entry.duration_seconds}
                  onUpdate={handleUpdateEntry}
                  onDelete={handleDeleteEntry}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
