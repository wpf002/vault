// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    quotes: [
      { project: 'Roof replacement', vendor: 'Summit Roofing', priceCents: 1450000, timeline: '2 weeks', warranty: '25 yr', notes: 'Includes tear-off and disposal' },
      { project: 'Roof replacement', vendor: 'Apex Contractors', priceCents: 1280000, timeline: '3 weeks', warranty: '20 yr', notes: 'Subcontracts the gutter work' },
      { project: 'Roof replacement', vendor: 'HomeShield', priceCents: 1615000, timeline: '10 days', warranty: '30 yr', notes: 'Premium shingles, best reviews' },
      { project: 'Lawn care (seasonal)', vendor: 'GreenScape', priceCents: 240000, timeline: 'Apr–Oct', warranty: '—', notes: 'Weekly mow + two fertilizer rounds' },
    ],
  };
}
