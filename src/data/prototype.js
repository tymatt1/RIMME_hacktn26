/**
 * Carebridge prototype content. Every person, facility, rating, and metric here
 * is invented for the interactive demo. This module makes no live requests.
 */

export const demoNotice = {
  short: 'Interactive demo · fictional people and facilities',
  facilities: 'These are invented facilities with example data. They are not real care options, verified ratings, or availability listings.',
  account: 'Use made-up details. This preview does not create a real account.',
  plan: 'A starting point for a conversation with your family and care team.',
};

export const sampleIntake = {
  caregiverName: 'Maria',
  personName: 'Arthur',
  relationship: 'Grandparent',
  age: 84,
  ageRange: '75–84',
  currentSetting: 'Hospital',
  reasons: ['Recent hospital stay', 'Daily activities getting harder'],
  timing: 'In 3 days',
  stayType: 'Short recovery stay',
  professionalRecommendation: 'Not sure',
  recommendedSetting: 'Not sure of the name',
  dischargeKnown: 'Not yet',
  dischargeDate: '',
  hospitalStatus: 'Not sure',
  mobility: ['Cane or walker'],
  transferHelp: 'Some help',
  dailySupport: {
    bathing: 'Some help',
    dressing: 'Some help',
    toileting: 'Not sure',
    eating: 'No help',
    medicines: 'Some help',
  },
  memorySupport: 'Reminders help',
  communication: ['Glasses', 'Larger text'],
  language: 'English',
  knownServices: ['Not sure'],
  searchLocation: 'Nashville, TN',
  travelMiles: 15,
  monthlyBudget: null,
  coverage: ['Not sure'],
  priorities: ['Close to family', 'Staffing', 'Inspection information', 'Costs & coverage'],
  rehabilitationPreference: 'Not sure',
  roomPreference: 'Not sure',
  facilityPreferences: [],
  additionalPriorities: ['Rehabilitation services'],
  coordinators: 'Several relatives',
  familySupport: ['Calls', 'Transportation', 'Packing'],
};

export const facilities = [
  {
    id: 'cedar-grove',
    name: 'Cedar Grove Care House',
    location: 'North Nashville · demo location',
    distance: 4.2,
    staffingHours: 4.1,
    inspectionLabel: 'Example: no major findings in the sample report',
    inspectionTone: 'neutral',
    provides: ['Short recovery stays', 'Daily living support', 'Rehabilitation services'],
    languages: ['English', 'Spanish'],
    roomOptions: ['Shared room', 'Private room'],
    coverageLabel: 'Coverage and costs need confirmation',
    availabilityLabel: 'Bed availability not verified',
    description: 'This example home has shared gardens and spaces for family visits.',
    highlights: ['Within a 15-mile example radius', 'Sample rehabilitation program', 'Example family meeting space'],
    questions: ['Can your team support the needs we have listed?', 'What does a typical day look like during a recovery stay?', 'How can our family stay involved?'],
    inspectionNote: 'This invented report is provided only to demonstrate the details panel. It does not describe a real inspection.',
    isFictional: true,
  },
  {
    id: 'willow-bend',
    name: 'Willow Bend Recovery & Care',
    location: 'West Nashville · demo location',
    distance: 7.8,
    staffingHours: 3.9,
    inspectionLabel: 'Example: follow-up items shown in the sample report',
    inspectionTone: 'neutral',
    provides: ['Short recovery stays', 'Longer-term stays', 'Rehabilitation services'],
    languages: ['English'],
    roomOptions: ['Shared room', 'Private room'],
    coverageLabel: 'Coverage and costs need confirmation',
    availabilityLabel: 'Bed availability not verified',
    description: 'This example recovery home has an activity room and a quiet family lounge.',
    highlights: ['Within a 15-mile example radius', 'Example private room option', 'Sample activity program'],
    questions: ['What support is available on evenings and weekends?', 'How are recovery goals discussed with residents?', 'What should we ask about the sample follow-up items?'],
    inspectionNote: 'The follow-up items and staffing hours are fictional. In a real service, this area would show dated, verified source information.',
    isFictional: true,
  },
  {
    id: 'magnolia-court',
    name: 'Magnolia Court Living',
    location: 'East Nashville · demo location',
    distance: 5.6,
    staffingHours: 3.4,
    inspectionLabel: 'Example: a concern to discuss in the sample report',
    inspectionTone: 'attention',
    provides: ['Longer-term stays', 'Daily living support', 'Memory support'],
    languages: ['English', 'Spanish'],
    roomOptions: ['Shared room'],
    coverageLabel: 'Coverage and costs need confirmation',
    availabilityLabel: 'Bed availability not verified',
    description: 'This example home has smaller gathering spaces and provides daily living and memory support.',
    highlights: ['Within a 15-mile example radius', 'Sample memory support program', 'Example shared room option'],
    questions: ['How do you learn about each person’s routines and preferences?', 'What support can you provide for memory and orientation?', 'What would you explain about a concern in an inspection report?'],
    inspectionNote: 'A fabricated concern appears here to demonstrate how a family could explore questions. It is not a finding about a real provider.',
    isFictional: true,
  },
  {
    id: 'riverlight',
    name: 'Riverlight Care & Recovery',
    location: 'South Nashville · demo location',
    distance: 11.3,
    staffingHours: 3.7,
    inspectionLabel: 'Example: no major findings in the sample report',
    inspectionTone: 'neutral',
    provides: ['Short recovery stays', 'Longer-term stays', 'Daily living support'],
    languages: ['English', 'Arabic'],
    roomOptions: ['Shared room', 'Private room'],
    coverageLabel: 'Coverage and costs need confirmation',
    availabilityLabel: 'Bed availability not verified',
    description: 'This example home has an accessible courtyard and space for family gatherings.',
    highlights: ['Within a 15-mile example radius', 'Example courtyard and family spaces', 'Sample longer-term stay option'],
    questions: ['How are families included in the arrival plan?', 'Which personal items can a resident bring?', 'Who is the main contact for questions after move-in?'],
    inspectionNote: 'All report details and metrics are made up for this prototype. A real facility comparison would require verified data and current context.',
    isFictional: true,
  },
];

