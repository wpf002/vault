// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    notes: [
      {
        title: 'Standup notes',
        body: 'Ship the note-taker preview. Ask about the Q3 roadmap review.',
        tags: ['work'],
        createdAt: '2026-06-30T09:00:00.000Z',
      },
      {
        title: 'Book recs from Sam',
        body: 'The Design of Everyday Things, Shape Up.',
        tags: ['personal', 'reading'],
        createdAt: '2026-06-29T18:30:00.000Z',
      },
      {
        title: 'Launch checklist idea',
        body: 'Waitlist counts per module could double as a build-next signal.',
        tags: ['work', 'idea'],
        createdAt: '2026-06-28T14:15:00.000Z',
      },
    ],
  };
}
