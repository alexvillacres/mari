import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { TaskListItem } from './TaskListItem'
import { AddEntryModal } from './AddEntryModal'

type DailySummary = Awaited<ReturnType<typeof window.api.db.getDailySummary>>[number]
type TimeEntry = Awaited<ReturnType<typeof window.api.db.getActiveEntry>>

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateHeader(dateString: string): string {
  const today = getDateString(new Date())
  if (dateString === today) {
    return 'Today'
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateString === getDateString(yesterday)) {
    return 'Yesterday'
  }

  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function ReviewView(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<string>(() => getDateString(new Date()))
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | undefined>(undefined)
  const [dayTotal, setDayTotal] = useState<string>('0m')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const isToday = useMemo(() => selectedDate === getDateString(new Date()), [selectedDate])

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const loadDailySummary = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const summary = await window.api.db.getDailySummary(selectedDate)
      setDailySummary(summary)

      const totalSeconds = summary.reduce((acc, item) => acc + item.total_seconds, 0)
      setDayTotal(formatDuration(totalSeconds))
    } catch (error) {
      console.error('Failed to load daily summary:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  const goToPreviousDay = (): void => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() - 1)
    setSelectedDate(getDateString(current))
  }

  const goToNextDay = (): void => {
    const current = new Date(selectedDate + 'T00:00:00')
    current.setDate(current.getDate() + 1)
    setSelectedDate(getDateString(current))
  }

  const loadActiveEntry = useCallback(async (): Promise<void> => {
    try {
      const entry = await window.api.db.getActiveEntry()
      setActiveEntry(entry)
    } catch (error) {
      console.error('Failed to load active entry:', error)
    }
  }, [])

  useEffect(() => {
    loadDailySummary()
    loadActiveEntry()
  }, [loadDailySummary, loadActiveEntry])

  const handleRefresh = async (): Promise<void> => {
    await loadDailySummary()
    await loadActiveEntry()
  }

  const handleStartNewTask = (): void => {
    setShowAddModal(true)
  }

  const handleModalClose = (): void => {
    setShowAddModal(false)
  }

  const handleEntrySaved = async (): Promise<void> => {
    await handleRefresh()
  }

  return (
    <div className="p-4">
      <div className="rounded-lg bg-background p-4 shadow-lg">
        <div className="space-y-3">
          {/* Header with date navigation and total time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousDay}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="text-lg font-medium min-w-[100px] text-center">
                {formatDateHeader(selectedDate)}
              </h1>
              <button
                onClick={goToNextDay}
                disabled={isToday}
                className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm text-muted-foreground">{dayTotal}</span>
          </div>

          {/* Task list */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : dailySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks tracked {isToday ? 'today' : 'on this day'}
              </p>
            ) : (
              dailySummary.map((item) => (
                <TaskListItem
                  key={item.project_id}
                  projectId={item.project_id}
                  projectName={item.project_name}
                  duration={formatDuration(item.total_seconds)}
                  isActive={activeEntry?.project_id === item.project_id}
                  onRefresh={handleRefresh}
                />
              ))
            )}
          </div>

          {/* Start New Task button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleStartNewTask}
            disabled={loading}
          >
            + Add Time Entry
          </Button>
        </div>
      </div>

      {showAddModal && (
        <AddEntryModal onClose={handleModalClose} onSave={handleEntrySaved} date={selectedDate} />
      )}
    </div>
  )
}
