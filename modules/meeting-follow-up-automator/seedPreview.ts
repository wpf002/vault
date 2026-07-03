// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Action items extracted in earlier runs — the
// extraction itself always goes through the live AI proxy.
export function seedPreview() {
  return {
    actions: [
      { meeting: 'Product sync — June 30', owner: 'Sam', task: 'Ship the onboarding fix behind a flag', due: 'Friday', done: true },
      { meeting: 'Product sync — June 30', owner: 'Priya', task: 'Draft the pricing-page A/B variants', due: 'next sprint', done: false },
      { meeting: 'Product sync — June 30', owner: 'Marcus', task: 'Follow up with legal on the DPA template', due: 'this week', done: false },
      { meeting: 'Client kickoff — Meridian', owner: 'You', task: 'Send the signed SOW and kickoff deck', due: 'tomorrow', done: false },
    ],
  };
}
