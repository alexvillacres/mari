import { useState, useEffect } from 'react'
import { Combobox, type ComboboxOption } from '@renderer/components/ui/combobox'

const options: ComboboxOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4' },
  { value: 'option5', label: 'Option 5' }
]

function TrayWindow(): React.JSX.Element {
  const [value, setValue] = useState<string>('')

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
    <div className="flex w-full flex-col bg-muted p-4">
      <div className="w-full space-y-2">
        <h1 className="text-sm font-medium">What are you working on?</h1>
        <Combobox
          options={options}
          value={value}
          onValueChange={setValue}
          placeholder="Select an option..."
          searchPlaceholder="Search options..."
        />
        {value && (
          <p className="text-sm text-muted-foreground">
            Selected: {options.find((opt) => opt.value === value)?.label}
          </p>
        )}
      </div>
    </div>
  )
}

export default TrayWindow
