import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Tutor Searching App — Match students to tutors by subject, fees, and
// location. Search is criteria-based: subject filter + max-fee cap +
// location filter, results fee-sorted. Money is integer cents.

type Tutor = { name: string; subject: string; feeCents: number; location: string; notes: string };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function TutorSearchingApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tutors, setTutors] = useState<StoreDoc<Tutor>[] | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [maxFee, setMaxFee] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [fee, setFee] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Tutor>('tutors').then(setTutors);
  }, [store]);

  const subjects = useMemo(() => Array.from(new Set((tutors ?? []).map((t) => t.data.subject))).sort(), [tutors]);
  const locations = useMemo(() => Array.from(new Set((tutors ?? []).map((t) => t.data.location))).sort(), [tutors]);
  const maxFeeCents = maxFee ? Math.round(Number(maxFee) * 100) : Infinity;

  const matches = (tutors ?? [])
    .filter((t) => (!subject || t.data.subject === subject) && (!location || t.data.location === location) && t.data.feeCents <= maxFeeCents)
    .sort((a, b) => a.data.feeCents - b.data.feeCents);

  async function addTutor() {
    if (!name.trim()) return;
    const t: Tutor = { name: name.trim(), subject: newSubject.trim() || 'General', feeCents: Math.round((Number(fee) || 0) * 100), location: newLocation.trim() || 'Online', notes: notes.trim() };
    const doc = await store.create('tutors', t);
    setTutors((prev) => [...(prev ?? []), doc]);
    setName('');
    setFee('');
    setNotes('');
  }

  async function remove(docId: string) {
    await store.remove('tutors', docId);
    setTutors((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportMatches() {
    const rows = matches.map((t) => `"${t.data.name}",${t.data.subject},${(t.data.feeCents / 100).toFixed(2)},${t.data.location},"${t.data.notes}"`);
    const csv = ['tutor,subject,fee,location,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tutor-matches.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tutors === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="tutor-search-root">
      <Section title="Find a Tutor">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Tag active={subject === null} onClick={() => setSubject(null)}>
            All Subjects
          </Tag>
          {subjects.map((s) => (
            <Tag key={s} active={subject === s} onClick={() => setSubject(s)}>
              📖 {s}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <Tag active={location === null} onClick={() => setLocation(null)}>
            Anywhere
          </Tag>
          {locations.map((l) => (
            <Tag key={l} active={location === l} onClick={() => setLocation(l)}>
              📍 {l}
            </Tag>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <Label>Max Fee ($/hr)</Label>
            <Input type="number" value={maxFee} onChange={(e) => setMaxFee(e.target.value)} placeholder="Any" data-testid="max-fee-input" style={{ width: 90, padding: '5px 8px' }} />
          </span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={matches.length} label="Tutors match your criteria" />
        </div>

        {matches.length === 0 ? (
          <EmptyState icon="📖">No tutors match — loosen the filters or add tutors below.</EmptyState>
        ) : (
          <div data-testid="matches-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {matches.map((t) => (
              <div key={t.docId} className="module-list-row" data-testid="tutor-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{t.data.subject}</Tag>
                    <span>📍 {t.data.location}</span>
                    {t.data.notes && <span>{t.data.notes}</span>}
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(t.data.feeCents)}/hr</span>
                <IconButton label="Remove" onClick={() => remove(t.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportMatches}>
          Export Matches as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Tutor">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tutor name" data-testid="tutor-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Subject</Label>
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Math" data-testid="tutor-subject-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Fee ($/hr)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="tutor-fee-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Location</Label>
            <Input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Online" data-testid="tutor-location-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Specialties, availability" data-testid="tutor-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addTutor} data-testid="add-tutor-button">
            + Add Tutor
          </Button>
        </div>
      </Section>
    </div>
  );
}
