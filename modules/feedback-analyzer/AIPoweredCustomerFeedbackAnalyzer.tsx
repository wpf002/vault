import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI-Powered Customer Feedback Analyzer — paste a batch of reviews (one
// per line); the proxy classifies each as N | SENTIMENT | THEME plus one
// INSIGHT line, the module parses that into tagged reviews, a locally-
// computed sentiment breakdown, and a theme leaderboard. The counting is
// done here, not by the model — the AI labels, the math is deterministic.
// CONTRACT.md #11 failure states rendered.

type Review = { text: string; sentiment: 'positive' | 'negative' | 'mixed'; theme: string };
type Insight = { insight: string; reviewCount: number };

const SYSTEM_PROMPT = [
  'You classify customer reviews. For each numbered review output exactly one line:',
  'N | POSITIVE or NEGATIVE or MIXED | THEME (2-4 words naming what it is about)',
  'After all reviews, output one final line: INSIGHT | one sentence naming the most actionable pattern across the batch.',
  'No headers, no commentary, nothing else.',
].join(' ');

function parseAnalysis(text: string, inputs: string[]): { reviews: Review[]; insight: string } {
  const reviews: Review[] = [];
  let insight = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.includes('|')) continue;
    const parts = line.split('|').map((p) => p.trim());
    if (parts[0]?.toUpperCase() === 'INSIGHT') {
      insight = parts.slice(1).join(' | ');
      continue;
    }
    const idx = Number(parts[0]) - 1;
    const sentiment = parts[1]?.toLowerCase();
    if (idx >= 0 && idx < inputs.length && (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'mixed')) {
      reviews.push({ text: inputs[idx]!, sentiment, theme: parts[2] || 'General' });
    }
  }
  return { reviews, insight };
}

export function AIPoweredCustomerFeedbackAnalyzer({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [reviews, setReviews] = useState<StoreDoc<Review>[] | null>(null);
  const [insights, setInsights] = useState<StoreDoc<Insight>[] | null>(null);
  const [batch, setBatch] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Review>('reviews').then(setReviews);
    store.list<Insight>('insights').then(setInsights);
  }, [store]);

  const list = reviews ?? [];
  const counts = useMemo(() => {
    const c = { positive: 0, negative: 0, mixed: 0 };
    for (const r of list) c[r.data.sentiment]++;
    return c;
  }, [list]);

  const themes = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of list) map.set(r.data.theme, (map.get(r.data.theme) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [list]);

  async function analyze() {
    if (!ai || working) return;
    const inputs = batch.split('\n').map((l) => l.trim()).filter((l) => l.length > 5).slice(0, 25);
    if (inputs.length === 0) return;
    setWorking(true);
    setFailure(null);
    const numbered = inputs.map((r, i) => `${i + 1}. ${r}`).join('\n');
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Reviews:\n${numbered}` });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const parsed = parseAnalysis(res.text, inputs);
    const created: StoreDoc<Review>[] = [];
    for (const r of parsed.reviews) created.push(await store.create('reviews', r));
    setReviews((prev) => [...created, ...(prev ?? [])]);
    if (parsed.insight) {
      const doc = await store.create('insights', { insight: parsed.insight, reviewCount: parsed.reviews.length });
      setInsights((prev) => [doc, ...(prev ?? [])]);
    }
    setBatch('');
  }

  async function removeReview(docId: string) {
    await store.remove('reviews', docId);
    setReviews((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  async function removeInsight(docId: string) {
    await store.remove('insights', docId);
    setInsights((prev) => (prev ?? []).filter((i) => i.docId !== docId));
  }

  function exportReport() {
    const rows = list.map((r) => `"${r.data.text.replace(/"/g, '""')}",${r.data.sentiment},"${r.data.theme}"`);
    const csv = ['review,sentiment,theme', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (reviews === null || insights === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="feedback-analyzer-root">
      <Section title="Analyze a Batch">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <Label>Reviews (One Per Line, Up to 25)</Label>
            <Textarea value={batch} onChange={(e) => setBatch(e.target.value)} placeholder={'Paste reviews here…\nOne per line.'} data-testid="batch-input" rows={5} style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={analyze} data-testid="analyze-button" disabled={working || batch.trim().length < 6} style={{ alignSelf: 'flex-start' }}>
            {working ? '💬 Analyzing…' : '💬 Analyze Sentiment'}
          </Button>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'batch' : 'batches'} left in preview — unlock the app for unlimited analysis.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Analysis needs an account, even to try it — sign in for a few free batches.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free batches are used up — unlock the app to keep analyzing.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The analyzer is offline right now — your reviews are untouched, try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Sentiment Dashboard">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="positive-count" style={{ color: '#39d98a' }}>{counts.positive}</span>} label="Positive" />
          <StatDisplay value={<span data-testid="mixed-count" style={{ color: '#f5c451' }}>{counts.mixed}</span>} label="Mixed" />
          <StatDisplay value={<span data-testid="negative-count" style={{ color: '#ff6b5e' }}>{counts.negative}</span>} label="Negative" />
          <StatDisplay value={list.length} label="Reviews analyzed" />
        </div>

        {themes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }} data-testid="themes-list">
            <Label>Top Themes</Label>
            {themes.map(([theme, count]) => (
              <div key={theme}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--color-text)' }}>{theme}</span>
                  <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / (themes[0]?.[1] ?? 1)) * 100}%`, background: 'var(--module-accent)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {insights.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="insights-list">
            <Label>AI Insights</Label>
            {insights.map((i) => (
              <div key={i.docId} className="module-list-row" data-testid="insight-item" style={{ alignItems: 'flex-start' }}>
                <span style={{ minWidth: 24 }}>💡</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontSize: 13, lineHeight: 1.6 }}>{i.data.insight}</span>
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--color-text-dim)' }}>From a batch of {i.data.reviewCount} reviews</div>
                </div>
                <IconButton label="Remove" onClick={() => removeInsight(i.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Classified Reviews">
        {list.length === 0 ? (
          <EmptyState icon="💬">No reviews analyzed yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="reviews-list">
            {list.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="review-item" style={{ alignItems: 'center' }}>
                <span style={{ minWidth: 24 }}>{r.data.sentiment === 'positive' ? '😊' : r.data.sentiment === 'negative' ? '😞' : '😐'}</span>
                <div className="module-list-row-content" style={{ flex: 1, fontSize: 13 }}>
                  {r.data.text}
                </div>
                <Tag active={r.data.sentiment === 'positive'}>{r.data.theme}</Tag>
                <IconButton label="Remove" onClick={() => removeReview(r.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          ⬇️ Export Analysis as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
