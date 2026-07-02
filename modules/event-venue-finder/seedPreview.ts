// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    venues: [
      { name: 'The Glasshouse', capacity: 150, rateCents: 250000, region: 'Downtown', bookedDates: [daysFromNow(6), daysFromNow(13)] },
      { name: 'Harbor Hall', capacity: 300, rateCents: 480000, region: 'Waterfront', bookedDates: [daysFromNow(6)] },
      { name: 'Studio North', capacity: 60, rateCents: 90000, region: 'North Side', bookedDates: [] },
      { name: 'The Archive', capacity: 120, rateCents: 180000, region: 'Downtown', bookedDates: [daysFromNow(20)] },
    ],
  };
}
