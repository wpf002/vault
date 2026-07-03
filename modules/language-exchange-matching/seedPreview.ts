// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    profile: [{ speaks: 'English', learning: 'Spanish' }],
    partners: [
      { name: 'Lucía', speaks: 'Spanish', learning: 'English', timezone: 'GMT-3', minutes: 90 },
      { name: 'Mateo', speaks: 'Spanish', learning: 'French', timezone: 'GMT+1', minutes: 30 },
      { name: 'Akiko', speaks: 'Japanese', learning: 'English', timezone: 'GMT+9', minutes: 0 },
      { name: 'Diego', speaks: 'Spanish', learning: 'English', timezone: 'GMT-6', minutes: 45 },
    ],
    sessions: [
      { partner: 'Lucía', language: 'Spanish', minutes: 30, note: 'Ordering food, past tense drills' },
      { partner: 'Lucía', language: 'English', minutes: 30, note: 'Her turn — job interview practice' },
      { partner: 'Diego', language: 'Spanish', minutes: 45, note: 'Slang and soccer talk' },
      { partner: 'Lucía', language: 'Spanish', minutes: 30, note: 'Subjunctive, finally clicking' },
    ],
  };
}
