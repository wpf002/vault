import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Recovery Tracker for Athletes — daily soreness/sleep/energy/stress
// check-in producing a 0-100 readiness score. Soreness and stress count
// inverted (low = good); the score maps to a train-hard / go-easy / rest
// recommendation.

type Checkin = { date: string; soreness: number; sleep: number; energy: number; stress: number };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// each metric contributes 0-25; soreness/stress inverted
function readiness(c: Checkin): number {
  const inv = (v: number) => 6 - v; // 1..5 -> 5..1
  const parts = [inv(c.soreness), c.sleep, c.energy, inv(c.stress)];
  return Math.round(parts.reduce((s, p) => s + ((p - 1) / 4) * 25, 0));
}

function recommendation(score: number): { label: string; icon: string } {
  if (score >= 70) return { label: 'Green — train hard', icon: '🟢' };
  if (score >= 45) return { label: 'Yellow — go easy, technique work', icon: '🟡' };
  return { label: 'Red — rest or active recovery', icon: '🔴' };
}

const METRICS: { key: keyof Omit<Checkin, 'date'>; label: string; lowGood: boolean }[] = [
  { key: 'soreness', label: 'Soreness', lowGood: true },
  { key: 'sleep', label: 'Sleep', lowGood: false },
  { key: 'energy', label: 'Energy', lowGood: false },
  { key: 'stress', label: 'Stress', lowGood: true },
];

export function RecoveryTrackerForAthletes({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [checkins, setCheckins] = useState<StoreDoc<Checkin>[] | null>(null);
  const [draft, setDraft] = useState<Omit<Checkin, 'date'>>({ soreness: 3, sleep: 3, energy: 3, stress: 3 });

  useEffect(() => {
    store.list<Checkin>('checkins').then((docs) => setCheckins(docs.sort((a, b) => a.data.date.localeCompare(b.data.date))));
  }, [store]);

  const list = checkins ?? [];
  const today = list.find((c) => c.data.date === todayStr());
  const latest = today ?? list[list.length - 1];
  const score = latest ? readiness(latest.data) : null;
  const rec = score !== null ? recommendation(score) : null;

  async function logCheckin() {
    const c: Checkin = { date: todayStr(), ...draft };
    const doc = await store.create('checkins', c);
    setCheckins((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.date.localeCompare(b.data.date)));
  }

  async function remove(docId: string) {
    await store.remove('checkins', docId);
    setCheckins((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportLog() {
    const rows = list.map((c) => `${c.data.date},${c.data.soreness},${c.data.sleep},${c.data.energy},${c.data.stress},${readiness(c.data)}`);
    const csv = ['date,soreness,sleep,energy,stress,readiness', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checkins === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="recovery-tracker-root">
      <Section title="Readiness">
        {score !== null && rec ? (
          <div style={{ marginBottom: 4 }}>
            <StatDisplay value={<span data-testid="readiness-score">{score}</span>} label={`${rec.icon} ${rec.label}${today ? '' : ' (from last check-in)'}`} />
          </div>
        ) : (
          <EmptyState icon="🩹">Log your first check-in below to get a readiness score.</EmptyState>
        )}
      </Section>

      <Divider />

      <Section title={today ? 'Checked In Today ✓' : "Today's Check-In"}>
        {!today && (
          <>
            {METRICS.map((m) => (
              <div key={m.key} style={{ marginBottom: 10 }}>
                <Label>
                  {m.label} {m.lowGood ? '(1 = None, 5 = Severe)' : '(1 = Poor, 5 = Great)'}
                </Label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDraft((d) => ({ ...d, [m.key]: n }))}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        width: 34,
                        height: 30,
                        textAlign: 'center',
                        lineHeight: '30px',
                        borderRadius: 7,
                        fontWeight: 700,
                        fontSize: 13,
                        background: draft[m.key] === n ? 'var(--module-accent)' : 'var(--color-bg)',
                        color: draft[m.key] === n ? '#0b0d10' : 'var(--color-text-dim)',
                        border: '1px solid var(--color-border)',
                      }}
                      data-testid={`${m.key}-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="primary" onClick={logCheckin} data-testid="log-checkin-button">
              + Log Check-In
            </Button>
          </>
        )}
      </Section>

      <Divider />

      <Section title="History">
        {list.length === 0 ? (
          <EmptyState icon="🩹">No check-ins yet.</EmptyState>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 10 }} data-testid="readiness-chart">
              {list.slice(-14).map((c) => {
                const s = readiness(c.data);
                return (
                  <div
                    key={c.docId}
                    title={`${c.data.date}: ${s}`}
                    style={{ flex: 1, maxWidth: 34, height: `${s}%`, background: s >= 70 ? 'var(--module-accent)' : s >= 45 ? '#ff9f0a' : '#ff6b5e', borderRadius: '3px 3px 0 0' }}
                    data-testid="readiness-bar"
                  />
                );
              })}
            </div>
            <div data-testid="checkins-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {[...list].reverse().slice(0, 7).map((c) => (
                <div key={c.docId} className="module-list-row" data-testid="checkin-item" style={{ alignItems: 'center' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 84 }}>{c.data.date}</span>
                  <div className="module-list-row-content" style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>
                    Sore {c.data.soreness} · Sleep {c.data.sleep} · Energy {c.data.energy} · Stress {c.data.stress}
                  </div>
                  <strong style={{ color: 'var(--module-accent)', fontVariantNumeric: 'tabular-nums' }}>{readiness(c.data)}</strong>
                  <IconButton label="Remove" onClick={() => remove(c.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          </>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          ⬇️ Export Recovery Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
