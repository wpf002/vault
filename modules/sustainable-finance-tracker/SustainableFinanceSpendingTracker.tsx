import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Sustainable Finance & Spending Tracker — purchases scored with a
// rule-based carbon-intensity table (kg CO2e per dollar by category,
// published spend-based emission factor ballparks). Clearly an estimate;
// per-product lifecycle data would be a third-party dataset integration.
// Money is integer cents.

type Purchase = { merchant: string; amountCents: number; category: string };

// spend-based emission factors, kg CO2e per USD (rounded ballparks)
const FACTORS: Record<string, { perDollar: number; label: string }> = {
  Flights: { perDollar: 1.1, label: '✈️ Flights' },
  Gasoline: { perDollar: 1.0, label: '⛽ Gasoline' },
  'Meat & Dairy': { perDollar: 0.9, label: '🥩 Meat & Dairy' },
  Electronics: { perDollar: 0.45, label: '📱 Electronics' },
  Clothing: { perDollar: 0.4, label: '👕 Clothing' },
  Groceries: { perDollar: 0.35, label: '🛒 Groceries' },
  'Public Transit': { perDollar: 0.15, label: '🚇 Public Transit' },
  Secondhand: { perDollar: 0.05, label: '♻️ Secondhand' },
};

function kgFor(p: Purchase): number {
  return (p.amountCents / 100) * (FACTORS[p.category]?.perDollar ?? 0.4);
}

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function SustainableFinanceSpendingTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [purchases, setPurchases] = useState<StoreDoc<Purchase>[] | null>(null);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');

  useEffect(() => {
    store.list<Purchase>('purchases').then(setPurchases);
  }, [store]);

  const list = purchases ?? [];
  const totalSpendCents = list.reduce((s, p) => s + p.data.amountCents, 0);
  const totalKg = list.reduce((s, p) => s + kgFor(p.data), 0);
  const avgIntensity = totalSpendCents > 0 ? totalKg / (totalSpendCents / 100) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, { kg: number; cents: number }>();
    for (const p of list) {
      const cur = map.get(p.data.category) ?? { kg: 0, cents: 0 };
      map.set(p.data.category, { kg: cur.kg + kgFor(p.data), cents: cur.cents + p.data.amountCents });
    }
    return Array.from(map.entries()).sort((a, b) => b[1].kg - a[1].kg);
  }, [list]);

  const maxKg = byCategory.length > 0 ? byCategory[0]![1].kg : 0;

  async function addPurchase() {
    if (!merchant.trim()) return;
    const p: Purchase = { merchant: merchant.trim(), amountCents: Math.round((Number(amount) || 0) * 100), category };
    const doc = await store.create('purchases', p);
    setPurchases((prev) => [doc, ...(prev ?? [])]);
    setMerchant('');
    setAmount('');
  }

  async function remove(docId: string) {
    await store.remove('purchases', docId);
    setPurchases((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportFootprint() {
    const rows = list.map((p) => `"${p.data.merchant}",${(p.data.amountCents / 100).toFixed(2)},${p.data.category},${kgFor(p.data).toFixed(1)}`);
    const csv = ['merchant,amount,category,estimated kg CO2e', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spending-footprint.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (purchases === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="sustainable-finance-tracker-root">
      <Section title="Footprint Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 6 }}>
          <StatDisplay value={<span data-testid="total-kg">{totalKg.toFixed(0)} kg</span>} label="Estimated CO2e from spending" />
          <StatDisplay value={fmt(totalSpendCents)} label={`${list.length} purchases tracked`} />
          <StatDisplay value={`${avgIntensity.toFixed(2)} kg/$`} label="Average carbon intensity" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>
          Spend-based estimate using category-average emission factors — a planning signal, not a measurement.
        </p>
      </Section>

      <Divider />

      <Section title="Impact by Category">
        {byCategory.length === 0 ? (
          <EmptyState icon="🌍">Nothing tracked yet — log a purchase below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }} data-testid="category-bars">
            {byCategory.map(([cat, v]) => (
              <div key={cat} data-testid={`impact-${cat}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--color-text)' }}>{FACTORS[cat]?.label ?? cat}</span>
                  <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {v.kg.toFixed(1)} kg · {fmt(v.cents)}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${maxKg > 0 ? (v.kg / maxKg) * 100 : 0}%`, background: 'var(--module-accent)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Purchases">
        {list.length === 0 ? (
          <EmptyState icon="🧾">No purchases logged.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="purchases-list">
            {list.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="purchase-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.merchant}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{FACTORS[p.data.category]?.label ?? p.data.category}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{kgFor(p.data).toFixed(1)} kg CO2e</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(p.data.amountCents)}</span>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Merchant</Label>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Corner Grocery" data-testid="merchant-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Amount ($)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="amount-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-select" style={{ width: '100%' }}>
              {Object.keys(FACTORS).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={addPurchase} data-testid="add-purchase-button">
            + Log Purchase
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportFootprint}>
          ⬇️ Export Footprint as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
