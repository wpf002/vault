// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    projects: [
      {
        title: 'Zine: "Night Shift"',
        disciplines: ['illustration', 'writing'],
        summary: '16-page riso zine about the city after midnight. Looking for one more illustrator.',
        openRoles: ['Illustrator (2 spreads)'],
        collaborators: ['Mara (writing)', 'Deno (layout)'],
        status: 'open',
      },
      {
        title: 'EP cover + visualizer',
        disciplines: ['music', 'motion'],
        summary: 'Four-track ambient EP needs cover art and a 30s looping visualizer.',
        openRoles: ['Motion designer'],
        collaborators: ['Kai (music)'],
        status: 'open',
      },
      {
        title: 'Poetry × photography book',
        disciplines: ['photography', 'writing'],
        summary: 'Paired poems and photos, 40 pages. Fully staffed, in production.',
        openRoles: [],
        collaborators: ['June (poetry)', 'Alex (photo)', 'Sam (design)'],
        status: 'in-progress',
      },
    ],
  };
}
