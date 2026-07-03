// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    goals: [
      { name: 'Emergency Fund', targetCents: 500000, savedCents: 320000, emoji: '🛟' },
      { name: 'Japan Trip', targetCents: 300000, savedCents: 85000, emoji: '🗾' },
    ],
    challenges: [
      { title: 'No-Takeout Week', rewardXp: 150, status: 'active' },
      { title: 'Pack Lunch 5 Days', rewardXp: 100, status: 'done' },
      { title: 'Skip One Subscription This Month', rewardXp: 200, status: 'active' },
    ],
    profile: [{ xp: 430 }],
  };
}
