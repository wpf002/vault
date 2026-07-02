// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    postings: [
      { title: 'Senior Rust Engineer', company: 'Signal Systems', salary: '$170k–$210k', tags: ['rust', 'backend'], featured: true, status: 'open' },
      { title: 'Rust + WASM Developer', company: 'CanvasKit Co', salary: '$140k–$180k', tags: ['rust', 'wasm', 'frontend'], featured: false, status: 'open' },
      { title: 'Embedded Rust Contractor', company: 'Volt Robotics', salary: '$95/hr', tags: ['rust', 'embedded'], featured: false, status: 'open' },
      { title: 'Blockchain Core Dev', company: 'LedgerWorks', salary: '$160k', tags: ['rust', 'crypto'], featured: false, status: 'filled' },
    ],
  };
}
