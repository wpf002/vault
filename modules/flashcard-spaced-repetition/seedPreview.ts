// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. A mix of due-today and not-yet-due cards so
// the review queue and the "all caught up" empty state are both reachable
// without waiting on real time to pass.
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    cards: [
      { front: 'What does "idempotent" mean?', back: 'An operation that produces the same result no matter how many times it runs.', interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: daysFromNow(0) },
      { front: 'HTTP status for "created"?', back: '201', interval: 1, repetitions: 1, easeFactor: 2.5, dueDate: daysFromNow(0) },
      { front: 'What is a CDN?', back: 'A distributed network of servers that caches content closer to users.', interval: 6, repetitions: 2, easeFactor: 2.6, dueDate: daysFromNow(0) },
      { front: 'What does ACID stand for?', back: 'Atomicity, Consistency, Isolation, Durability.', interval: 4, repetitions: 3, easeFactor: 2.5, dueDate: daysFromNow(3) },
      { front: 'What is a race condition?', back: 'When behavior depends on the relative timing of uncontrolled events.', interval: 10, repetitions: 4, easeFactor: 2.7, dueDate: daysFromNow(7) },
    ],
  };
}
