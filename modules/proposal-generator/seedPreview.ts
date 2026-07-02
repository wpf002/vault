// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    templates: [
      {
        name: 'Web Project Proposal',
        body: 'Dear {{client}},\n\nThank you for the opportunity to work on {{project}}. Based on our conversation, we propose a total investment of {{price}} with delivery by {{deadline}}.\n\nScope includes design, development, and two rounds of revisions.\n\nBest,\n{{sender}}',
      },
      {
        name: 'Retainer Pitch',
        body: 'Hi {{client}},\n\nFor ongoing support of {{project}}, we offer a monthly retainer of {{price}}. This covers priority turnaround, maintenance, and a monthly strategy call.\n\nStarting {{deadline}}.\n\n— {{sender}}',
      },
    ],
  };
}
