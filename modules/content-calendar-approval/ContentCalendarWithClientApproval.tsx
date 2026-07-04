import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Content Calendar with Client Approval — date-sorted content pieces with
// a draft → approve/reject flow and reviewer feedback per piece. The
// Review segment shows exactly the queue a client reviewer would work
// through. Cross-account client reviewer logins are platform-level work.

type Piece = { title: string; channel: string; publishDate: string; draft: string; status: 'pending' | 'approved' | 'rejected'; feedback: string };

const STATUS_META = {
  pending: { label: 'Pending', icon: '🕓' },
  approved: { label: 'Approved', icon: '✅' },
  rejected: { label: 'Changes Requested', icon: '↩️' },
} as const;

export function ContentCalendarWithClientApproval({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [pieces, setPieces] = useState<StoreDoc<Piece>[] | null>(null);
  const [view, setView] = useState<'calendar' | 'review'>('calendar');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [draft, setDraft] = useState('');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Piece>('pieces').then((docs) => setPieces(docs.sort((a, b) => a.data.publishDate.localeCompare(b.data.publishDate))));
  }, [store]);

  const reviewQueue = (pieces ?? []).filter((p) => p.data.status === 'pending');

  async function addPiece() {
    if (!title.trim() || !publishDate) return;
    const p: Piece = { title: title.trim(), channel: channel.trim() || '—', publishDate, draft: draft.trim(), status: 'pending', feedback: '' };
    const doc = await store.create('pieces', p);
    setPieces((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.publishDate.localeCompare(b.data.publishDate)));
    setTitle('');
    setDraft('');
  }

  async function decide(doc: StoreDoc<Piece>, status: 'approved' | 'rejected') {
    const feedback = (feedbackDrafts[doc.docId] ?? '').trim();
    const updated = await store.update('pieces', doc.docId, { ...doc.data, status, feedback });
    setPieces((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
    setFeedbackDrafts((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function resubmit(doc: StoreDoc<Piece>) {
    const updated = await store.update('pieces', doc.docId, { ...doc.data, status: 'pending' as const, feedback: '' });
    setPieces((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('pieces', docId);
    setPieces((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportCalendar() {
    const rows = (pieces ?? []).map((p) => `${p.data.publishDate},"${p.data.title}",${p.data.channel},${p.data.status},"${p.data.feedback}"`);
    const csv = ['publish date,title,channel,status,feedback', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-calendar.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pieces === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="content-calendar-approval-root">
      <Section title="Content Calendar">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'calendar', label: '📝 Calendar' },
              { value: 'review', label: `👀 Review Queue (${reviewQueue.length})` },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        {view === 'calendar' ? (
          pieces.length === 0 ? (
            <EmptyState icon="📝">Nothing scheduled — draft the first piece below.</EmptyState>
          ) : (
            <div data-testid="calendar-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {pieces.map((p) => (
                <div key={p.docId} className="module-list-row" data-testid="piece-item" style={{ alignItems: 'center' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 84 }}>{p.data.publishDate}</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.title}</span>
                    <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag>{p.data.channel}</Tag>
                      <span>
                        {STATUS_META[p.data.status].icon} {STATUS_META[p.data.status].label}
                      </span>
                      {p.data.feedback && <span>💬 {p.data.feedback}</span>}
                    </div>
                  </div>
                  {p.data.status === 'rejected' && (
                    <Button variant="secondary" onClick={() => resubmit(p)} data-testid={`resubmit-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Resubmit
                    </Button>
                  )}
                  <IconButton label="Remove" onClick={() => remove(p.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          )
        ) : reviewQueue.length === 0 ? (
          <EmptyState icon="🎉">Review queue is empty — everything has a decision.</EmptyState>
        ) : (
          <div data-testid="review-queue" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {reviewQueue.map((p) => (
              <div key={p.docId} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }} data-testid="review-item">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ color: 'var(--color-text)', flex: 1 }}>{p.data.title}</strong>
                  <Tag>{p.data.channel}</Tag>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{p.data.publishDate}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{p.data.draft || '(no draft attached)'}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Label>Feedback (Optional)</Label>
                    <Input
                      value={feedbackDrafts[p.docId] ?? ''}
                      onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [p.docId]: e.target.value }))}
                      placeholder="Notes for the creator"
                      data-testid={`feedback-${p.docId}`}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <Button variant="primary" onClick={() => decide(p, 'approved')} data-testid={`approve-${p.docId}`}>
                    Approve
                  </Button>
                  <Button variant="secondary" onClick={() => decide(p, 'rejected')} data-testid={`reject-${p.docId}`}>
                    Request Changes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCalendar}>
          Export Calendar as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Draft a Piece">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Piece title" data-testid="piece-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 110 }}>
            <Label>Channel</Label>
            <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="LinkedIn / Blog / X" data-testid="piece-channel-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Publish Date</Label>
            <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} data-testid="piece-date-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Draft</Label>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="The content itself" data-testid="piece-draft-input" />
        </div>
        <Button variant="primary" onClick={addPiece} data-testid="add-piece-button">
          Submit for Approval
        </Button>
      </Section>
    </div>
  );
}
