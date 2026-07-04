import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Wealth & Asset Management App — holdings with cost basis vs. marked
// price, gain/loss analysis, and allocation-by-asset-class breakdown.
// Scope note: "real-time market data" is a paid market-data feed
// integration — prices here are user-marked (mark-to-market on demand);
// the portfolio analysis math is the substance. Money is integer cents;
// quantity supports fractions (crypto), so position value rounds once.

type Holding = { name: string; ticker: string; assetClass: string; quantity: number; costBasisCents: number; currentPriceCents: number };

const ASSET_CLASSES = ['Stocks', 'Bonds', 'Crypto', 'Real Estate', 'Cash', 'Commodities'];

function positionCents(h: Holding): number {
  return Math.round(h.quantity * h.currentPriceCents);
}

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function signed(cents: number): string {
  return `${cents < 0 ? '−' : '+'}${fmt(cents)}`;
}

export function WealthAssetManagementApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [holdings, setHoldings] = useState<StoreDoc<Holding>[] | null>(null);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetClass, setAssetClass] = useState('Stocks');
  const [quantity, setQuantity] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [price, setPrice] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Holding>('holdings').then(setHoldings);
  }, [store]);

  const list = holdings ?? [];
  const totalValueCents = list.reduce((s, h) => s + positionCents(h.data), 0);
  const totalCostCents = list.reduce((s, h) => s + h.data.costBasisCents, 0);
  const gainCents = totalValueCents - totalCostCents;
  const gainPct = totalCostCents > 0 ? (gainCents / totalCostCents) * 100 : 0;

  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of list) map.set(h.data.assetClass, (map.get(h.data.assetClass) ?? 0) + positionCents(h.data));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [list]);

  async function addHolding() {
    if (!name.trim() || !ticker.trim()) return;
    const h: Holding = {
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      assetClass,
      quantity: Number(quantity) || 0,
      costBasisCents: Math.round((Number(costBasis) || 0) * 100),
      currentPriceCents: Math.round((Number(price) || 0) * 100),
    };
    const doc = await store.create('holdings', h);
    setHoldings((prev) => [...(prev ?? []), doc]);
    setName('');
    setTicker('');
    setQuantity('');
    setCostBasis('');
    setPrice('');
  }

  async function markPrice(doc: StoreDoc<Holding>) {
    const p = Math.round((Number(marks[doc.docId]) || 0) * 100);
    if (p <= 0) return;
    const updated = await store.update('holdings', doc.docId, { ...doc.data, currentPriceCents: p });
    setHoldings((prev) => (prev ?? []).map((h) => (h.docId === doc.docId ? updated : h)));
    setMarks((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function remove(docId: string) {
    await store.remove('holdings', docId);
    setHoldings((prev) => (prev ?? []).filter((h) => h.docId !== docId));
  }

  function exportPortfolio() {
    const rows = list.map((h) => {
      const v = positionCents(h.data);
      return `${h.data.ticker},"${h.data.name}",${h.data.assetClass},${h.data.quantity},${(h.data.costBasisCents / 100).toFixed(2)},${(h.data.currentPriceCents / 100).toFixed(2)},${(v / 100).toFixed(2)},${((v - h.data.costBasisCents) / 100).toFixed(2)}`;
    });
    const csv = ['ticker,name,asset class,quantity,cost basis,marked price,position value,gain/loss', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (holdings === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="wealth-asset-management-root">
      <Section title="Portfolio Analysis">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={<span data-testid="total-value">{fmt(totalValueCents)}</span>} label={`${list.length} positions`} />
          <StatDisplay
            value={
              <span data-testid="gain-value" style={{ color: gainCents >= 0 ? '#39d98a' : '#ff6b5e' }}>
                {signed(gainCents)}
              </span>
            }
            label={`${gainPct >= 0 ? '+' : '−'}${Math.abs(gainPct).toFixed(1)}% vs. cost basis`}
          />
          <StatDisplay value={fmt(totalCostCents)} label="Total cost basis" />
        </div>
      </Section>

      <Divider />

      <Section title="Allocation">
        {allocation.length === 0 ? (
          <EmptyState icon="💎">No holdings — add your first position below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="allocation-bars">
            {allocation.map(([cls, cents]) => {
              const pct = totalValueCents > 0 ? (cents / totalValueCents) * 100 : 0;
              return (
                <div key={cls} data-testid={`allocation-${cls}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: 'var(--color-text)' }}>{cls}</span>
                    <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {pct.toFixed(1)}% · {fmt(cents)}
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--module-accent)', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Holdings">
        {list.length === 0 ? (
          <EmptyState icon="📊">No positions yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="holdings-list">
            {list.map((h) => {
              const v = positionCents(h.data);
              const g = v - h.data.costBasisCents;
              return (
                <div key={h.docId} className="module-list-row" data-testid="holding-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--module-accent)', fontWeight: 700, minWidth: 44 }}>{h.data.ticker}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, flex: 1 }}>{h.data.name}</span>
                    <span style={{ fontSize: 12, color: g >= 0 ? '#39d98a' : '#ff6b5e', fontVariantNumeric: 'tabular-nums' }} data-testid={`gain-${h.data.ticker}`}>
                      {signed(g)}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }} data-testid={`value-${h.data.ticker}`}>
                      {fmt(v)}
                    </span>
                    <IconButton label="Remove" onClick={() => remove(h.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-dim)' }}>
                    <span>
                      {h.data.quantity} × {fmt(h.data.currentPriceCents)} · {h.data.assetClass}
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <Input
                        type="number"
                        value={marks[h.docId] ?? ''}
                        onChange={(e) => setMarks((prev) => ({ ...prev, [h.docId]: e.target.value }))}
                        placeholder="New price"
                        data-testid={`mark-input-${h.data.ticker}`}
                        style={{ width: 100, fontSize: 12, padding: '4px 8px' }}
                      />
                      <Button variant="ghost" onClick={() => markPrice(h)} data-testid={`mark-button-${h.data.ticker}`} style={{ padding: '4px 10px', fontSize: 12 }}>
                        Mark Price
                      </Button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emerging Markets" data-testid="name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 80 }}>
            <Label>Ticker</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="VWO" data-testid="ticker-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Asset Class</Label>
            <Select value={assetClass} onChange={(e) => setAssetClass(e.target.value)} data-testid="class-select" style={{ width: '100%' }}>
              {ASSET_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 90 }}>
            <Label>Quantity</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} data-testid="quantity-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Cost Basis ($)</Label>
            <Input type="number" value={costBasis} onChange={(e) => setCostBasis(e.target.value)} data-testid="basis-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="price-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addHolding} data-testid="add-holding-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPortfolio}>
          Export Portfolio as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
