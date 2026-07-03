// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    complaints: [
      { refId: 'CMP-1042', title: 'Pothole cluster on Maple Ave near 5th', department: 'Roads', location: 'Maple Ave & 5th St', description: 'Three deep potholes in the eastbound lane, growing after every rain. Two reported tire blowouts.', status: 'in_progress', followUps: 2, dateFiled: daysAgo(18) },
      { refId: 'CMP-1057', title: 'Missed trash pickup two weeks running', department: 'Sanitation', location: 'Birch Lane, odd-numbered side', description: 'Route has skipped the odd side of Birch Lane on both of the last two Thursdays.', status: 'acknowledged', followUps: 1, dateFiled: daysAgo(9) },
      { refId: 'CMP-1063', title: 'Streetlight out at the park entrance', department: 'Parks', location: 'Riverside Park, main gate', description: 'The light over the main entrance has been dark for a week — the path is unlit after 8pm.', status: 'submitted', followUps: 0, dateFiled: daysAgo(4) },
      { refId: 'CMP-1031', title: 'Water pressure drop, whole block', department: 'Water', location: 'Elm St 200 block', description: 'Noticeable pressure drop since the roadwork started. Resolved after the main was re-seated.', status: 'resolved', followUps: 3, dateFiled: daysAgo(41) },
    ],
  };
}
