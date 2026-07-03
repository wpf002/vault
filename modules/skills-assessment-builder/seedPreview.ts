// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    assessments: [
      {
        title: 'Frontend Developer Competency Review',
        competencies: [
          { name: 'JavaScript Fundamentals', weight: 3 },
          { name: 'Component Architecture', weight: 2 },
          { name: 'Accessibility', weight: 2 },
          { name: 'Communication', weight: 1 },
        ],
      },
    ],
    evaluations: [
      { assessmentTitle: 'Frontend Developer Competency Review', candidate: 'Jordan P.', scores: [4, 3, 2, 5] },
      { assessmentTitle: 'Frontend Developer Competency Review', candidate: 'Sam K.', scores: [5, 4, 4, 3] },
      { assessmentTitle: 'Frontend Developer Competency Review', candidate: 'Riley M.', scores: [3, 3, 4, 4] },
    ],
  };
}
