// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    favorites: [
      { mode: 'writing', text: 'A lighthouse keeper who has never seen the ocean, set in a city built on the back of a sleeping giant, told entirely through letters.' },
      { mode: 'drawing', text: 'Draw a bustling night market — using only geometric shapes, lit by a single dramatic light source.' },
      { mode: 'brainstorm', text: 'How might a public library work if it lent skills instead of books? Constraint: it must run with zero staff.' },
    ],
  };
}
