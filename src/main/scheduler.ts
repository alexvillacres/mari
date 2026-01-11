import { powerMonitor } from 'electron'
import * as db from './database'

export class PromptScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private intervalMinutes: number = 1
  private lastPromptAt: Date | null = null
  private showPromptCallback: ((projectId: number) => void) | null = null

  constructor() {
    // Load last prompt time from database
    this.loadLastPromptTime()
    this.setupPowerMonitor()
  }

  /**
   * Load last prompt time from settings
   */
  private loadLastPromptTime(): void {
    try {
      const settings = db.getAllSettings()
      if (settings.lastPromptAt) {
        this.lastPromptAt = new Date(settings.lastPromptAt)
      }

      // Load interval from settings if available
      if (settings.promptIntervalMinutes) {
        this.intervalMinutes = parseInt(settings.promptIntervalMinutes, 10)
      }
    } catch (error) {
      console.error('Failed to load last prompt time:', error)
    }
  }

  /**
   * Set up power monitor to handle system sleep/wake
   */
  private setupPowerMonitor(): void {
    powerMonitor.on('resume', () => {
      console.log('System resumed from sleep')
      this.handleSystemResume()
    })

    powerMonitor.on('suspend', () => {
      console.log('System going to sleep')
    })
  }

  /**
   * Handle system resume from sleep
   */
  private handleSystemResume(): void {
    if (!this.lastPromptAt) {
      return
    }

    const now = new Date()
    const elapsedMinutes = (now.getTime() - this.lastPromptAt.getTime()) / (1000 * 60)

    // If enough time has passed, show prompt immediately
    if (elapsedMinutes >= this.intervalMinutes) {
      this.showPrompt()
    } else {
      // Restart timer with remaining time
      this.resetTimer()
    }
  }

  /**
   * Start the scheduler
   */
  public start(showPromptCallback: (projectId: number) => void): void {
    this.showPromptCallback = showPromptCallback

    // Calculate initial delay
    let initialDelay = this.intervalMinutes * 60 * 1000

    if (this.lastPromptAt) {
      const now = new Date()
      const elapsedMs = now.getTime() - this.lastPromptAt.getTime()
      const remainingMs = this.intervalMinutes * 60 * 1000 - elapsedMs

      if (remainingMs > 0) {
        initialDelay = remainingMs
      } else {
        // Time has already passed, show prompt soon
        initialDelay = 5000 // 5 seconds
      }
    }

    // Set initial timeout
    setTimeout(() => {
      this.showPrompt()
      // Then start regular interval
      this.intervalId = setInterval(
        () => {
          this.showPrompt()
        },
        this.intervalMinutes * 60 * 1000
      )
    }, initialDelay)

    console.log(`Scheduler started. Next prompt in ${Math.round(initialDelay / 1000)} seconds`)
  }

  /**
   * Show the prompt window
   */
  private showPrompt(): void {
    try {
      // Get active time entry
      const activeEntry = db.getActiveTimeEntry()

      if (!activeEntry) {
        console.log('No active time entry, skipping prompt')
        return
      }

      console.log('Showing prompt for project:', activeEntry.project_id)

      // Update last prompt time
      this.lastPromptAt = new Date()
      db.setSetting('lastPromptAt', this.lastPromptAt.toISOString())

      // Trigger callback to show window
      if (this.showPromptCallback) {
        this.showPromptCallback(activeEntry.project_id)
      }
    } catch (error) {
      console.error('Failed to show prompt:', error)
    }
  }

  /**
   * Reset the timer (called when user denies or confirms)
   */
  public resetTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Restart with full interval
    if (this.showPromptCallback) {
      this.intervalId = setInterval(
        () => {
          this.showPrompt()
        },
        this.intervalMinutes * 60 * 1000
      )

      console.log(`Timer reset. Next prompt in ${this.intervalMinutes} minutes`)
    }
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('Scheduler stopped')
  }

  /**
   * Update the interval duration
   */
  public setInterval(minutes: number): void {
    this.intervalMinutes = minutes
    db.setSetting('promptIntervalMinutes', String(minutes))

    // Restart with new interval
    this.resetTimer()
  }
}
