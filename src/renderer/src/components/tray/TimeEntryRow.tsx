import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Pencil, Trash2, Check, X } from 'lucide-react'

interface TimeEntryRowProps {
  id: number
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  onUpdate: (id: number, startedAt: string, endedAt: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function TimeEntryRow({
  id,
  startedAt,
  endedAt,
  durationSeconds,
  onUpdate,
  onDelete
}: TimeEntryRowProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const toTimeInputValue = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toTimeString().slice(0, 5)
  }

  const handleEditClick = (): void => {
    setEditStart(toTimeInputValue(startedAt))
    setEditEnd(endedAt ? toTimeInputValue(endedAt) : '')
    setIsEditing(true)
  }

  const handleSave = async (): Promise<void> => {
    const baseDate = new Date(startedAt).toISOString().split('T')[0]
    const newStartedAt = new Date(`${baseDate}T${editStart}:00`).toISOString()
    const newEndedAt = new Date(`${baseDate}T${editEnd}:00`).toISOString()

    await onUpdate(id, newStartedAt, newEndedAt)
    setIsEditing(false)
  }

  const handleCancel = (): void => {
    setIsEditing(false)
  }

  const handleDelete = async (): Promise<void> => {
    if (isDeleting) {
      await onDelete(id)
    } else {
      setIsDeleting(true)
      setTimeout(() => setIsDeleting(false), 3000)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Input
          type="time"
          value={editStart}
          onChange={(e) => setEditStart(e.target.value)}
          className="h-7 w-24 text-xs"
        />
        <span className="text-xs text-muted-foreground">-</span>
        <Input
          type="time"
          value={editEnd}
          onChange={(e) => setEditEnd(e.target.value)}
          className="h-7 w-24 text-xs"
        />
        <div className="flex gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  const isActive = !endedAt

  return (
    <div className="flex items-center justify-between py-1 group">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTime(startedAt)} - {isActive ? 'now' : formatTime(endedAt!)}
        </span>
        <span className="text-xs font-medium">
          {isActive ? 'Active' : formatDuration(durationSeconds)}
        </span>
      </div>
      {!isActive && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleEditClick}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${isDeleting ? 'text-destructive' : ''}`}
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
