import { useState, useEffect, useRef } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { ChevronsUpDown } from 'lucide-react'

type Project = Awaited<ReturnType<typeof window.api.db.getProjects>>[number]

interface PromptViewProps {
  projectId?: number
}

export function PromptView({ projectId }: PromptViewProps): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [originalProject, setOriginalProject] = useState<Project | null>(null)
  const [inputValue, setInputValue] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [userAction, setUserAction] = useState<'none' | 'edited' | 'selected'>('none')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load projects and prefill with active project
  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        setOriginalProject(project)
        setInputValue(project.name)
      }
    } else if (!projectId) {
      // No active project, leave input empty
      setOriginalProject(null)
      setInputValue('')
    }
  }, [projectId, projects])

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
    const newValue = e.target.value
    setInputValue(newValue)
    setShowDropdown(true)

    // Detect if user edited the text
    if (originalProject && newValue !== originalProject.name) {
      setUserAction('edited')
      setSelectedProject(null)
    } else if (originalProject && newValue === originalProject.name) {
      setUserAction('none')
      setSelectedProject(null)
    }
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
    setUserAction('selected')
  }

  const handleConfirm = async (): Promise<void> => {
    try {
      // Path 1: Confirm unchanged (continue tracking)
      if (userAction === 'none' && originalProject && inputValue === originalProject.name) {
        await window.api.db.continueTracking()
        window.api.hideTrayWindow()
        return
      }

      // Path 2 is handled by handleDeny

      // Path 3: Select from dropdown (switch tasks)
      if (userAction === 'selected' && selectedProject) {
        if (originalProject) {
          await window.api.db.stopTracking()
        }
        await window.api.db.startTracking(selectedProject.id)
        window.api.hideTrayWindow()
        return
      }

      // Path 4: Edit text (create new task)
      if (inputValue.trim() && (userAction === 'edited' || !originalProject) && !selectedProject) {
        if (originalProject) {
          await window.api.db.stopTracking()
        }
        const newProject = await window.api.db.createProject(inputValue.trim())
        await window.api.db.startTracking(newProject.id)
        window.api.hideTrayWindow()
        return
      }
    } catch (error) {
      console.error('Failed to confirm:', error)
    }
  }

  const handleDeny = async (): Promise<void> => {
    try {
      // Path 2: Deny (stop tracking)
      await window.api.db.stopTracking()
      window.api.resetSchedulerTimer()
      window.api.hideTrayWindow()
    } catch (error) {
      console.error('Failed to deny:', error)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleConfirm()
    }
  }

  return (
    <div className="p-4">
      <div className="rounded-lg bg-background p-4 shadow-lg">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-medium">
              {originalProject ? 'Still working on this?' : 'What are you working on?'}
            </h1>
          </div>

          {/* Input field with dropdown */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onClick={handleInputClick}
              onKeyDown={handleInputKeyDown}
              placeholder="Type project name..."
              className="w-full pr-10 text-sm bg-input"
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

          {/* Confirmation buttons - ALWAYS visible */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleDeny} className="flex-1">
              Deny ⊘
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirm ✓
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-xs text-center text-muted-foreground">
            Selecting/editing changes task
          </p>
        </div>
      </div>

      {/* Dropdown list */}
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
                className="cursor-pointer px-4 py-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
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