export const facilityMetricNote = 'Staffing hours and distances are invented examples, not verified measurements. Staffing hours illustrate an average per resident per day; they do not promise an individual amount of care.';

export const careQuestions = {
  general: [
    'What type of setting could support the needs we described?',
    'Which needs should we clarify before calling facilities?',
    'Which decisions need to be made before discharge or move-in?',
  ],
  hospital: [
    'What is the proposed discharge date, and how certain is it?',
    'Who can explain the recommended next setting and services?',
    'What records and handoff information will the next care team receive?',
    'Who can help us confirm coverage, expected costs, and any authorization requirements?',
  ],
  home: [
    'What support is already helping at home?',
    'Which changes have made daily life harder recently?',
    'Who can help us understand the available care options?',
  ],
  facility: [
    'Can you review our needs with us and explain what you can provide?',
    'Do you have a suitable opening for the dates we are considering?',
    'What is included in the cost, and what might be charged separately?',
    'How do residents and families raise concerns or ask for updates?',
  ],
};

export const planTasks = [
  { id: 'care-team', title: 'Talk through the next step', description: 'Ask the current care team to explain the setting and support they recommend.', group: 'Getting ready', timing: 'Start here', owner: 'You', contexts: ['all'] },
  { id: 'discharge-date', title: 'Confirm the discharge timeline', description: 'Ask the discharge planner about timing and who to contact if plans change.', group: 'Getting ready', timing: 'Before choosing', owner: 'You', contexts: ['Hospital'] },
  { id: 'family-priorities', title: 'Share your family’s priorities', description: 'Use your answers to agree on the most important questions and preferences.', group: 'Getting ready', timing: 'Start here', owner: 'Family', contexts: ['all'] },
  { id: 'facility-calls', title: 'Call your shortlisted facilities', description: 'Confirm openings and ask whether the team can support the needs you described.', group: 'Choosing a place', timing: 'Before choosing', owner: 'You', contexts: ['all'] },
  { id: 'coverage', title: 'Ask about coverage and costs', description: 'Speak with the insurer or benefits contact and the facility about your situation.', group: 'Choosing a place', timing: 'Before choosing', owner: 'Unassigned', contexts: ['all'] },
  { id: 'visit', title: 'Arrange a visit or conversation', description: 'Ask about an in-person or video tour and include the person moving when possible.', group: 'Choosing a place', timing: 'Before choosing', owner: 'Family', contexts: ['all'] },
  { id: 'handoff', title: 'Confirm the care handoff', description: 'Ask the current and receiving care teams what records and instructions they will share.', group: 'Move-in essentials', timing: 'Before arrival', owner: 'Unassigned', contexts: ['all'] },
  { id: 'transport', title: 'Arrange suitable transportation', description: 'Ask the care team and facility what arrival arrangements are needed.', group: 'Move-in essentials', timing: 'Before arrival', owner: 'Family', contexts: ['all'] },
  { id: 'packing', title: 'Check what to bring', description: 'Confirm the facility’s packing guidance, then gather familiar items, clothes, and daily essentials.', group: 'Move-in essentials', timing: 'Before arrival', owner: 'Family', contexts: ['all'] },
  { id: 'know-me', title: 'Make a “Know Me” profile', description: 'Add the routines, people, and small comforts that help this person feel at home.', group: 'Feeling at home', timing: 'Together', owner: 'Family', contexts: ['all'] },
  { id: 'contact', title: 'Choose a main family contact', description: 'Agree on who will coordinate questions and share updates, with the resident’s wishes in mind.', group: 'Feeling at home', timing: 'Before arrival', owner: 'Family', contexts: ['all'] },
];

