// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    reviews: [
      { author: 'Dana P., Acme Co', rating: 5, text: 'Turned our messy books into something we actually understand. Worth every dollar.', featured: true, status: 'received' },
      { author: 'Lee M.', rating: 4, text: 'Fast turnaround and clear communication throughout the project.', featured: false, status: 'received' },
      { author: 'Ravi K., Globex', rating: 5, text: 'The best contractor we have worked with this year, full stop.', featured: true, status: 'received' },
      { author: 'Sam T.', rating: 0, text: '', featured: false, status: 'requested' },
    ],
  };
}
