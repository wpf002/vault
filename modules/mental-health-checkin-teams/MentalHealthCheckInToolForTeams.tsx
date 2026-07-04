import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Mental Health Check-In Tool for Teams — anonymous weekly mood pulse.
// Pulses are deliberately name-free (that's the product: honest signal,
// not surveillance); the trend view averages by week and flags declines.
// This is a team wellbeing pulse, NOT a clinical/diagnostic tool — no
// scoring language beyond a 1-5 mood scale, no advice generation.
// Cross-account teammate submission links are platform-level work.

type Pulse = { week: string; mood: number; note: string };

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

function currentWeekMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function MentalHealthCheckInToolForTeams({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [pulses, setPulses] = useState<StoreDoc<Pulse>[] | null>(null);
  const [mood, setMood] = useState(0);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    store.list<Pulse>('pulses').then(setPulses);
  }, [store]);

  const byWeek = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of pulses ?? []) {
      map.set(p.data.week, [...(map.get(p.data.week) ?? []), p.data.mood]);
    }
    return Array.from(map.entries())
      .map(([week, moods]) => ({ week, avg: moods.reduce((a, b) => a + b, 0) / moods.length, count: moods.length }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [pulses]);

  const latest = byWeek[byWeek.length - 1];
  const prev = byWeek[byWeek.length - 2];
  const declining = latest && prev && latest.avg < prev.avg - 0.4;
  const notes = (pulses ?? []).filter((p) => p.data.week === latest?.week && p.data.note.trim());

  async function submit() {
    if (mood === 0) return;
    const p: Pulse = { week: currentWeekMonday(), mood, note: note.trim() };
    const doc = await store.create('pulses', p);
    setPulses((prevList) => [...(prevList ?? []), doc]);
    setMood(0);
    setNote('');
    setSubmitted(true);
  }

  function exportTrend() {
    const rows = byWeek.map((w) => `${w.week},${w.avg.toFixed(2)},${w.count}`);
    const csv = ['week,average mood,responses', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-pulse-trend.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pulses === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="mental-health-checkin-teams-root">
      <Section title="This Week's Pulse">
        {submitted ? (
          <p style={{ fontSize: 13, color: 'var(--module-accent)', margin: 0 }} data-testid="submitted-note">
            ✓ Check-in recorded — thanks for the signal.
          </p>
        ) : (
          <>
            <Label>How Was Your Week?</Label>
            <div style={{ display: 'flex', gap: 6, margin: '6px 0 12px' }}>
              {MOODS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setMood(i + 1)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 26,
                    padding: 6,
                    borderRadius: 10,
                    background: mood === i + 1 ? 'color-mix(in srgb, var(--module-accent) 25%, transparent)' : 'transparent',
                  }}
                  data-testid={`mood-${i + 1}`}
                  aria-label={`Mood ${i + 1} of 5`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Label>Anything to Share? (Anonymous, Optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What made the week good or hard?" data-testid="note-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={submit} data-testid="submit-pulse-button">
                Check In
              </Button>
            </div>
          </>
        )}
      </Section>

      <Divider />

      <Section title="Team Trend">
        {byWeek.length === 0 ? (
          <EmptyState icon="🙂">No pulses yet — the trend appears after the first check-ins.</EmptyState>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
              <StatDisplay value={latest ? latest.avg.toFixed(1) : '—'} label={`This week's average (${latest?.count ?? 0} responses)`} />
              {declining && <StatDisplay value="⚠️" label={`Down from ${prev!.avg.toFixed(1)} last week — worth a conversation`} />}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, marginBottom: 8 }} data-testid="trend-chart">
              {byWeek.slice(-8).map((w) => (
                <div key={w.week} style={{ flex: 1, maxWidth: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{w.avg.toFixed(1)}</span>
                  <div style={{ width: '100%', height: `${(w.avg / 5) * 70}%`, background: w.avg >= 3.5 ? 'var(--module-accent)' : '#ff9f0a', borderRadius: '4px 4px 0 0' }} aria-hidden data-testid="trend-bar" />
                  <span style={{ fontSize: 9, color: 'var(--color-text-dim)' }}>{w.week.slice(5)}</span>
                </div>
              ))}
            </div>

            {notes.length > 0 && (
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14 }} data-testid="anonymous-notes">
                <Label>Anonymous Notes This Week</Label>
                {notes.map((n) => (
                  <p key={n.docId} style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
                    &ldquo;{n.data.note}&rdquo;
                  </p>
                ))}
              </div>
            )}

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportTrend}>
              Export Trend as CSV
            </GatedAction>
          </>
        )}
      </Section>
    </div>
  );
}
