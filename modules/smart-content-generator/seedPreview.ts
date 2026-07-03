// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. These are saved outputs from earlier runs —
// the generator itself always goes through the live AI proxy.
export function seedPreview() {
  return {
    saved: [
      {
        kind: 'summary',
        title: 'Q2 board update (summarized)',
        output: '• Revenue up 18% QoQ, driven by the annual-plan push\n• Churn steady at 2.1%; support backlog cleared\n• Two senior hires closed; engineering velocity recovering\n• Ask: approve the Q3 marketing budget increase',
      },
      {
        kind: 'outline',
        title: 'Blog post: "Why small tools win"',
        output: '1. Hook — the graveyard of all-in-one apps\n2. The case for one-job tools (focus, speed, price)\n3. Three examples that print money\n4. When a suite actually is better\n5. CTA — build the smallest thing that helps',
      },
    ],
  };
}
