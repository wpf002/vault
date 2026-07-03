// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    settings: [{ protocol: 'keto', carbLimitG: 25, proteinTargetG: 120, fatTargetG: 140 }],
    entries: [
      { date: todayStr(), food: 'Eggs & avocado', carbsG: 4, proteinG: 18, fatG: 32 },
      { date: todayStr(), food: 'Grilled chicken salad', carbsG: 8, proteinG: 42, fatG: 22 },
      { date: todayStr(), food: 'Macadamia nuts (handful)', carbsG: 4, proteinG: 2, fatG: 21 },
    ],
  };
}
