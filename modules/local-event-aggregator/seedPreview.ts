// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    events: [
      { title: 'Riverside Farmers Market', date: daysFromNow(1), venue: 'Riverside Park', category: 'Market', submittedBy: 'Parks Dept', approved: true, saved: true },
      { title: 'First Friday Art Walk', date: daysFromNow(3), venue: 'Downtown Gallery District', category: 'Arts', submittedBy: 'Gallery Guild', approved: true, saved: false },
      { title: 'Community Rec League Kickoff', date: daysFromNow(5), venue: 'Eastside Fields', category: 'Sports', submittedBy: 'Rec League', approved: true, saved: false },
      { title: 'Backyard Beekeeping 101', date: daysFromNow(8), venue: 'Public Library, Room B', category: 'Workshop', submittedBy: 'Bee Club', approved: false, saved: false },
      { title: 'Night Market & Food Trucks', date: daysFromNow(10), venue: 'Warehouse Row', category: 'Market', submittedBy: 'Anonymous', approved: false, saved: false },
    ],
  };
}
