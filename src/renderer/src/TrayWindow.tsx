import { useState, useEffect, useRef } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'

// Types are globally available from window.api
type Project = Awaited<ReturnType<typeof window.api.db.getProjects>>[number]

function TrayWindow(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [inputValue, setInputValue] = useState<string>('')
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [todayTotal, setTodayTotal] = useState<string>('0m today')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Make body transparent for tray window
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent'
    return () => {
      document.body.style.backgroundColor = ''
    }
  }, [])

  // Load projects from database
  useEffect(() => {
    loadProjects()
    loadTodayTotal()
  }, [])

  const loadProjects = async (): Promise<void> => {
    try {
      const projectList = await window.api.db.getProjects()
      setProjects(projectList)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTodayTotal = async (): Promise<void> => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const summary = await window.api.db.getDailySummary(today)
      const totalSeconds = summary.reduce((acc, item) => acc + item.total_seconds, 0)
      setTodayTotal(formatDuration(totalSeconds))
    } catch (error) {
      console.error('Failed to load today total:', error)
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m today`
    }
    return `${minutes}m today`
  }

  // Filter projects as user types
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = projects.filter((project) =>
        project.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(projects)
    }
  }, [inputValue, projects])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value)
    setShowConfirmation(false)
    setSelectedProject(null)
    setShowDropdown(true)
  }

  const updateDropdownPosition = (): void => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }

  const handleInputClick = (): void => {
    updateDropdownPosition()
    if (!showDropdown && filteredProjects.length > 0) {
      setShowDropdown(true)
    }
  }

  const handleToggleDropdown = (): void => {
    if (!showDropdown) {
      updateDropdownPosition()
    }
    setShowDropdown(!showDropdown)
  }

  const handleProjectClick = (project: Project): void => {
    setInputValue(project.name)
    setSelectedProject(project)
    setShowDropdown(false)
    setShowConfirmation(true)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Check if exact match exists
      const exactMatch = projects.find(
        (p) => p.name.toLowerCase() === inputValue.trim().toLowerCase()
      )
      if (exactMatch) {
        handleProjectClick(exactMatch)
      } else {
        // New project
        setShowDropdown(false)
        setShowConfirmation(true)
      }
    }
  }

  const handleConfirm = async (): Promise<void> => {
    try {
      let projectToTrack = selectedProject

      // Create new project if it doesn't exist
      if (!projectToTrack) {
        projectToTrack = await window.api.db.createProject(inputValue.trim())
        setProjects([projectToTrack, ...projects])
      }

      // Start tracking
      await window.api.db.startTracking(projectToTrack.id)

      // Reset UI
      setInputValue('')
      setShowConfirmation(false)
      setSelectedProject(null)
      loadTodayTotal()
    } catch (error) {
      console.error('Failed to confirm project:', error)
    }
  }

  const handleDeny = (): void => {
    setInputValue('')
    setShowConfirmation(false)
    setSelectedProject(null)
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  // Handle ESC key to close the tray window
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        // Use the API to hide the tray window
        if (window.api && typeof window.api.hideTrayWindow === 'function') {
          window.api.hideTrayWindow()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="p-4">
      {/* Main tray card with fixed height */}
      <div ref={containerRef} className="rounded-lg bg-background p-4 shadow-lg">
        <div className="space-y-3">
          {/* Header with title and today's total */}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-medium">What are you working on?</h1>
            <span className="text-sm text-muted-foreground">{todayTotal}</span>
          </div>

          {/* Input field */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onClick={handleInputClick}
              onKeyDown={handleInputKeyDown}
              placeholder="Type project name..."
              className="w-full pr-10 text-base"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleToggleDropdown}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              <ChevronsUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* Confirmation buttons */}
          {showConfirmation && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={handleDeny} className="flex-1">
                Deny ⊘
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm ✓
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dropdown list of matching projects - positioned outside the card */}
      {showDropdown && filteredProjects.length > 0 && (
        <div
          className="fixed z-[9999] overflow-hidden rounded-lg border border-border bg-background shadow-xl"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="max-h-80 overflow-y-auto">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className="cursor-pointer px-4 py-3 text-base transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {project.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TrayWindow
