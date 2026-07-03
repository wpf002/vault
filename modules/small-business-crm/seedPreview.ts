// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    leads: [
      { name: 'Dana Whitfield', email: 'dana@whitfieldco.com', source: 'Website Form', status: 'new' },
      { name: 'Luis Herrera', email: 'luis.h@gmail.com', source: 'Referral', status: 'contacted' },
      { name: 'Amara Osei', email: 'amara@oseidesign.studio', source: 'Instagram', status: 'customer' },
      { name: 'Pete Kowalski', email: 'pete.k@outlook.com', source: 'Trade Show', status: 'new' },
      { name: 'June Park', email: 'june@parkandco.net', source: 'Website Form', status: 'lost' },
    ],
    campaigns: [
      { name: 'New Lead Welcome', trigger: 'new', subject: 'Thanks for reaching out, {{name}}!', body: 'Hi {{name}},\n\nThanks for getting in touch — I\'ll reply personally within one business day. In the meantime, here\'s our pricing guide and recent work.\n\n— Sam', active: true },
      { name: 'Follow-Up Nudge', trigger: 'contacted', subject: 'Still thinking it over, {{name}}?', body: 'Hi {{name}},\n\nJust checking in — happy to answer any questions or hop on a quick call this week.\n\n— Sam', active: true },
    ],
    outbox: [
      { lead: 'Luis Herrera', email: 'luis.h@gmail.com', campaign: 'New Lead Welcome', subject: 'Thanks for reaching out, Luis Herrera!', sent: true },
    ],
  };
}
