// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. day: 0=Mon … 6=Sun.
export function seedPreview() {
  return {
    exercises: [
      { name: 'Back Squat', sets: 5, reps: '5', day: 0 },
      { name: 'Bench Press', sets: 5, reps: '5', day: 0 },
      { name: 'Deadlift', sets: 3, reps: '5', day: 2 },
      { name: 'Overhead Press', sets: 4, reps: '8', day: 2 },
      { name: 'Pull-Ups', sets: 4, reps: 'AMRAP', day: 4 },
      { name: 'Barbell Row', sets: 4, reps: '10', day: 4 },
    ],
  };
}
