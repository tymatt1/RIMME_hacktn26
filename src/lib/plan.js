export function buildTasks(intake) {
  const tasks = []
  if (intake.hospital) tasks.push({ id: 'discharge', label: 'Review the discharge plan together', detail: 'Ask the discharge planner about the care needed, timing, and paperwork.' })
  if (intake.needs.includes('memory')) tasks.push({ id: 'memory', label: 'Pack familiar photos and orientation aids', detail: 'Label photos with names and note which routines feel reassuring.' })
  if (intake.medicaid) tasks.push({ id: 'coverage', label: 'Prepare questions for the state Medicaid office', detail: 'Confirm current state requirements and which financial records may be needed.' })
  if (intake.needs.includes('medications')) tasks.push({ id: 'medications', label: 'Prepare a medication list for staff review', detail: 'Ask the care team to verify the list and pharmacy arrangements.' })
  if (intake.needs.includes('mobility')) tasks.push({ id: 'mobility', label: 'Discuss mobility support on your tour', detail: 'Ask about help with transfers, walking, and any equipment needs.' })
  if (intake.needs.includes('daily')) tasks.push({ id: 'daily', label: 'Discuss support for everyday activities', detail: 'Ask how staff help with bathing, dressing, eating, and personal preferences.' })
  return [...tasks,
    { id: 'tour', label: 'Visit and compare nursing homes', detail: 'Bring your questions and discuss what matters most to your loved one.' },
    { id: 'packing', label: 'Confirm what to bring on move-in day', detail: 'Ask the facility what it provides before buying supplies.' },
    { id: 'profile', label: 'Share a Know Me profile with the care team', detail: 'Include routines, favorite things, and what helps your loved one feel at home.' },
  ]
}
