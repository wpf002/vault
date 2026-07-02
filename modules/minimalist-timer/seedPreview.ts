// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. The timer/stopwatch itself is pure client
// state (no store calls at all — proves the pipeline handles a
// no-persistence module); only saved presets go through the store.
export function seedPreview() {
  return {
    presets: [
      { name: 'Pomodoro', seconds: 1500 },
      { name: 'Short Break', seconds: 300 },
    ],
  };
}
