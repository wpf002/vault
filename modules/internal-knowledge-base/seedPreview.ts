// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    articles: [
      {
        title: 'How to Deploy',
        body: '1. Merge to main.\n2. CI builds and pushes the image.\n3. Railway auto-deploys. Watch #deploys for the green check.',
        category: 'Engineering',
        updatedAt: '2026-06-28T11:00:00.000Z',
      },
      {
        title: 'Expense Policy',
        body: 'Anything under $50 doesn\'t need pre-approval. Software subscriptions go through the ops team first.',
        category: 'Operations',
        updatedAt: '2026-06-25T09:00:00.000Z',
      },
      {
        title: 'Onboarding Checklist',
        body: 'Laptop, accounts (email, Slack, GitHub), intro meetings with each team lead, first-week starter task.',
        category: 'People',
        updatedAt: '2026-07-01T16:20:00.000Z',
      },
    ],
  };
}
