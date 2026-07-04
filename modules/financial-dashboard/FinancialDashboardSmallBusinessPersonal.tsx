import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Financial Dashboard (Small Business/Personal) — monthly revenue vs.
// expenses with margin math done locally in integer cents; the AI part
// is the forecast: your actuals go to the proxy and come back as a
// plain-language revenue outlook with the caveats a good bookkeeper
// would add. Forecasts are clearly labeled estimates, not financial
// advice. CONTRACT.md #11 failure states rendered.

type MonthRow = { month: string; revenueCents: number; expensesCents: number };
type Forecast = { summary: string; basedOn: string };

const SYSTEM_PROMPT = [
  'You are a pragmatic bookkeeper analyzing monthly revenue and expense actuals.',
  'Give a short revenue outlook for the next 2 months: the trend, a realistic range, and one thing to watch on costs.',
  '3-4 sentences, plain text, no lists, no preamble. Ranges over point estimates.',
  'This is a planning estimate, never guaranteed — do not give investment or tax advice.',
].join(' ');

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function FinancialDashboardSmallBusinessPersonal({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [months, setMonths] = useState<StoreDoc<MonthRow>[] | null>(null);
  const [forecasts, setForecasts] = useState<StoreDoc<Forecast>[] | null>(null);
  const [month, setMonth] = useState('');
  const [revenue, setRevenue] = useState('');
  const [expenses, setExpenses] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<MonthRow>('months').then(setMonths);
    store.list<Forecast>('forecasts').then(setForecasts);
  }, [store]);

  const sorted = useMemo(() => [...(months ?? [])].sort((a, b) => a.data.month.localeCompare(b.data.month)), [months]);
  const latest = sorted[sorted.length - 1];
  const latestProfit = latest ? latest.data.revenueCents - latest.data.expensesCents : 0;
  const latestMargin = latest && latest.data.revenueCents > 0 ? (latestProfit / latest.data.revenueCents) * 100 : 0;
  const maxRevenue = Math.max(1, ...sorted.map((m) => m.data.revenueCents));

  async function addMonth() {
    if (!month) return;
    const row: MonthRow = { month, revenueCents: Math.round((Number(revenue) || 0) * 100), expensesCents: Math.round((Number(expenses) || 0) * 100) };
    const doc = await store.create('months', row);
    setMonths((prev) => [...(prev ?? []), doc]);
    setMonth('');
    setRevenue('');
    setExpenses('');
  }

  async function removeMonth(docId: string) {
    await store.remove('months', docId);
    setMonths((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  async function forecast() {
    if (!ai || working || sorted.length < 3) return;
    setWorking(true);
    setFailure(null);
    const rows = sorted.map((m) => `${m.data.month}: revenue ${fmt(m.data.revenueCents)}, expenses ${fmt(m.data.expensesCents)}`);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Monthly actuals:\n${rows.join('\n')}`, maxTokens: 350 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const doc = await store.create('forecasts', { summary: res.text.trim(), basedOn: `${sorted.length} months of actuals` });
    setForecasts((prev) => [doc, ...(prev ?? [])]);
  }

  async function removeForecast(docId: string) {
    await store.remove('forecasts', docId);
    setForecasts((prev) => (prev ?? []).filter((f) => f.docId !== docId));
  }

  function exportActuals() {
    const rows = sorted.map((m) => `${m.data.month},${(m.data.revenueCents / 100).toFixed(2)},${(m.data.expensesCents / 100).toFixed(2)},${((m.data.revenueCents - m.data.expensesCents) / 100).toFixed(2)}`);
    const csv = ['month,revenue,expenses,profit', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financials.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (months === null || forecasts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="financial-dashboard-root">
      <Section title="Dashboard">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={latest ? fmt(latest.data.revenueCents) : '—'} label={latest ? `Revenue · ${latest.data.month}` : 'Revenue'} />
          <StatDisplay
            value={<span data-testid="profit-value" style={{ color: latestProfit >= 0 ? '#39d98a' : '#ff6b5e' }}>{latest ? fmt(latestProfit) : '—'}</span>}
            label={latest ? `Profit · ${latestMargin.toFixed(0)}% margin` : 'Profit'}
          />
          <StatDisplay value={sorted.length} label="Months tracked" />
        </div>
        {sorted.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }} data-testid="revenue-chart">
            {sorted.map((m) => (
              <div key={m.docId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', position: 'relative', height: 60, display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${(m.data.revenueCents / maxRevenue) * 60}px`, borderRadius: 4, background: 'var(--module-accent)', opacity: 0.9 }} />
                  <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(m.data.expensesCents / maxRevenue) * 60}px`, borderRadius: 4, background: 'rgba(255,255,255,0.18)' }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--color-text-dim)' }}>{m.data.month.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'var(--color-text-dim)', margin: '6px 0 0' }}>Bars: revenue (accent) with expenses overlaid (grey).</p>
      </Section>

      <Divider />

      <Section title="AI Revenue Forecast">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={forecast} data-testid="forecast-button" disabled={working || sorted.length < 3}>
              {working ? 'Forecasting…' : 'Forecast Next 2 Months'}
            </Button>
            {sorted.length < 3 && <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Track at least 3 months first.</span>}
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Planning estimate, not financial advice.</span>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited forecasts.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Forecasting needs an account, even to try it — sign in for a few free runs.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free forecasts are used up — unlock the app to keep them coming.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 Forecasting is offline right now — your books are untouched, try again in a bit.
            </div>
          )}

          {forecasts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="forecasts-list">
              {forecasts.map((f) => (
                <div key={f.docId} className="module-list-row" data-testid="forecast-item" style={{ alignItems: 'flex-start' }}>
                  <span style={{ minWidth: 24 }}>🔮</span>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontSize: 13, lineHeight: 1.6 }}>{f.data.summary}</span>
                    <div style={{ fontSize: 11, marginTop: 4, color: 'var(--color-text-dim)' }}>Based on {f.data.basedOn} · estimate only</div>
                  </div>
                  <IconButton label="Remove" onClick={() => removeForecast(f.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Monthly Actuals">
        {sorted.length === 0 ? (
          <EmptyState icon="🏦">No months tracked — add your first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="months-list">
            {sorted.map((m) => {
              const profit = m.data.revenueCents - m.data.expensesCents;
              return (
                <div key={m.docId} className="module-list-row" data-testid="month-item" style={{ alignItems: 'center' }}>
                  <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 70 }}>{m.data.month}</span>
                  <div className="module-list-row-content" style={{ flex: 1, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(m.data.revenueCents)} in · {fmt(m.data.expensesCents)} out
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: profit >= 0 ? '#39d98a' : '#ff6b5e' }} data-testid={`profit-${m.data.month}`}>
                    {profit >= 0 ? '+' : '−'}{fmt(Math.abs(profit))}
                  </span>
                  <IconButton label="Remove" onClick={() => removeMonth(m.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 140 }}>
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="month-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Revenue ($)</Label>
            <Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} data-testid="revenue-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Expenses ($)</Label>
            <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} data-testid="expenses-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMonth} data-testid="add-month-button">
            + Add Month
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportActuals}>
          Export Actuals as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
