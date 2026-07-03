// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    legs: [
      { trip: 'Berlin Long Weekend', from: 'Amsterdam', to: 'Berlin', mode: 'train', km: 650 },
      { trip: 'Berlin Long Weekend', from: 'Berlin Hbf', to: 'Hotel', mode: 'bike_walk', km: 4 },
      { trip: 'Client Visit', from: 'Amsterdam', to: 'London', mode: 'flight', km: 360 },
      { trip: 'Client Visit', from: 'Heathrow', to: 'City Centre', mode: 'train', km: 25 },
      { trip: 'Coast Trip', from: 'Home', to: 'Zandvoort', mode: 'car', km: 30 },
    ],
  };
}
