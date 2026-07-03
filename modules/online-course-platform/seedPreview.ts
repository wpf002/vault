// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    courses: [
      {
        title: 'Practical Personal Finance',
        lessons: [
          { title: 'Why Budgets Fail', kind: 'reading', body: 'Most budgets fail because they are built for an ideal month, not a real one. Start from your last 3 months of actual spending, not your aspirations. Build the buffer in from day one.', question: '', options: [], answerIndex: 0, completed: true },
          { title: 'The 50/30/20 Baseline', kind: 'reading', body: 'Needs 50%, wants 30%, saving 20% — a starting grid, not a law. The point is knowing which bucket a dollar belongs to before you spend it.', question: '', options: [], answerIndex: 0, completed: true },
          { title: 'Checkpoint: Budget Basics', kind: 'quiz', body: '', question: 'Your rent is a…', options: ['Want', 'Need', 'Saving'], answerIndex: 1, completed: false },
          { title: 'Emergency Funds Done Right', kind: 'reading', body: 'Three to six months of essential expenses, boring account, no exceptions. It is insurance, not an investment — stop optimizing its yield.', question: '', options: [], answerIndex: 0, completed: false },
          { title: 'Final Check: Putting It Together', kind: 'quiz', body: '', question: 'An emergency fund should be measured in…', options: ['Months of expenses', 'A fixed $1,000', 'Percent of income'], answerIndex: 0, completed: false },
        ],
      },
    ],
  };
}
