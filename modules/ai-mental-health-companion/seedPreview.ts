// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    chat: [
      { role: 'user', text: 'Work has been relentless and I feel like I\'m always one step behind.' },
      {
        role: 'assistant',
        text: 'That sounds genuinely exhausting — running hard and still feeling behind wears anyone down. What part of the load feels heaviest right now: the volume itself, or the feeling that it never lets up? Sometimes naming which one it is makes the next step clearer. And if this has been sitting on you for a while, talking it through with a counselor is a strong move, not a last resort.',
      },
    ],
  };
}
