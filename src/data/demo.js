// Fictional fixtures only. Replace with sourced CMS records through a backend.
export const facilities = [
  { id: 'demo-a', name: 'Example nursing home A', setting: 'Residential neighborhood', staffing: '3.8', inspection: '2', rooms: 'Private and shared', note: 'Ask how staff coordinate discharge follow-ups.' },
  { id: 'demo-b', name: 'Example nursing home B', setting: 'Near a hospital campus', staffing: '4.1', inspection: '3', rooms: 'Shared', note: 'Ask how the team supports familiar daily routines.' },
]

export const needs = [
  { id: 'mobility', label: 'Moving around', detail: 'Walking, transfers, or getting out of bed' },
  { id: 'medications', label: 'Medications', detail: 'Keeping track of a daily medication routine' },
  { id: 'memory', label: 'Memory & orientation', detail: 'Familiar faces, places, and routines' },
  { id: 'daily', label: 'Everyday activities', detail: 'Bathing, dressing, or eating' },
]

export const initialIntake = { hospital: true, medicaid: false, needs: ['mobility', 'medications'] }
