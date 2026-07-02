// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    entries: [
      { name: 'Old project archives (2019-2022)', category: 'files', decision: 'archive', note: 'Move to external drive' },
      { name: 'Duplicate phone photos', category: 'photos', decision: 'pending', note: '~3,000 duplicates from backup' },
      { name: 'Newsletter subscriptions', category: 'email', decision: 'pending', note: '47 senders flagged, unsubscribe pass needed' },
      { name: 'Streaming service (unused)', category: 'subscriptions', decision: 'delete', note: '$15.99/mo, last watched in March' },
      { name: 'Desktop screenshot pile', category: 'files', decision: 'delete', note: '' },
    ],
  };
}
