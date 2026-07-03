// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    cards: [
      { word: 'la sobremesa', translation: 'time spent talking at the table after a meal', note: 'In Spain, lingering after lunch is the point — leaving right after eating reads as rude.' },
      { word: 'madrugar', translation: 'to wake up very early', note: '"No por mucho madrugar amanece más temprano" — rising earlier doesn\'t make the sun come up sooner.' },
      { word: 'el puente', translation: 'a long weekend (bridge holiday)', note: 'When a holiday lands on a Thursday, Spaniards "hacer puente" — bridge it to the weekend.' },
      { word: 'tutear', translation: 'to address someone informally (tú)', note: 'Switching from usted to tú is a social moment — wait for the older person to offer it.' },
      { word: 'la merienda', translation: 'late-afternoon snack', note: 'Dinner in Spain is ~9–10pm, so the 6pm merienda is a real institution, especially for kids.' },
      { word: 'estrenar', translation: 'to use or wear something for the first time', note: 'One verb for the joy of first use — new shoes, new phone, new film. English needs a sentence.' },
    ],
    progress: [{ xp: 120, bestStreak: 4 }],
  };
}
