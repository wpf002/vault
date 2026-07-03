// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    questions: [
      { prompt: 'Walk me through a project where you had to make a tradeoff between speed and quality.', category: 'Behavioral', attempts: 2, lastRating: 4 },
      { prompt: 'How would you design a rate limiter for a public API?', category: 'Technical', attempts: 1, lastRating: 3 },
      { prompt: 'A teammate keeps missing deadlines and it is blocking your work. What do you do?', category: 'Situational', attempts: 0, lastRating: 0 },
      { prompt: 'Explain the difference between optimistic and pessimistic locking.', category: 'Technical', attempts: 3, lastRating: 5 },
      { prompt: 'Tell me about a time you disagreed with your manager.', category: 'Behavioral', attempts: 1, lastRating: 2 },
      { prompt: 'Your deploy just took production down. Walk me through your first 15 minutes.', category: 'Situational', attempts: 0, lastRating: 0 },
    ],
    profile: [{ role: 'Senior Backend Engineer' }],
  };
}
