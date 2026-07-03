// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    subs: [
      { vendor: 'Figma', plan: 'Professional ×4 seats', monthlyCents: 4800, category: 'Design', verdict: 'keep' },
      { vendor: 'Notion', plan: 'Plus ×6 seats', monthlyCents: 6000, category: 'Productivity', verdict: 'keep' },
      { vendor: 'Zoom', plan: 'Pro', monthlyCents: 1599, category: 'Meetings', verdict: 'pending' },
      { vendor: 'Old CRM (legacy)', plan: 'Starter', monthlyCents: 2900, category: 'Sales', verdict: 'cancel' },
      { vendor: 'Stock photo service', plan: 'Annual (per month)', monthlyCents: 2400, category: 'Design', verdict: 'pending' },
    ],
  };
}
