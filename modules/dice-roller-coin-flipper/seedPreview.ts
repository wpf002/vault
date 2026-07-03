// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    presets: [
      { name: 'D&D Attack Roll', notation: '1d20+5' },
      { name: 'Fireball Damage', notation: '8d6' },
      { name: 'Yahtzee Hand', notation: '5d6' },
      { name: 'Settle an Argument', notation: '1d2' },
    ],
  };
}
