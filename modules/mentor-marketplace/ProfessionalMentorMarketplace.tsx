import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Professional Mentor Marketplace — Book calls with experienced
// practitioners. Single-user side of the marketplace: your curated mentor
// roster + your session book against it. Cross-account mentor accounts and
// payment for calls are platform-level (Stripe Connect) work.

type Mentor = { name: string; expertise: string; rateCents: number; bio: string };
type Session = { mentor: string; topic: string; date: string; time: string; status: 'booked' | 'completed' };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ProfessionalMentorMarketplace({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [mentors, setMentors] = useState<StoreDoc<Mentor>[] | null>(null);
  const [sessions, setSessions] = useState<StoreDoc<Session>[] | null>(null);
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [rate, setRate] = useState('');
  const [bio, setBio] = useState('');
  const [bookingMentor, setBookingMentor] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('15:00');

  useEffect(() => {
    store.list<Mentor>('mentors').then(setMentors);
    store.list<Session>('sessions').then((docs) => setSessions(docs.sort((a, b) => b.data.date.localeCompare(a.data.date))));
  }, [store]);

  async function addMentor() {
    if (!name.trim()) return;
    const m: Mentor = { name: name.trim(), expertise: expertise.trim() || 'General', rateCents: Math.round((Number(rate) || 0) * 100), bio: bio.trim() };
    const doc = await store.create('mentors', m);
    setMentors((prev) => [...(prev ?? []), doc]);
    setName('');
    setExpertise('');
    setRate('');
    setBio('');
  }

  async function removeMentor(docId: string) {
    await store.remove('mentors', docId);
    setMentors((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  async function bookSession() {
    if (!bookingMentor || !topic.trim() || !date) return;
    const s: Session = { mentor: bookingMentor, topic: topic.trim(), date, time, status: 'booked' };
    const doc = await store.create('sessions', s);
    setSessions((prev) => [doc, ...(prev ?? [])]);
    setTopic('');
  }

  async function completeSession(doc: StoreDoc<Session>) {
    const next: Session = { ...doc.data, status: 'completed' };
    const updated = await store.update('sessions', doc.docId, next);
    setSessions((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function removeSession(docId: string) {
    await store.remove('sessions', docId);
    setSessions((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportSessions() {
    const rows = (sessions ?? []).map((s) => `${s.data.date},${s.data.time},"${s.data.mentor}","${s.data.topic}",${s.data.status}`);
    const csv = ['date,time,mentor,topic,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mentor-sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (mentors === null || sessions === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="mentor-marketplace-root">
      <Section title="Mentors">
        {mentors.length === 0 ? (
          <EmptyState icon="🧑‍💼">No mentors on the roster yet — add one below.</EmptyState>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 4 }} data-testid="mentors-grid">
            {mentors.map((m) => (
              <div key={m.docId} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }} data-testid="mentor-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <strong style={{ color: 'var(--color-text)' }}>{m.data.name}</strong>
                  <IconButton label="Remove mentor" onClick={() => removeMentor(m.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ margin: '4px 0' }}>
                  <Tag>{m.data.expertise}</Tag>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '6px 0' }}>{m.data.bio}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(m.data.rateCents)}/session</span>
                  <Button variant="primary" onClick={() => setBookingMentor(m.data.name)} data-testid={`book-${m.docId}`} style={{ padding: '5px 12px', fontSize: 12 }}>
                    Book a Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {bookingMentor && (
        <>
          <Divider />
          <Section title={`Book with ${bookingMentor}`}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}>
                <Label>Topic</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to cover?" data-testid="session-topic-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 150 }}>
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="session-date-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 110 }}>
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="session-time-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={bookSession} data-testid="confirm-session-button">
                Confirm
              </Button>
              <Button variant="ghost" onClick={() => setBookingMentor('')}>
                Cancel
              </Button>
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section title="Your Sessions">
        {sessions.length === 0 ? (
          <EmptyState icon="📞">No sessions yet — book a call with a mentor above.</EmptyState>
        ) : (
          <div data-testid="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {sessions.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="session-item" style={{ alignItems: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 90 }}>
                  {s.data.date}
                  <br />
                  {s.data.time}
                </span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.topic}</span>
                  <div style={{ fontSize: 12, marginTop: 2 }}>with {s.data.mentor}</div>
                </div>
                {s.data.status === 'booked' ? (
                  <Button variant="secondary" onClick={() => completeSession(s)} data-testid={`complete-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    Mark Completed
                  </Button>
                ) : (
                  <Tag active>✓ Completed</Tag>
                )}
                <IconButton label="Remove" onClick={() => removeSession(s.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSessions}>
          ⬇️ Export Session History as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Mentor">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mentor name" data-testid="mentor-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Expertise</Label>
            <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="e.g. Product strategy" data-testid="mentor-expertise-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Rate ($/session)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} data-testid="mentor-rate-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>Bio</Label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Background, what they're great at" data-testid="mentor-bio-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMentor} data-testid="add-mentor-button">
            + Add Mentor
          </Button>
        </div>
      </Section>
    </div>
  );
}
