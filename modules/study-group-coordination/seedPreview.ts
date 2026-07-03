// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    members: [
      { name: 'You', focus: 'Practice exams' },
      { name: 'Priya', focus: 'Flashcards & recall' },
      { name: 'Marcus', focus: 'Concept explanations' },
      { name: 'Jen', focus: 'Past-paper walkthroughs' },
    ],
    sessions: [
      { topic: 'Unit 4 Review — Thermodynamics', date: daysFromNow(2), time: '18:30', location: 'Library Room 204', attending: ['You', 'Priya', 'Marcus'] },
      { topic: 'Mock Exam Under Timed Conditions', date: daysFromNow(6), time: '10:00', location: 'Student Center', attending: ['You', 'Jen'] },
      { topic: 'Final Cram — Weak Areas Only', date: daysFromNow(11), time: '17:00', location: 'Video Call', attending: ['You', 'Priya', 'Marcus', 'Jen'] },
    ],
    resources: [
      { title: 'Professor’s Practice Problem Set (Ch. 7–9)', kind: 'PDF', sharedBy: 'Marcus' },
      { title: '2024 & 2025 Past Exams with Solutions', kind: 'Link', sharedBy: 'Jen' },
      { title: 'Shared Formula Sheet — Living Doc', kind: 'Doc', sharedBy: 'You' },
    ],
  };
}
