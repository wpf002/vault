// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    profiles: [
      { name: 'Alex Rivera', trade: 'Electrician', region: 'North Side', rate: '$95/hr', verified: true, notes: 'Licensed, 12 years. Great with old wiring.' },
      { name: 'Sam Chen', trade: 'Electrician', region: 'Downtown', rate: '$110/hr', verified: true, notes: 'Commercial specialist, fast permits.' },
      { name: 'Jordan Diaz', trade: 'Electrician', region: 'West End', rate: '$80/hr', verified: false, notes: 'Newer to the area, references pending.' },
      { name: 'Morgan Lee', trade: 'Electrician', region: 'North Side', rate: '$105/hr', verified: true, notes: 'EV charger installs, solar tie-ins.' },
    ],
  };
}
