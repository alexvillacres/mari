import { useEffect } from 'react'
import { PromptView } from './components/tray/PromptView'
import { ReviewView } from './components/tray/ReviewView'

function TrayWindow(): React.JSX.Element {
  // Parse query parameters from URL
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') || 'review'
  const projectId = params.get('projectId') ? Number(params.get('projectId')) : undefined

  // Make body transparent for tray window
  useEffect(() => {
    document.body.style.backgroundColor = 'transparent'
    return () => {
      document.body.style.backgroundColor = ''
    }
  }, [])

  // Handle ESC key to close the tray window
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
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

  // Render the appropriate view based on query parameter
  return view === 'prompt' ? <PromptView projectId={projectId} /> : <ReviewView />
}

export default TrayWindow
