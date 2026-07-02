import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Newsletter Monetization Dashboard — tracks subscribers, revenue, and
// growth trends month over month. Bars are pure CSS (no chart dependency).
// Money is integer cents. Scope note: pulling numbers straight from
// Substack/Mailchimp/Stripe is a third-party integration; you log the
// monthly snapshot, the dashboard does the trend math.

type MonthRow = { month: string; freeSubs: number; paidSubs: number; revenueCents: number };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pctChange(prev: number, curr: number): string {
  if (prev === 0) return '—';
  const pct = ((curr - prev) / prev) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export function NewsletterMonetizationDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [months, setMonths] = useState<StoreDoc<MonthRow>[] | null>(null);
  const [month, setMonth] = useState('');
  const [freeSubs, setFreeSubs] = useState('');
  const [paidSubs, setPaidSubs] = useState('');
  const [revenue, setRevenue] = useState('');

  useEffect(() => {
    store.list<MonthRow>('months').then((docs) => setMonths(docs.sort((a, b) => a.data.month.localeCompare(b.data.month))));
  }, [store]);

  const latest = (months ?? [])[months ? months.length - 1 : 0];
  const prev = (months ?? [])[months ? months.length - 2 : 0];
  const maxRevenue = Math.max(1, ...(months ?? []).map((m) => m.data.revenueCents));
  const conversion = latest ? ((latest.data.paidSubs / Math.max(1, latest.data.paidSubs + latest.data.freeSubs)) * 100).toFixed(1) : '—';

  async function addMonth() {
    if (!month) return;
    const row: MonthRow = { month, freeSubs: Number(freeSubs) || 0, paidSubs: Number(paidSubs) || 0, revenueCents: Math.round((Number(revenue) || 0) * 100) };
    const doc = await store.create('months', row);
    setMonths((prevList) => [...(prevList ?? []), doc].sort((a, b) => a.data.month.localeCompare(b.data.month)));
    setMonth('');
    setFreeSubs('');
    setPaidSubs('');
    setRevenue('');
  }

  async function remove(docId: string) {
    await store.remove('months', docId);
    setMonths((prevList) => (prevList ?? []).filter((m) => m.docId !== docId));
  }

  function exportReport() {
    const rows = (months ?? []).map((m) => `${m.data.month},${m.data.freeSubs},${m.data.paidSubs},${(m.data.revenueCents / 100).toFixed(2)}`);
    const csv = ['month,free subscribers,paid subscribers,revenue', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-growth.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (months === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="newsletter-monetization-root">
      <Section title="This Month">
        {latest ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
            <StatDisplay value={fmt(latest.data.revenueCents)} label={`Revenue ${prev ? `(${pctChange(prev.data.revenueCents, latest.data.revenueCents)} MoM)` : ''}`} />
            <StatDisplay value={latest.data.paidSubs.toLocaleString()} label={`Paid subs ${prev ? `(${pctChange(prev.data.paidSubs, latest.data.paidSubs)})` : ''}`} />
            <StatDisplay value={latest.data.freeSubs.toLocaleString()} label={`Free subs ${prev ? `(${pctChange(prev.data.freeSubs, latest.data.freeSubs)})` : ''}`} />
            <StatDisplay value={`${conversion}%`} label="Paid conversion rate" />
          </div>
        ) : (
          <EmptyState icon="📰">No months logged yet — add your first snapshot below.</EmptyState>
        )}
      </Section>

      {months.length > 0 && (
        <>
          <Divider />
          <Section title="Revenue Trend">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 6 }} data-testid="revenue-chart">
              {months.map((m) => (
                <div key={m.docId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{fmt(m.data.revenueCents)}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 56,
                      height: `${Math.max(4, (m.data.revenueCents / maxRevenue) * 80)}%`,
                      background: 'var(--module-accent)',
                      borderRadius: '4px 4px 0 0',
                      opacity: m.docId === latest?.docId ? 1 : 0.55,
                    }}
                    data-testid="revenue-bar"
                  />
                  <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{m.data.month.slice(5)}</span>
                </div>
              ))}
            </div>
          </Section>

          <Divider />

          <Section title="Monthly Log">
            <div data-testid="months-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {[...months].reverse().map((m) => (
                <div key={m.docId} className="module-list-row" data-testid="month-item" style={{ alignItems: 'center' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 70 }}>{m.data.month}</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    {m.data.freeSubs.toLocaleString()} free · {m.data.paidSubs.toLocaleString()} paid · {fmt(m.data.revenueCents)}
                  </div>
                  <IconButton label="Remove" onClick={() => remove(m.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
              ⬇️ Export Growth Report as CSV
            </GatedAction>
          </Section>
        </>
      )}

      <Divider />

      <Section title="Log a Month">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 140 }}>
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="month-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Free Subs</Label>
            <Input type="number" value={freeSubs} onChange={(e) => setFreeSubs(e.target.value)} data-testid="free-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Paid Subs</Label>
            <Input type="number" value={paidSubs} onChange={(e) => setPaidSubs(e.target.value)} data-testid="paid-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Revenue ($)</Label>
            <Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} data-testid="revenue-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMonth} data-testid="add-month-button">
            + Log Month
          </Button>
        </div>
      </Section>
    </div>
  );
}
