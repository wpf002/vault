// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    assets: [
      { name: 'Maple St. Duplex', type: 'real_estate', totalValueCents: 48000000, totalShares: 4800, ownedShares: 25, monthlyYieldPct: 0.55 },
      { name: 'Blue-Chip Print Series #14', type: 'art', totalValueCents: 9500000, totalShares: 950, ownedShares: 8, monthlyYieldPct: 0 },
      { name: 'Vintage Watch Collection', type: 'collectible', totalValueCents: 6200000, totalShares: 620, ownedShares: 12, monthlyYieldPct: 0 },
    ],
    distributions: [
      { asset: 'Maple St. Duplex', amountCents: 1375, note: 'Monthly rental distribution' },
      { asset: 'Maple St. Duplex', amountCents: 1375, note: 'Monthly rental distribution' },
    ],
  };
}
