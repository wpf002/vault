// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    alerts: [
      { hazard: 'Flash Flood', severity: 'warning', area: 'Riverside & low-lying roads', active: true },
      { hazard: 'High Wind', severity: 'watch', area: 'Countywide', active: true },
      { hazard: 'Winter Storm', severity: 'warning', area: 'Hill district', active: false },
    ],
    checkIns: [
      { name: 'Alvarez family', location: 'Roof, 214 River Rd', people: 4, needs: 'Boat evacuation, one elderly', status: 'assigned' },
      { name: 'M. Okafor', location: 'Stalled car, Route 9 underpass', people: 1, needs: 'Water rising, can walk', status: 'waiting' },
      { name: 'Bridge St apartments', location: '3rd floor common room', people: 12, needs: 'Food + medical check, stable', status: 'waiting' },
    ],
    teams: [
      { name: 'Swiftwater 1', members: 4, status: 'deployed', assignedTo: 'Alvarez family' },
      { name: 'Rescue 2', members: 6, status: 'available', assignedTo: '' },
      { name: 'Medic Unit B', members: 3, status: 'available', assignedTo: '' },
    ],
  };
}
