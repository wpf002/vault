// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    holdings: [
      { name: 'S&P 500 Index Fund', ticker: 'VOO', assetClass: 'Stocks', quantity: 12, costBasisCents: 486000, currentPriceCents: 43850 },
      { name: 'Total Bond Market', ticker: 'BND', assetClass: 'Bonds', quantity: 40, costBasisCents: 296000, currentPriceCents: 7280 },
      { name: 'Bitcoin', ticker: 'BTC', assetClass: 'Crypto', quantity: 0.05, costBasisCents: 290000, currentPriceCents: 6480000 },
      { name: 'REIT Index Fund', ticker: 'VNQ', assetClass: 'Real Estate', quantity: 15, costBasisCents: 128000, currentPriceCents: 8940 },
    ],
  };
}
