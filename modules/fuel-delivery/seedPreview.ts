// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    vehicles: [
      { label: 'Work Truck (F-250)', fuelType: 'diesel', address: 'Jobsite — 40 Quarry Rd' },
      { label: 'Family SUV', fuelType: 'gas', address: 'Home driveway' },
      { label: 'Generator (backup)', fuelType: 'diesel', address: 'Warehouse dock B' },
    ],
    orders: [
      { vehicle: 'Work Truck (F-250)', fuelType: 'diesel', gallons: 25, priceCentsPerGal: 419, status: 'delivering', address: 'Jobsite — 40 Quarry Rd' },
      { vehicle: 'Family SUV', fuelType: 'gas', gallons: 14, priceCentsPerGal: 349, status: 'completed', address: 'Home driveway' },
    ],
  };
}
