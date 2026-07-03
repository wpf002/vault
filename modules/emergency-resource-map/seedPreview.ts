// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    resources: [
      { name: 'Lincoln High Gym', type: 'shelter', gridX: 2, gridY: 3, status: 'open', capacity: 250, occupancy: 112 },
      { name: 'Riverside Church Hall', type: 'shelter', gridX: 7, gridY: 2, status: 'full', capacity: 80, occupancy: 80 },
      { name: 'Fairgrounds Water Point', type: 'water', gridX: 5, gridY: 6, status: 'open', capacity: 0, occupancy: 0 },
      { name: 'Mobile Medical Unit 3', type: 'medical', gridX: 3, gridY: 7, status: 'open', capacity: 40, occupancy: 15 },
      { name: 'Food Bank North Depot', type: 'food', gridX: 8, gridY: 8, status: 'open', capacity: 0, occupancy: 0 },
      { name: 'Library Charging Station', type: 'charging', gridX: 1, gridY: 8, status: 'closed', capacity: 0, occupancy: 0 },
    ],
  };
}
