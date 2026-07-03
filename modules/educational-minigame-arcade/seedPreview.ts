// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    highscores: [
      { game: 'math-sprint', best: 7, plays: 3 },
      { game: 'odd-one-out', best: 5, plays: 2 },
    ],
  };
}
