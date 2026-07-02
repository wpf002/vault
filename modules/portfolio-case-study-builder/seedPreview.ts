// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    studies: [
      {
        title: 'Acme Co Rebrand',
        client: 'Acme Co',
        problem: 'A 20-year-old industrial brand that looked stuck in 2004 and was losing bids to younger competitors.',
        approach: 'Two-week discovery, three visual directions, iterative refinement with their sales team in the loop.',
        outcome: 'New identity across 40+ assets. Win rate on proposals up 18% in the first quarter after launch.',
        published: true,
      },
      {
        title: 'Northwind Onboarding Flow',
        client: 'Northwind LLC',
        problem: 'Trial users dropped off before reaching the core feature — activation sat at 22%.',
        approach: 'Session recordings, funnel analysis, then a rebuilt 3-step onboarding with progressive disclosure.',
        outcome: 'Activation up to 41% in six weeks.',
        published: false,
      },
    ],
  };
}
