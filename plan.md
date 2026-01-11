# Mari Time Tracker Implementation Plan

## Overview

Mari is a passive time-tracking menu bar application that helps users understand how they spend their time through periodic prompts instead that a user will confirm or deny and so you're time tracking becomes an effortless day of "yes, I was working on this", "no, I was not", or "here is this new task I've been working on"

## Core Philosophy

Rather than requiring manual start/stop timers, the app:

- Runs quietly in the background
- Periodically asks what you're working on (every 15 minutes)
- Only prompts when activity is detected
- Organizes entries by Project and Task
- Access point is Menu Bar Icon click + automatic prompt

## MVP Features

- Activity Log for the day that displays what you've worked on. Ability to edit a time entry, add a time entry, or delete a time entry.
- Time prompt tray with the ability to confirm, deny, or create a new task.

## Target Users

- Freelancers tracking billable hours
- Developers analyzing time distribution
- Anyone wanting passive, non-intrusive time tracking

## User Flow for interval tracking

This flow revolves around the Tray. This cannot be user activated, only from the interval.

1. App runs in system tray
2. Every 15 minutes (adjustable in future versions) prompt appears
   - If new user: Prompt tray shows an empty input where a user can type in the task they're working on.
   - If existing user: The prompt tray will be exactly the same with the input pre-filled (with the most recent task worked on). From here a user will either:
     - Confirm that that is the task being worked on (Click "confirm") -> Close tray and don't record any time
     - Wasn't working on anything worth tracking (Click "deny")
     - Started working on something new -> They start typing in the input (or hit the drop down) to either, (A) Create a new task via the input, or (B) Select an already created input from the drop down. (Drop down will have an autocomplete)
3. Entry saves to database

## User Flow for manual tracking (For reviewing time and adjusting the log)

This is accessible at any point via the Menu Bar Icon. A time sheet of their day will popup within a Tray (Or Window, I haven't decided what the best UX will be). and they can see what they've worked on today, add a time entry, adjust times, and delete times.

## Future features

- Projects as a parent entity to the Task
- Idle calculations (If a user is idle for a period of time, subtract that time)
- Settings where a user can adjust time blocks for when Mari runs
- Export feature JSON and CSV
  - (Even later feature) Invoice generation

## Tech Stack

- Electron with electron-builder
- React + TypeScript
- SQLite via better-sqlite3 (or electron-store if you prefer JSON)
- Tray API for prompts
- Tailwind & Shadcn

## Data Model (MVP)

- **Task**: id, name
- **TimeEntry**: id, taskId, startTime, endTime
