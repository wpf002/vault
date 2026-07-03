// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    guides: [
      {
        destination: 'Oaxaca, Mexico',
        chapters: [
          { title: 'A City Built on Seven Moles', kind: 'history', body: 'Oaxaca sits at the crossroads of Zapotec and Mixtec civilizations — Monte Albán overlooked these valleys for 1,300 years before the Spanish arrived. The city\'s food canon, the "seven moles," maps to that layered history: each mole is a family archive in sauce form.', read: true },
          { title: 'How to Eat at a Mercado', kind: 'food', body: 'Skip the restaurant row and head into Mercado 20 de Noviembre. Find the smoke hall — pick your meat raw from the butcher, they grill it on the spot, and the vegetable ladies sell you everything to wrap it in. Sharing a table with strangers is expected.', read: true },
          { title: 'Mezcal Is Drunk, Not Shot', kind: 'customs', body: 'Sip it — "besos a la botella," kisses to the bottle. Shooting mezcal marks you as a tourist instantly. If someone offers you a taste from their own bottle, accept even a small sip; refusing outright can read as distrust.', read: false },
          { title: 'Five Phrases That Open Doors', kind: 'phrases', body: '"¿Qué me recomienda?" (what do you recommend?) does more work than any guidebook. Also: "Con permiso" entering a stall, "Provecho" to a table of eating strangers, "¿Se puede?" before photographing anyone, and "Está delicioso" — say it often, mean it.', read: false },
        ],
      },
    ],
    notes: [
      { destination: 'Oaxaca, Mexico', text: 'Tía\'s tip: the Sunday market in Tlacolula > anything in the city. Take the colectivo.' },
    ],
  };
}
