// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    fields: [
      { label: 'Full Name', kind: 'text', required: true },
      { label: 'Email', kind: 'email', required: true },
      { label: 'Company Size', kind: 'select', required: false, options: ['1-10', '11-50', '51-200', '200+'] },
      { label: 'How Can We Help?', kind: 'textarea', required: true },
    ],
  };
}
