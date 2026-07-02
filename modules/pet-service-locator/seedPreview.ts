// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    providers: [
      { name: 'Pawfect Grooming', kind: 'groomer', area: 'North Side', phone: '555-0142', rating: 5, notes: 'Great with anxious dogs' },
      { name: 'Happy Tails Training', kind: 'trainer', area: 'Downtown', phone: '555-0179', rating: 4, notes: 'Group classes on Saturdays' },
      { name: 'Cozy Paws Sitting', kind: 'sitter', area: 'North Side', phone: '555-0113', rating: 5, notes: 'Overnight stays, sends photo updates' },
      { name: 'Bark Avenue Spa', kind: 'groomer', area: 'West End', phone: '555-0161', rating: 3, notes: 'Walk-ins OK, cash discount' },
    ],
  };
}
