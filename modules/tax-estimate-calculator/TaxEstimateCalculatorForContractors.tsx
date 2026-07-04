import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Tax Estimate Calculator for Contractors — quarterly estimates from
// income minus expenses, with editable federal/state/self-employment
// rates (state selector presets common no-tax/flat-rate states).
// ESTIMATE ONLY — flat-rate approximation, not bracket-accurate; says so
// in the UI. Money is integer cents.

type Quarter = { quarter: string; incomeCents: number; expensesCents: number };
type Settings = { statePct: number; federalPct: number; seTaxPct: number };

const STATE_PRESETS: Record<string, number> = {
  'No state income tax (TX/FL/WA/…)': 0,
  'Flat ~3% (PA/IN)': 3,
  'Flat ~5% (MA/IL/UT)': 5,
  'Higher bracket ~7% (CA/NY approx)': 7,
  'Custom': -1,
};

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function estimate(q: Quarter, s: Settings) {
  const netCents = Math.max(0, q.incomeCents - q.expensesCents);
  // SE tax applies to 92.35% of net earnings
  const seCents = Math.round(netCents * 0.9235 * (s.seTaxPct / 100));
  // half of SE tax is deductible before income tax
  const taxableCents = Math.max(0, netCents - Math.round(seCents / 2));
  const federalCents = Math.round(taxableCents * (s.federalPct / 100));
  const stateCents = Math.round(taxableCents * (s.statePct / 100));
  return { netCents, seCents, federalCents, stateCents, totalCents: seCents + federalCents + stateCents };
}

export function TaxEstimateCalculatorForContractors({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [quarters, setQuarters] = useState<StoreDoc<Quarter>[] | null>(null);
  const [settings, setSettings] = useState<StoreDoc<Settings> | null | undefined>(undefined);
  const [quarter, setQuarter] = useState('Q3');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [statePreset, setStatePreset] = useState('Flat ~5% (MA/IL/UT)');
  const [customState, setCustomState] = useState('');

  useEffect(() => {
    store.list<Quarter>('quarters').then(setQuarters);
    store.list<Settings>('settings').then((docs) => setSettings(docs[0] ?? null));
  }, [store]);

  const s = settings?.data ?? { statePct: 5, federalPct: 22, seTaxPct: 15.3 };
  const yearTotals = (quarters ?? []).reduce(
    (t, q) => {
      const e = estimate(q.data, s);
      return { owed: t.owed + e.totalCents, net: t.net + e.netCents };
    },
    { owed: 0, net: 0 },
  );

  async function updateState(preset: string) {
    setStatePreset(preset);
    const pct = STATE_PRESETS[preset]!;
    if (pct === -1) return; // wait for custom input
    await saveSettings({ ...s, statePct: pct });
  }

  async function saveSettings(next: Settings) {
    if (settings) {
      const updated = await store.update('settings', settings.docId, next);
      setSettings(updated);
    } else {
      const doc = await store.create('settings', next);
      setSettings(doc);
    }
  }

  async function addQuarter() {
    if (!quarter.trim()) return;
    const q: Quarter = { quarter: quarter.trim(), incomeCents: Math.round((Number(income) || 0) * 100), expensesCents: Math.round((Number(expenses) || 0) * 100) };
    const doc = await store.create('quarters', q);
    setQuarters((prev) => [...(prev ?? []), doc]);
    setIncome('');
    setExpenses('');
  }

  async function remove(docId: string) {
    await store.remove('quarters', docId);
    setQuarters((prev) => (prev ?? []).filter((q) => q.docId !== docId));
  }

  function exportEstimates() {
    const rows = (quarters ?? []).map((q) => {
      const e = estimate(q.data, s);
      return `${q.data.quarter},${(q.data.incomeCents / 100).toFixed(2)},${(q.data.expensesCents / 100).toFixed(2)},${(e.seCents / 100).toFixed(2)},${(e.federalCents / 100).toFixed(2)},${(e.stateCents / 100).toFixed(2)},${(e.totalCents / 100).toFixed(2)}`;
    });
    const csv = ['quarter,income,expenses,self-employment tax,federal,state,total estimate', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quarterly-tax-estimates.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (quarters === null || settings === undefined) return <LoadingState />;

  return (
    <div className="module-card" data-testid="tax-estimate-calculator-root">
      <Section title="Year to Date">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 6 }}>
          <StatDisplay value={fmt(yearTotals.owed)} label="Estimated taxes owed YTD" />
          <StatDisplay value={fmt(yearTotals.net)} label="Net self-employment income YTD" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>
          Flat-rate estimate for planning only — not bracket-accurate, not tax advice.
        </p>
      </Section>

      <Divider />

      <Section title="Rates">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Label>State</Label>
            <Select value={statePreset} onChange={(e) => updateState(e.target.value)} data-testid="state-select">
              {Object.keys(STATE_PRESETS).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          {statePreset === 'Custom' && (
            <div style={{ width: 110 }}>
              <Label>State %</Label>
              <Input
                type="number"
                value={customState}
                onChange={(e) => setCustomState(e.target.value)}
                onBlur={() => saveSettings({ ...s, statePct: Number(customState) || 0 })}
                data-testid="custom-state-input"
                style={{ width: '100%' }}
              />
            </div>
          )}
          <div style={{ width: 110 }}>
            <Label>Federal %</Label>
            <Input type="number" value={s.federalPct} onChange={(e) => saveSettings({ ...s, federalPct: Number(e.target.value) || 0 })} data-testid="federal-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>SE Tax %</Label>
            <Input type="number" step="0.1" value={s.seTaxPct} onChange={(e) => saveSettings({ ...s, seTaxPct: Number(e.target.value) || 0 })} data-testid="se-input" style={{ width: '100%' }} />
          </div>
        </div>
      </Section>

      <Divider />

      <Section title="Quarterly Estimates">
        {quarters.length === 0 ? (
          <EmptyState icon="🧮">No quarters logged — add income below.</EmptyState>
        ) : (
          <div data-testid="quarters-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {quarters.map((q) => {
              const e = estimate(q.data, s);
              return (
                <div key={q.docId} className="module-list-row" data-testid="quarter-item" style={{ alignItems: 'center' }}>
                  <span style={{ color: 'var(--module-accent)', fontWeight: 700, minWidth: 32 }}>{q.data.quarter}</span>
                  <div className="module-list-row-content" style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(q.data.incomeCents)} income − {fmt(q.data.expensesCents)} expenses · SE {fmt(e.seCents)} + Fed {fmt(e.federalCents)} + State {fmt(e.stateCents)}
                  </div>
                  <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)' }} data-testid={`estimate-${q.data.quarter}`}>
                    {fmt(e.totalCents)}
                  </strong>
                  <IconButton label="Remove" onClick={() => remove(q.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 90 }}>
            <Label>Quarter</Label>
            <Input value={quarter} onChange={(e) => setQuarter(e.target.value)} placeholder="Q3" data-testid="quarter-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Income ($)</Label>
            <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} data-testid="income-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Expenses ($)</Label>
            <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} data-testid="expenses-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addQuarter} data-testid="add-quarter-button">
            + Add Quarter
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportEstimates}>
          Export Estimates as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
