// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    articles: [
      { title: 'Chip startup claims 2x efficiency gain on inference workloads', source: 'TechWire', topic: 'tech', url: 'techwire.example/chips', saved: false, read: false },
      { title: 'City council approves new bike-lane network downtown', source: 'Local Ledger', topic: 'local', url: 'ledger.example/bikes', saved: true, read: false },
      { title: 'Fed holds rates steady, signals patience through Q3', source: 'MarketDesk', topic: 'finance', url: 'marketdesk.example/fed', saved: false, read: true },
      { title: 'Open-source robotics kit passes 10k contributors', source: 'TechWire', topic: 'tech', url: 'techwire.example/robots', saved: true, read: false },
      { title: 'Farmers market expands to twice weekly this summer', source: 'Local Ledger', topic: 'local', url: 'ledger.example/market', saved: false, read: false },
    ],
  };
}
