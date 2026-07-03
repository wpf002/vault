// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    event: [{ name: 'Product Summit 2026', date: daysFromNow(21), venue: 'Harborview Hall', virtualLink: 'summit.example.com/live' }],
    sessions: [
      { title: 'Opening Keynote', time: '09:00', format: 'hybrid', speaker: 'CEO', inPersonSeats: 300, virtualSeats: 2000 },
      { title: 'Hands-On Workshop: New API', time: '10:30', format: 'in_person', speaker: 'DevRel team', inPersonSeats: 40, virtualSeats: 0 },
      { title: 'Remote Customer Panel', time: '13:00', format: 'virtual', speaker: '4 customers', inPersonSeats: 0, virtualSeats: 1500 },
      { title: 'Roadmap AMA', time: '15:00', format: 'hybrid', speaker: 'Product leads', inPersonSeats: 300, virtualSeats: 2000 },
    ],
    tasks: [
      { task: 'Confirm AV vendor + stage plot', track: 'venue', done: true },
      { task: 'Test stream encoder end to end', track: 'broadcast', done: true },
      { task: 'Print badges + signage', track: 'venue', done: false },
      { task: 'Load captions service for keynote', track: 'broadcast', done: false },
      { task: 'Rehearsal: hybrid Q&A handoff', track: 'both', done: false },
    ],
  };
}
