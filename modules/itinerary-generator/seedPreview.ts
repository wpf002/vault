// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    itineraries: [
      {
        destination: 'Lisbon, 3 days',
        params: 'Budget ~$100/day · food + views, minimal museums · moderate walking',
        body: 'Day 1: Alfama on foot — Miradouro de Santa Luzia at golden hour, dinner at a family tasca (€20).\nDay 2: Morning pastéis in Belém, afternoon tram 28 loop, sunset at LX Factory rooftop.\nDay 3: Day trip to Cascais by train (€5), beach walk, seafood lunch on the marina, back for a final Bairro Alto evening.',
      },
    ],
  };
}
