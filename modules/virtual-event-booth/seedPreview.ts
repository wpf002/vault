// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    booth: [
      {
        company: 'Fernwood Analytics',
        tagline: 'Dashboards your ops team will actually open',
        pitch: 'We turn messy warehouse data into a 5-minute morning readout. Setup in a week, no data team required.',
        offer: '🎁 Expo special: 3 months free onboarding for booths visitors',
        resources: [
          { title: 'One-Page Product Overview', kind: 'PDF' },
          { title: '3-Minute Demo Walkthrough', kind: 'Video' },
          { title: 'ROI Calculator', kind: 'Link' },
        ],
      },
    ],
    visitors: [
      { name: 'Grace Lin', company: 'Meridian Logistics', interest: 'hot', note: 'Wants a pilot for Q4 — send pricing today' },
      { name: 'Raj Patel', company: 'Coastal Foods', interest: 'warm', note: 'Comparing us with two others, follow up next week' },
      { name: 'Erin Doyle', company: 'Freelance consultant', interest: 'cold', note: 'Collecting vendor info for a client' },
    ],
  };
}
