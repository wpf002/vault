import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Local Event Aggregator — one city calendar with a submission inbox
// (new submissions land unapproved; you moderate them in), category
// filter, save-to-my-list, and a digest export of the week ahead.
// Scope note: actually emailing the digest is platform notification
// infra — the digest is generated here and exported as Markdown.

type CityEvent = { title: string; date: string; venue: string; category: string; submittedBy: string; approved: boolean; saved: boolean };

const CATEGORIES = ['Market', 'Arts', 'Music', 'Sports', 'Workshop', 'Civic'];

function daysUntil(date: string): number {
  return Math.ceil((Date.parse(date) - Date.now()) / 86400000);
}

export function LocalEventAggregator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [events, setEvents] = useState<StoreDoc<CityEvent>[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('Market');
  const [submittedBy, setSubmittedBy] = useState('');

  useEffect(() => {
    store.list<CityEvent>('events').then(setEvents);
  }, [store]);

  const list = events ?? [];
  const approved = useMemo(
    () =>
      list
        .filter((e) => e.data.approved && (filter === 'All' || e.data.category === filter))
        .sort((a, b) => a.data.date.localeCompare(b.data.date)),
    [list, filter],
  );
  const pending = list.filter((e) => !e.data.approved);
  const savedCount = list.filter((e) => e.data.saved).length;

  async function submitEvent() {
    if (!title.trim() || !date) return;
    const e: CityEvent = { title: title.trim(), date, venue: venue.trim() || 'TBD', category, submittedBy: submittedBy.trim() || 'Anonymous', approved: false, saved: false };
    const doc = await store.create('events', e);
    setEvents((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setDate('');
    setVenue('');
    setSubmittedBy('');
  }

  async function setApproved(doc: StoreDoc<CityEvent>, approvedFlag: boolean) {
    if (!approvedFlag) {
      await store.remove('events', doc.docId);
      setEvents((prev) => (prev ?? []).filter((e) => e.docId !== doc.docId));
      return;
    }
    const updated = await store.update('events', doc.docId, { ...doc.data, approved: true });
    setEvents((prev) => (prev ?? []).map((e) => (e.docId === doc.docId ? updated : e)));
  }

  async function toggleSaved(doc: StoreDoc<CityEvent>) {
    const updated = await store.update('events', doc.docId, { ...doc.data, saved: !doc.data.saved });
    setEvents((prev) => (prev ?? []).map((e) => (e.docId === doc.docId ? updated : e)));
  }

  async function removeEvent(docId: string) {
    await store.remove('events', docId);
    setEvents((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportDigest() {
    const weekAhead = list
      .filter((e) => e.data.approved && daysUntil(e.data.date) >= 0 && daysUntil(e.data.date) <= 7)
      .sort((a, b) => a.data.date.localeCompare(b.data.date));
    const lines = weekAhead.map((e) => `- **${e.data.date}** · ${e.data.title} @ ${e.data.venue} _(${e.data.category})_${e.data.saved ? ' ⭐' : ''}`);
    const md = ['# This Week Around Town', '', ...(lines.length ? lines : ['_Nothing on the calendar this week._'])].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekly-digest.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (events === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="local-event-aggregator-root">
      <Section title="City Calendar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="approved-count">{list.filter((e) => e.data.approved).length}</span>} label="Events on the calendar" />
          <StatDisplay value={<span data-testid="pending-count">{pending.length}</span>} label="Awaiting moderation" />
          <StatDisplay value={savedCount} label="Saved to your list" />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES].map((c) => (
            <Tag key={c} active={filter === c} onClick={() => setFilter(c)}>
              {c}
            </Tag>
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="Upcoming Events">
        {approved.length === 0 ? (
          <EmptyState icon="🎫">Nothing on the calendar{filter !== 'All' ? ` in ${filter}` : ''} — approve submissions or add one.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }} data-testid="events-list">
            {approved.map((e) => {
              const d = daysUntil(e.data.date);
              return (
                <div key={e.docId} className="module-list-row" data-testid="event-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.title}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                      {e.data.date} · {e.data.venue}
                    </div>
                  </div>
                  <Tag>{e.data.category}</Tag>
                  {d >= 0 && d <= 7 && <Tag active>{d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}</Tag>}
                  <Button variant={e.data.saved ? 'secondary' : 'ghost'} onClick={() => toggleSaved(e)} data-testid={`save-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    {e.data.saved ? 'Saved' : '☆ Save'}
                  </Button>
                  <IconButton label="Remove" onClick={() => removeEvent(e.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Submission Inbox">
        {pending.length === 0 ? (
          <EmptyState icon="📥">No submissions waiting.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="pending-list">
            {pending.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="pending-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {e.data.date} · {e.data.venue} · submitted by {e.data.submittedBy}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setApproved(e, true)} data-testid={`approve-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  Approve
                </Button>
                <Button variant="ghost" onClick={() => setApproved(e, false)} data-testid={`reject-${e.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  Reject
                </Button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Event</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Porchfest" data-testid="title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="date-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Main St." data-testid="venue-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-select" style={{ width: '100%' }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 130 }}>
            <Label>Submitted By</Label>
            <Input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} placeholder="Your name" data-testid="submitter-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={submitEvent} data-testid="submit-event-button">
            Submit
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDigest}>
          Export This Week's Digest as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
