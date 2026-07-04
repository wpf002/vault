import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Review Collection and Showcase Tool — Request testimonials and display
// them publicly. Scope note: "publicly" needs platform-level public pages;
// the Showcase tab renders exactly the embed a public page would show
// (featured reviews only), and the export produces embeddable HTML.

type Review = { author: string; rating: number; text: string; featured: boolean; status: 'requested' | 'received' };

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} style={{ color: 'var(--module-accent)', letterSpacing: 2 }}>
      {'★'.repeat(rating)}
      <span style={{ opacity: 0.25 }}>{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

export function ReviewCollectionAndShowcaseTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [reviews, setReviews] = useState<StoreDoc<Review>[] | null>(null);
  const [view, setView] = useState<'manage' | 'showcase'>('manage');
  const [author, setAuthor] = useState('');
  const [fillId, setFillId] = useState<string | null>(null);
  const [fillRating, setFillRating] = useState(5);
  const [fillText, setFillText] = useState('');

  useEffect(() => {
    store.list<Review>('reviews').then(setReviews);
  }, [store]);

  const received = (reviews ?? []).filter((r) => r.data.status === 'received');
  const featured = received.filter((r) => r.data.featured);
  const avg = received.length ? (received.reduce((s, r) => s + r.data.rating, 0) / received.length).toFixed(1) : '—';

  async function request() {
    if (!author.trim()) return;
    const doc = await store.create('reviews', { author: author.trim(), rating: 0, text: '', featured: false, status: 'requested' as const });
    setReviews((prev) => [...(prev ?? []), doc]);
    setAuthor('');
  }

  async function recordReview() {
    const doc = (reviews ?? []).find((r) => r.docId === fillId);
    if (!doc || !fillText.trim()) return;
    const updated = await store.update('reviews', doc.docId, { ...doc.data, rating: fillRating, text: fillText.trim(), status: 'received' as const });
    setReviews((prev) => (prev ?? []).map((r) => (r.docId === doc.docId ? updated : r)));
    setFillId(null);
    setFillText('');
  }

  async function toggleFeatured(doc: StoreDoc<Review>) {
    const updated = await store.update('reviews', doc.docId, { ...doc.data, featured: !doc.data.featured });
    setReviews((prev) => (prev ?? []).map((r) => (r.docId === doc.docId ? updated : r)));
  }

  async function remove(docId: string) {
    await store.remove('reviews', docId);
    setReviews((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  function exportEmbed() {
    const html = [
      '<div class="reviews">',
      ...featured.map(
        (r) => `  <blockquote>\n    <p>${r.data.text}</p>\n    <footer>${'★'.repeat(r.data.rating)} — ${r.data.author}</footer>\n  </blockquote>`,
      ),
      '</div>',
    ].join('\n');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-showcase.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (reviews === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="review-collection-root">
      <Section title="Reviews">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'manage', label: '🗂 Manage' },
              { value: 'showcase', label: '⭐ Showcase' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={avg} label={`Average rating across ${received.length} received reviews · ${featured.length} featured`} />
        </div>
      </Section>

      {view === 'manage' ? (
        <>
          <Divider />
          <Section title="Request a Review">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Client name" data-testid="request-author-input" style={{ flex: 1 }} />
              <Button variant="primary" onClick={request} data-testid="request-button">
                Request
              </Button>
            </div>
          </Section>

          <Divider />

          <Section title="All Reviews">
            {reviews.length === 0 ? (
              <EmptyState icon="⭐">No reviews yet — request your first one above.</EmptyState>
            ) : (
              <div data-testid="reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
                {reviews.map((r) => (
                  <div key={r.docId} className="module-list-row" data-testid="review-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.author}</span>
                      {r.data.status === 'received' ? (
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          <Stars rating={r.data.rating} /> {r.data.text}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, marginTop: 2 }}>Awaiting response…</div>
                      )}
                    </div>
                    {r.data.status === 'requested' ? (
                      <Button variant="secondary" onClick={() => { setFillId(r.docId); setFillRating(5); setFillText(''); }} data-testid={`record-${r.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        Record Response
                      </Button>
                    ) : (
                      <Tag active={r.data.featured} onClick={() => toggleFeatured(r)}>
                        {r.data.featured ? '⭐ Featured' : 'Feature'}
                      </Tag>
                    )}
                    <IconButton label="Remove" onClick={() => remove(r.docId)}>
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {fillId && (
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <Label>Rating</Label>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setFillRating(n)} style={{ all: 'unset', cursor: 'pointer', fontSize: 18, color: n <= fillRating ? 'var(--module-accent)' : 'var(--color-border)' }} data-testid={`star-${n}`}>
                      ★
                    </button>
                  ))}
                </div>
                <Textarea value={fillText} onChange={(e) => setFillText(e.target.value)} placeholder="What did they say?" data-testid="fill-text-input" />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button variant="primary" onClick={recordReview} data-testid="save-review-button">
                    Save Review
                  </Button>
                  <Button variant="ghost" onClick={() => setFillId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Section>
        </>
      ) : (
        <>
          <Divider />
          <Section title="Public Showcase Preview">
            {featured.length === 0 ? (
              <EmptyState icon="⭐">No featured reviews — feature some from the Manage tab.</EmptyState>
            ) : (
              <div data-testid="showcase" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
                {featured.map((r) => (
                  <blockquote key={r.docId} style={{ margin: 0, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <Stars rating={r.data.rating} />
                    <p style={{ color: 'var(--color-text)', fontSize: 14, margin: '8px 0' }}>&ldquo;{r.data.text}&rdquo;</p>
                    <footer style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>— {r.data.author}</footer>
                  </blockquote>
                ))}
              </div>
            )}
            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportEmbed}>
              Export Showcase as HTML Embed
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
