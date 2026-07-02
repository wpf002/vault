// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    tasks: [
      { title: 'Morning workout', time: '07:00', date: todayStr(), done: true },
      { title: 'Deep work block — proposal draft', time: '09:30', date: todayStr(), done: false },
      { title: 'Inbox zero pass', time: '13:00', date: todayStr(), done: false },
      { title: 'Evening review + plan tomorrow', time: '17:30', date: todayStr(), done: false },
    ],
  };
}
