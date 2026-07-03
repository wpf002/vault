// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
// Fingerprints below are the djb2 integrity hash the component computes over
// (name|issuer|holderDid|issuedDate|expiresDate) — see fingerprint() in the component.
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  const issued = '2026-01-15';
  return {
    identities: [
      { label: 'Personal', did: 'did:vault:z6MkhaXgBZD3xR2qc' },
      { label: 'Work', did: 'did:vault:z6Mkw9vP4tQnB8dfe' },
    ],
    credentials: [
      { name: 'Professional Engineer License', issuer: 'State Licensing Board', holderDid: 'did:vault:z6MkhaXgBZD3xR2qc', issuedDate: issued, expiresDate: daysFromNow(320), fingerprint: '' },
      { name: 'Employee Badge', issuer: 'Acme Corp HR', holderDid: 'did:vault:z6Mkw9vP4tQnB8dfe', issuedDate: issued, expiresDate: daysFromNow(45), fingerprint: '' },
      { name: 'Conference Attendee Pass', issuer: 'DevCon 2025', holderDid: 'did:vault:z6MkhaXgBZD3xR2qc', issuedDate: '2025-10-02', expiresDate: '2025-10-05', fingerprint: '' },
    ],
  };
}
