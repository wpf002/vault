import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Budget-to-Actual Comparison Tool — projected vs. real spend per category
// with variance bars: budget is the track, actual is the fill (red when
// over), variance labeled per line and totaled. Money is integer cents.

type Line = { category: string; budgetCents: number; actualCents: number };

function fmt(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BudgetToActualComparisonTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [lines, setLines] = useState<StoreDoc<Line>[] | null>(null);
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [actualDrafts, setActualDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Line>('lines').then(setLines);
  }, [store]);

  const totalBudget = (lines ?? []).reduce((s, l) => s + l.data.budgetCents, 0);
  const totalActual = (lines ?? []).reduce((s, l) => s + l.data.actualCents, 0);
  const totalVariance = totalBudget - totalActual;

  async function addLine() {
    if (!category.trim()) return;
    const l: Line = { category: category.trim(), budgetCents: Math.round((Number(budget) || 0) * 100), actualCents: 0 };
    const doc = await store.create('lines', l);
    setLines((prev) => [...(prev ?? []), doc]);
    setCategory('');
    setBudget('');
  }

  async function updateActual(doc: StoreDoc<Line>) {
    const value = actualDrafts[doc.docId];
    if (value === undefined || value === '') return;
    const updated = await store.update('lines', doc.docId, { ...doc.data, actualCents: Math.round(Number(value) * 100) });
    setLines((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
    setActualDrafts((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function remove(docId: string) {
    await store.remove('lines', docId);
    setLines((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  function exportReport() {
    const rows = (lines ?? []).map((l) => `"${l.data.category}",${(l.data.budgetCents / 100).toFixed(2)},${(l.data.actualCents / 100).toFixed(2)},${((l.data.budgetCents - l.data.actualCents) / 100).toFixed(2)}`);
    const csv = ['category,budget,actual,variance', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-vs-actual.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (lines === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="budget-to-actual-root">
      <Section title="Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={fmt(totalBudget)} label="Total budgeted" />
          <StatDisplay value={fmt(totalActual)} label="Total actual" />
          <StatDisplay
            value={<span style={{ color: totalVariance >= 0 ? undefined : '#ff6b5e' }} data-testid="total-variance">{fmt(totalVariance)}</span>}
            label={totalVariance >= 0 ? 'Under budget' : 'Over budget'}
          />
        </div>
      </Section>

      <Divider />

      <Section title="By Category">
        {lines.length === 0 ? (
          <EmptyState icon="📉">No budget lines yet — add one below.</EmptyState>
        ) : (
          <div data-testid="lines-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {lines.map((l) => {
              const over = l.data.actualCents > l.data.budgetCents;
              const pct = l.data.budgetCents ? Math.min(100, (l.data.actualCents / l.data.budgetCents) * 100) : 0;
              const variance = l.data.budgetCents - l.data.actualCents;
              return (
                <div key={l.docId} data-testid="line-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 13, flex: 1 }}>{l.data.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(l.data.actualCents)} / {fmt(l.data.budgetCents)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: over ? '#ff6b5e' : 'var(--module-accent)' }} data-testid={`variance-${l.data.category}`}>
                      {over ? `${fmt(-variance)} over` : `${fmt(variance)} left`}
                    </span>
                    <IconButton label="Remove" onClick={() => remove(l.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ height: 12, borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: over ? '#ff6b5e' : 'var(--module-accent)' }} aria-hidden />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input
                      type="number"
                      value={actualDrafts[l.docId] ?? ''}
                      onChange={(e) => setActualDrafts((prev) => ({ ...prev, [l.docId]: e.target.value }))}
                      placeholder="Update actual ($)"
                      data-testid={`actual-input-${l.docId}`}
                      style={{ width: 150, padding: '5px 8px', fontSize: 12 }}
                    />
                    <Button variant="ghost" onClick={() => updateActual(l)} data-testid={`update-${l.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Update
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Marketing" data-testid="category-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Budget ($)</Label>
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="budget-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addLine} data-testid="add-line-button">
            + Add Line
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          Export Variance Report as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
