// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Anonymous-by-design: pulses carry no names,
// only week + mood + optional note, which is the point of a team mood pulse.
function weeksAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  // normalize to that week's Monday
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    pulses: [
      { week: weeksAgoISO(1), mood: 4, note: 'Shipping week went smoothly' },
      { week: weeksAgoISO(1), mood: 3, note: '' },
      { week: weeksAgoISO(1), mood: 5, note: 'Great pairing sessions' },
      { week: weeksAgoISO(1), mood: 2, note: 'On-call was rough' },
      { week: weeksAgoISO(0), mood: 4, note: '' },
      { week: weeksAgoISO(0), mood: 3, note: 'Roadmap uncertainty' },
      { week: weeksAgoISO(0), mood: 4, note: '' },
    ],
  };
}
