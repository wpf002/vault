// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    appliances: [
      { name: 'Water heater', brand: 'Rheem, 50 gal', ageYears: 9, symptoms: 'Occasional rumbling when heating' },
      { name: 'Washing machine', brand: 'LG front-load', ageYears: 4, symptoms: '' },
      { name: 'HVAC system', brand: 'Carrier heat pump', ageYears: 12, symptoms: 'Weaker airflow upstairs this summer' },
      { name: 'Refrigerator', brand: 'Whirlpool', ageYears: 2, symptoms: '' },
    ],
    schedule: [
      { appliance: 'Water heater', risk: 'high', issue: 'Sediment buildup — rumbling at 9 years is the classic sign', action: 'Flush the tank; inspect anode rod', when: 'Within 2 weeks' },
      { appliance: 'HVAC system', risk: 'medium', issue: 'Airflow loss suggests clogged filter or duct leak', action: 'Replace filter, then duct inspection if unchanged', when: 'This month' },
    ],
  };
}
