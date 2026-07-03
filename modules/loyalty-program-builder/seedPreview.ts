// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    programs: [
      { name: 'Coffee Card', reward: 'Free drink of any size', punchesRequired: 8 },
      { name: 'Lunch Club', reward: '50% off a sandwich combo', punchesRequired: 5 },
    ],
    cards: [
      { customer: 'Maya R.', program: 'Coffee Card', punches: 7, redeemed: 2 },
      { customer: 'Tom B.', program: 'Coffee Card', punches: 3, redeemed: 0 },
      { customer: 'Aisha K.', program: 'Lunch Club', punches: 5, redeemed: 1 },
      { customer: 'Leo V.', program: 'Coffee Card', punches: 1, redeemed: 4 },
    ],
  };
}
