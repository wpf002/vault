// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    boards: [
      {
        name: 'Sprint Brainstorm',
        strokes: [
          { points: '40,60 80,40 120,70 160,45 200,65', color: '#5eead4' },
          { points: '60,150 90,120 130,160 170,130', color: '#f5c451' },
        ],
        notes: [
          { x: 300, y: 40, text: 'Ship the onboarding fix first', color: '#f5c451' },
          { x: 300, y: 120, text: 'User interviews Thursday', color: '#5eead4' },
          { x: 460, y: 80, text: 'Cut scope on reports?', color: '#f0a5c0' },
        ],
      },
    ],
  };
}
