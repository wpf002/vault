// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    programs: [
      { name: 'HostingCo', clicks: 1840, conversions: 62, payoutCents: 186000, paid: true },
      { name: 'DesignTool Pro', clicks: 3200, conversions: 148, payoutCents: 221000, paid: false },
      { name: 'CourseHub', clicks: 940, conversions: 19, payoutCents: 47500, paid: false },
      { name: 'GearShop', clicks: 560, conversions: 8, payoutCents: 12800, paid: true },
    ],
  };
}
