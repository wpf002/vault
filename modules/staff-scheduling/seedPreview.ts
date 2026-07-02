// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Shifts land in the current week so the grid
// looks alive without waiting on real time to pass.
function weekdayDate(dayIndex: number) {
  // dayIndex 0 = Monday of the current week
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  monday.setDate(monday.getDate() + dayIndex);
  return monday.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    shifts: [
      { person: 'Alex', date: weekdayDate(0), slot: 'morning', swapRequested: false },
      { person: 'Sam', date: weekdayDate(0), slot: 'evening', swapRequested: false },
      { person: 'Alex', date: weekdayDate(1), slot: 'morning', swapRequested: false },
      { person: 'Jo', date: weekdayDate(2), slot: 'morning', swapRequested: true },
      { person: 'Sam', date: weekdayDate(3), slot: 'evening', swapRequested: false },
      { person: 'Jo', date: weekdayDate(4), slot: 'morning', swapRequested: false },
      { person: 'Alex', date: weekdayDate(4), slot: 'evening', swapRequested: false },
    ],
  };
}
