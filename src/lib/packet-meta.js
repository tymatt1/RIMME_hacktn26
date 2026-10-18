// What is in the move-in packet. Kept apart from the PDF builders so the screen can list it without loading them.
export const packetFiles = [
  { id: 'plan', title: 'Transition plan', description: 'Your answers, checklist, packing progress, saved homes and Know Me profile, for your own records.' },
  { id: 'handoff', title: 'Resident information for the nursing home', description: 'A short sheet to hand to the home: who they are, what help they need, what helps them feel at home, and blanks for the care team.' },
  { id: 'know-me', title: 'Know Me profile', description: 'Routines and what comforts them, for staff to read before move-in.' },
  { id: 'checklist', title: 'Move-in checklist and packing list', description: 'A printable list with boxes to tick for tasks, documents and packing.' },
  { id: 'questions', title: 'Questions to ask', description: 'Questions for the care team and for each nursing home you call or visit.' },
  { id: 'comparison', title: 'Nursing home comparison', description: 'Your saved homes side by side.' },
]

export const packetUnavailableReason = (id, data = {}) => (id === 'comparison' && (data.facilities || []).length < 2 ? 'Save at least two nursing homes to include this.' : '')

export const packetListing = (data = {}) => packetFiles.map((file) => {
  const unavailableReason = packetUnavailableReason(file.id, data)
  return { ...file, available: !unavailableReason, unavailableReason }
})
