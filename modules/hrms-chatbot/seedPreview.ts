// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    policies: [
      { title: 'PTO Policy', body: 'Full-time employees accrue 1.5 days of paid time off per month (18 days/year), capped at 27 days. Requests over 5 consecutive days need manager approval 2 weeks in advance. Unused PTO up to 5 days rolls over each January.' },
      { title: 'Remote Work', body: 'Hybrid by default: 2 office days per week (Tuesday and Thursday are anchor days). Fully remote weeks require manager sign-off. Working from another country needs HR approval at least 30 days ahead for tax reasons.' },
      { title: 'Expense Reimbursement', body: 'Submit expenses within 30 days with receipts. Meals during travel: up to $60/day. Home office stipend: $300/year. Anything over $500 needs pre-approval from your department head.' },
    ],
    chat: [
      { role: 'user', text: 'How many PTO days do I get?' },
      { role: 'assistant', text: 'You accrue 1.5 days per month — 18 days per year, capped at 27. Up to 5 unused days roll over each January. (Source: PTO Policy)' },
    ],
  };
}