export const knowMePrompts = [
  { id: 'preferredName', label: 'I like to be called', type: 'shortText', placeholder: 'A first name or nickname' },
  { id: 'morning', label: 'My morning routine', type: 'singleChoice', choices: ['Early riser', 'Slow start', 'Varies day to day', 'Still learning'] },
  { id: 'interests', label: 'Things I enjoy', type: 'multiChoice', choices: ['Music', 'Gardening', 'Reading', 'Games', 'Sports', 'Time outdoors', 'Faith or reflection', 'Being with family'] },
  { id: 'comforts', label: 'What helps me feel comfortable', type: 'multiChoice', choices: ['A familiar blanket', 'Family photos', 'Favorite music', 'A quiet space', 'Knowing the plan', 'A familiar visitor'] },
  { id: 'communication', label: 'How to make conversation easier', type: 'multiChoice', choices: ['Face me when speaking', 'Give me time to respond', 'Use larger print', 'Reduce background noise', 'Check that I have my glasses or hearing aids'] },
  { id: 'notes', label: 'Other things staff should know', type: 'optionalText', placeholder: 'A routine or preference that staff should know about' },
];

export function buildCareSummary(intake = {}) {
  const name = intake.personName?.trim() || 'Your family member';
  const currentSetting = intake.currentSetting || 'Not yet selected';
  const priorities = Array.isArray(intake.priorities) ? intake.priorities : [];
  const hospital = currentSetting === 'Hospital';
  const dailySupport = Object.entries(intake.dailySupport || {})
    .filter(([, level]) => level === 'Some help' || level === 'Substantial help')
    .map(([activity]) => ({ bathing: 'bathing', dressing: 'getting dressed', toileting: 'using the bathroom', eating: 'eating', medicines: 'taking medicines' })[activity] || activity);

  return {
    title: `A starting point for ${name}`,
    intro: 'Review the needs and preferences you recorded before contacting nursing homes.',
    facts: [
      { label: 'Current setting', value: currentSetting },
      { label: 'Timing', value: intake.timing || 'Still exploring' },
      { label: 'Stay preference', value: intake.stayType || 'Not sure yet' },
      { label: 'Search area', value: intake.searchLocation || 'Not yet selected' },
    ],
    supportSummary: dailySupport.length
      ? `You recorded a need for help with ${dailySupport.join(', ')}. Ask the care team what support the nursing home would need to provide.`
      : 'You haven’t recorded specific daily support needs. You can update the intake after speaking with the care team.',
    prioritiesSummary: priorities.length
      ? `Your top priorities, in order: ${priorities.slice(0, 3).map((item, index) => `${index + 1}. ${item.toLowerCase()}`).join('; ')}.${typeof intake.monthlyBudget === 'number' ? ` Monthly out-of-pocket budget: $${intake.monthlyBudget.toLocaleString('en-US')}.` : ''}`
      : `Rank your priorities to help guide conversations.${typeof intake.monthlyBudget === 'number' ? ` Monthly out-of-pocket budget: $${intake.monthlyBudget.toLocaleString('en-US')}.` : ''}`,
    questions: [...careQuestions.general, ...(hospital ? careQuestions.hospital : careQuestions.home)],
    note: 'This summary reflects the answers in the demo. It does not determine eligibility, coverage, or the right level of care.',
  };
}

export function getPlanTasks(currentSetting) {
  return planTasks.filter((task) => task.contexts.includes('all') || task.contexts.includes(currentSetting));
}
