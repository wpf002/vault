// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. A previously generated plan — new plans go
// through the live AI proxy.
export function seedPreview() {
  return {
    profile: [{ goal: 'Build general strength', level: 'Beginner', equipment: 'Dumbbells + bench', daysPerWeek: 3, diet: 'No restrictions' }],
    plans: [
      {
        kind: 'workout',
        title: '3-Day Beginner Strength Week',
        body: 'Day 1 — Full Body A: goblet squats 3×10, dumbbell bench 3×8, one-arm rows 3×10/side, plank 3×30s.\nDay 2 — Rest or 20-min walk.\nDay 3 — Full Body B: Romanian deadlifts 3×10, overhead press 3×8, split squats 2×8/side, dead bug 3×10.\nDay 4 — Rest.\nDay 5 — Full Body C: dumbbell rows 3×10, incline press 3×10, step-ups 3×8/side, farmer carries 3×40m.\nWeekend — Move for fun: hike, bike, or swim.',
      },
    ],
  };
}
