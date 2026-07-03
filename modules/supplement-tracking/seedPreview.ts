// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    supplements: [
      { name: 'Vitamin D3', dose: '4000 IU', timing: 'morning', notes: 'With breakfast — fat-soluble' },
      { name: 'Magnesium Glycinate', dose: '400 mg', timing: 'evening', notes: 'Better sleep when consistent' },
      { name: 'Creatine', dose: '5 g', timing: 'morning', notes: 'Any time works, morning easiest to remember' },
      { name: 'Omega-3', dose: '2 g', timing: 'morning', notes: '' },
    ],
    doses: [
      { date: todayStr(), supplement: 'Vitamin D3' },
      { date: todayStr(), supplement: 'Creatine' },
    ],
  };
}
