// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    employees: [
      { name: 'Ivy Tran', skills: ['react', 'typescript', 'design systems'], hoursFree: 12 },
      { name: 'Omar Haddad', skills: ['python', 'data pipelines', 'sql'], hoursFree: 25 },
      { name: 'Bea Fontaine', skills: ['react', 'node', 'sql'], hoursFree: 6 },
      { name: 'Karl Jensen', skills: ['devops', 'terraform', 'python'], hoursFree: 18 },
      { name: 'Mena Abadi', skills: ['design systems', 'figma', 'accessibility'], hoursFree: 20 },
    ],
    projects: [
      { name: 'Checkout Redesign', requiredSkills: ['react', 'design systems'], hoursPerWeek: 10, assigned: ['Ivy Tran'] },
      { name: 'Analytics Warehouse', requiredSkills: ['python', 'sql', 'data pipelines'], hoursPerWeek: 15, assigned: [] },
      { name: 'Infra Cost Cleanup', requiredSkills: ['devops', 'terraform'], hoursPerWeek: 8, assigned: [] },
    ],
  };
}
