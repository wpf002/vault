// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. This is the restaurant-side book: tables,
// tonight's reservations, and the specials board diners see.
export function seedPreview() {
  return {
    tables: [
      { name: 'T1', seats: 2 },
      { name: 'T2', seats: 2 },
      { name: 'T3', seats: 4 },
      { name: 'T4', seats: 4 },
      { name: 'T5', seats: 6 },
    ],
    reservations: [
      { table: 'T3', name: 'Dana P.', party: 4, time: '18:30' },
      { table: 'T1', name: 'Lee M.', party: 2, time: '19:00' },
      { table: 'T5', name: 'Ravi K.', party: 5, time: '20:00' },
    ],
    specials: [
      { title: 'Happy Hour', detail: 'Half-price appetizers, 5–6 PM' },
      { title: "Chef's Tasting", detail: 'Five courses, $65 per person, Fri–Sat' },
    ],
  };
}
