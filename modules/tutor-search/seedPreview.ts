// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
export function seedPreview() {
  return {
    tutors: [
      { name: 'Ms. Alvarez', subject: 'Math', feeCents: 6000, location: 'Online', notes: 'Algebra through calculus, patient with fundamentals' },
      { name: 'Mr. Okafor', subject: 'Physics', feeCents: 7500, location: 'North Side', notes: 'AP Physics specialist' },
      { name: 'Dr. Kim', subject: 'Math', feeCents: 9000, location: 'Downtown', notes: 'Competition math, olympiad coaching' },
      { name: 'Sra. Reyes', subject: 'Spanish', feeCents: 4500, location: 'Online', notes: 'Conversational fluency focus' },
    ],
  };
}
