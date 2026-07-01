// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    history: [
      { category: 'length', value: 5, from: 'km', to: 'mi', result: 3.106856, at: '2026-06-28T09:00:00.000Z' },
      { category: 'temperature', value: 100, from: 'C', to: 'F', result: 212, at: '2026-06-29T14:30:00.000Z' },
    ],
  };
}
