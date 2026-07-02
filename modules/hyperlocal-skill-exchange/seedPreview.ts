// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    posts: [
      { kind: 'offer', person: 'Meg (Elm St)', skill: 'Sourdough starter + baking lessons', trade: 'Will swap for garden veggies', matched: false },
      { kind: 'need', person: 'Ray (Oak Ave)', skill: 'Help moving a couch this weekend', trade: 'Pizza + beer on me', matched: false },
      { kind: 'offer', person: 'Priya (Elm St)', skill: 'Bike repair basics', trade: 'Free for neighbors', matched: false },
      { kind: 'need', person: 'Tom (Maple Ct)', skill: 'Spanish conversation practice', trade: 'Can trade guitar lessons', matched: true },
    ],
  };
}
