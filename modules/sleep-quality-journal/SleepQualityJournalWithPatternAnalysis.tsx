import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Sleep Quality Journal with Pattern Analysis — nightly entries (hours,
// 1-5 quality, two habit flags) with a trend chart and real pattern math:
// average quality on nights WITH vs WITHOUT each habit, surfaced as
// plain-language findings when the gap is meaningful (≥0.7).

type Night = { date: string; hours: number; quality: number; caffeineAfternoon: boolean; screensLate: boolean };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export function SleepQualityJournalWithPatternAnalysis({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [nights, setNights] = useState<StoreDoc<Night>[] | null>(null);
  const [hours, setHours] = useState('7.5');
  const [quality, setQuality] = useState(3);
  const [caffeine, setCaffeine] = useState(false);
  const [screens, setScreens] = useState(false);

  useEffect(() => {
    store.list<Night>('nights').then((docs) => setNights(docs.sort((a, b) => a.data.date.localeCompare(b.data.date))));
  }, [store]);

  const list = nights ?? [];
  const avgHours = avg(list.map((n) => n.data.hours));
  const avgQuality = avg(list.map((n) => n.data.quality));

  const findings = useMemo(() => {
    const out: string[] = [];
    const factors: { key: 'caffeineAfternoon' | 'screensLate'; label: string }[] = [
      { key: 'caffeineAfternoon', label: 'afternoon caffeine' },
      { key: 'screensLate', label: 'late screens' },
    ];
    for (const f of factors) {
      const withF = list.filter((n) => n.data[f.key]).map((n) => n.data.quality);
      const withoutF = list.filter((n) => !n.data[f.key]).map((n) => n.data.quality);
      if (withF.length >= 2 && withoutF.length >= 2) {
        const gap = avg(withoutF) - avg(withF);
        if (gap >= 0.7) out.push(`Nights without ${f.label} average ${gap.toFixed(1)} points better sleep quality (${avg(withoutF).toFixed(1)} vs ${avg(withF).toFixed(1)}).`);
      }
    }
    // hours vs quality: compare short (<7h) to full nights
    const short = list.filter((n) => n.data.hours < 7).map((n) => n.data.quality);
    const full = list.filter((n) => n.data.hours >= 7).map((n) => n.data.quality);
    if (short.length >= 2 && full.length >= 2) {
      const gap = avg(full) - avg(short);
      if (gap >= 0.7) out.push(`7+ hour nights rate ${gap.toFixed(1)} points higher than short nights (${avg(full).toFixed(1)} vs ${avg(short).toFixed(1)}).`);
    }
    return out;
  }, [list]);

  async function logNight() {
    const n: Night = { date: todayStr(), hours: Number(hours) || 0, quality, caffeineAfternoon: caffeine, screensLate: screens };
    const doc = await store.create('nights', n);
    setNights((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.date.localeCompare(b.data.date)));
  }

  async function remove(docId: string) {
    await store.remove('nights', docId);
    setNights((prev) => (prev ?? []).filter((n) => n.docId !== docId));
  }

  function exportJournal() {
    const rows = list.map((n) => `${n.data.date},${n.data.hours},${n.data.quality},${n.data.caffeineAfternoon ? 'yes' : 'no'},${n.data.screensLate ? 'yes' : 'no'}`);
    const csv = ['date,hours,quality,afternoon caffeine,late screens', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sleep-journal.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (nights === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="sleep-quality-journal-root">
      <Section title="Trends">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <StatDisplay value={avgHours.toFixed(1)} label="Average hours" />
          <StatDisplay value={`${avgQuality.toFixed(1)}/5`} label="Average quality" />
        </div>

        {list.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 6 }} data-testid="quality-chart">
            {list.slice(-14).map((n) => (
              <div
                key={n.docId}
                title={`${n.data.date}: ${n.data.quality}/5, ${n.data.hours}h`}
                style={{
                  flex: 1,
                  maxWidth: 32,
                  height: `${(n.data.quality / 5) * 100}%`,
                  background: n.data.quality >= 4 ? 'var(--module-accent)' : n.data.quality >= 3 ? 'color-mix(in srgb, var(--module-accent) 55%, transparent)' : '#ff6b5e',
                  borderRadius: '3px 3px 0 0',
                }}
                data-testid="quality-bar"
              />
            ))}
          </div>
        )}

        {findings.length > 0 && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 12 }} data-testid="findings">
            <Label>Patterns Found</Label>
            {findings.map((f, i) => (
              <p key={i} style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
                💡 {f}
              </p>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Log Last Night">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 100 }}>
            <Label>Hours</Label>
            <Input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} data-testid="hours-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Quality</Label>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setQuality(n)} style={{ all: 'unset', cursor: 'pointer', fontSize: 20, color: n <= quality ? 'var(--module-accent)' : 'var(--color-border)' }} data-testid={`quality-${n}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <Button variant={caffeine ? 'primary' : 'secondary'} onClick={() => setCaffeine((c) => !c)} data-testid="caffeine-toggle">
            Afternoon Caffeine
          </Button>
          <Button variant={screens ? 'primary' : 'secondary'} onClick={() => setScreens((s) => !s)} data-testid="screens-toggle">
            Late Screens
          </Button>
          <Button variant="primary" onClick={logNight} data-testid="log-night-button">
            + Log Night
          </Button>
        </div>

        {list.length === 0 ? (
          <EmptyState icon="😴">No nights logged yet.</EmptyState>
        ) : (
          <div data-testid="nights-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {[...list].reverse().slice(0, 10).map((n) => (
              <div key={n.docId} className="module-list-row" data-testid="night-item" style={{ alignItems: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 84 }}>{n.data.date}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  {n.data.hours}h · {'★'.repeat(n.data.quality)}
                  {n.data.caffeineAfternoon && ' · ☕'}
                  {n.data.screensLate && ' · 📱'}
                </div>
                <IconButton label="Remove" onClick={() => remove(n.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportJournal}>
          Export Journal as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
