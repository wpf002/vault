import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Freelancer Directory for a Specific Trade — Vetted profiles with
// verification badges. Single-owner directory: you curate the roster for
// your trade/region (the "specific trade" of the catalog name is whatever
// you make it), verify profiles as you vet them, filter by region, and
// search. A public multi-user marketplace is platform-level work.

type Profile = { name: string; trade: string; region: string; rate: string; verified: boolean; notes: string };

export function FreelancerDirectoryForASpecificTrade({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [profiles, setProfiles] = useState<StoreDoc<Profile>[] | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Profile>('profiles').then(setProfiles);
  }, [store]);

  const regions = useMemo(() => Array.from(new Set((profiles ?? []).map((p) => p.data.region))).sort(), [profiles]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (profiles ?? []).filter((p) => {
      if (region && p.data.region !== region) return false;
      if (!q) return true;
      return [p.data.name, p.data.trade, p.data.notes, p.data.region].some((f) => f.toLowerCase().includes(q));
    });
  }, [profiles, query, region]);
  const verifiedCount = (profiles ?? []).filter((p) => p.data.verified).length;

  async function addProfile() {
    if (!name.trim()) return;
    const p: Profile = { name: name.trim(), trade: trade.trim() || 'General', region: newRegion.trim() || 'Unspecified', rate: rate.trim(), verified: false, notes: notes.trim() };
    const doc = await store.create('profiles', p);
    setProfiles((prev) => [...(prev ?? []), doc]);
    setName('');
    setRate('');
    setNotes('');
  }

  async function toggleVerified(doc: StoreDoc<Profile>) {
    const updated = await store.update('profiles', doc.docId, { ...doc.data, verified: !doc.data.verified });
    setProfiles((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('profiles', docId);
    setProfiles((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportDirectory() {
    const rows = (profiles ?? []).map((p) => `"${p.data.name}",${p.data.trade},${p.data.region},"${p.data.rate}",${p.data.verified ? 'verified' : 'unverified'},"${p.data.notes}"`);
    const csv = ['name,trade,region,rate,status,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freelancer-directory.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profiles === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="freelancer-directory-root">
      <Section title="Directory">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={`${verifiedCount}/${profiles.length}`} label="Verified profiles in the directory" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, skills, notes…" data-testid="search-input" style={{ flex: 1 }} />
        </div>

        {regions.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={region === null} onClick={() => setRegion(null)}>
              All Regions
            </Tag>
            {regions.map((r) => (
              <Tag key={r} active={region === r} onClick={() => setRegion(r)}>
                📍 {r}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🧑‍💻">{query || region ? 'No profiles match.' : 'No profiles yet — add the first one below.'}</EmptyState>
        ) : (
          <div data-testid="profiles-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="profile-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    {p.data.name}
                    {p.data.verified && <span title="Verified" style={{ marginLeft: 6 }}>✅</span>}
                  </span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{p.data.trade}</Tag>
                    <span>📍 {p.data.region}</span>
                    {p.data.rate && <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{p.data.rate}</span>}
                  </div>
                  {p.data.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{p.data.notes}</div>}
                </div>
                <Button variant={p.data.verified ? 'primary' : 'secondary'} onClick={() => toggleVerified(p)} data-testid={`verify-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {p.data.verified ? '✅ Verified' : 'Verify'}
                </Button>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDirectory}>
          ⬇️ Export Directory as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Profile">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Freelancer name" data-testid="profile-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Label>Trade / Specialty</Label>
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} placeholder="e.g. Electrician" data-testid="profile-trade-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Region</Label>
            <Input value={newRegion} onChange={(e) => setNewRegion(e.target.value)} placeholder="e.g. North Side" data-testid="profile-region-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Rate</Label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="$95/hr" data-testid="profile-rate-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>Vetting Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="References, license, specialties…" data-testid="profile-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProfile} data-testid="add-profile-button">
            + Add Profile
          </Button>
        </div>
      </Section>
    </div>
  );
}
