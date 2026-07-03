import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Fractional Real Estate & Asset Ownership App — track fractional shares
// in listed assets, buy/sell shares against a fixed share count, and log
// income distributions (yield-bearing assets pay monthlyYieldPct of your
// stake). Scope note: real securities offerings are regulated broker
// integrations — the cap-table math and portfolio tracking live here.
// Money is integer cents; share price = totalValue / totalShares.

type Asset = { name: string; type: 'real_estate' | 'art' | 'collectible'; totalValueCents: number; totalShares: number; ownedShares: number; monthlyYieldPct: number };
type Distribution = { asset: string; amountCents: number; note: string };

const TYPE_LABELS: Record<Asset['type'], string> = {
  real_estate: '🏠 Real Estate',
  art: '🖼️ Art',
  collectible: '⌚ Collectible',
};

function sharePriceCents(a: Asset): number {
  return a.totalShares > 0 ? Math.round(a.totalValueCents / a.totalShares) : 0;
}

function stakeCents(a: Asset): number {
  return sharePriceCents(a) * a.ownedShares;
}

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function FractionalRealEstateAssetOwnershipApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [assets, setAssets] = useState<StoreDoc<Asset>[] | null>(null);
  const [distributions, setDistributions] = useState<StoreDoc<Distribution>[] | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('real_estate');
  const [totalValue, setTotalValue] = useState('');
  const [totalShares, setTotalShares] = useState('');
  const [trades, setTrades] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Asset>('assets').then(setAssets);
    store.list<Distribution>('distributions').then(setDistributions);
  }, [store]);

  const list = assets ?? [];
  const portfolioCents = list.reduce((s, a) => s + stakeCents(a.data), 0);
  const monthlyIncomeCents = list.reduce((s, a) => s + Math.round(stakeCents(a.data) * (a.data.monthlyYieldPct / 100)), 0);
  const totalDistributedCents = (distributions ?? []).reduce((s, d) => s + d.data.amountCents, 0);

  async function addAsset() {
    if (!name.trim()) return;
    const shares = Math.max(1, Math.round(Number(totalShares) || 0));
    const a: Asset = { name: name.trim(), type, totalValueCents: Math.round((Number(totalValue) || 0) * 100), totalShares: shares, ownedShares: 0, monthlyYieldPct: type === 'real_estate' ? 0.5 : 0 };
    const doc = await store.create('assets', a);
    setAssets((prev) => [...(prev ?? []), doc]);
    setName('');
    setTotalValue('');
    setTotalShares('');
  }

  async function trade(doc: StoreDoc<Asset>, direction: 1 | -1) {
    const qty = Math.round(Number(trades[doc.docId]) || 0);
    if (qty <= 0) return;
    const nextOwned = Math.max(0, Math.min(doc.data.totalShares, doc.data.ownedShares + direction * qty));
    if (nextOwned === doc.data.ownedShares) return;
    const updated = await store.update('assets', doc.docId, { ...doc.data, ownedShares: nextOwned });
    setAssets((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
    setTrades((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function logDistribution(doc: StoreDoc<Asset>) {
    const amountCents = Math.round(stakeCents(doc.data) * (doc.data.monthlyYieldPct / 100));
    if (amountCents <= 0) return;
    const d = await store.create('distributions', { asset: doc.data.name, amountCents, note: 'Monthly rental distribution' });
    setDistributions((prev) => [d, ...(prev ?? [])]);
  }

  async function removeAsset(docId: string) {
    await store.remove('assets', docId);
    setAssets((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  function exportHoldings() {
    const rows = list.map((a) => `"${a.data.name}",${a.data.type},${a.data.ownedShares},${a.data.totalShares},${(sharePriceCents(a.data) / 100).toFixed(2)},${(stakeCents(a.data) / 100).toFixed(2)}`);
    const csv = ['asset,type,owned shares,total shares,share price,stake value', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fractional-holdings.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (assets === null || distributions === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="fractional-asset-ownership-root">
      <Section title="Portfolio">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={<span data-testid="portfolio-value">{fmt(portfolioCents)}</span>} label={`Stake across ${list.length} assets`} />
          <StatDisplay value={`${fmt(monthlyIncomeCents)}/mo`} label="Projected income" />
          <StatDisplay value={fmt(totalDistributedCents)} label="Distributions received" />
        </div>
      </Section>

      <Divider />

      <Section title="Listed Assets">
        {list.length === 0 ? (
          <EmptyState icon="🧱">No assets listed — add one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {list.map((a) => {
              const price = sharePriceCents(a.data);
              const ownPct = a.data.totalShares > 0 ? (a.data.ownedShares / a.data.totalShares) * 100 : 0;
              return (
                <div key={a.docId} className="module-list-row" data-testid="asset-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, flex: 1 }}>{a.data.name}</span>
                    <Tag>{TYPE_LABELS[a.data.type]}</Tag>
                    {a.data.monthlyYieldPct > 0 && <Tag active>💸 {a.data.monthlyYieldPct}%/mo yield</Tag>}
                    <IconButton label="Remove" onClick={() => removeAsset(a.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-dim)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Share price {fmt(price)}</span>
                    <span data-testid={`owned-${a.docId}`}>
                      You own {a.data.ownedShares} / {a.data.totalShares} shares ({ownPct.toFixed(1)}%)
                    </span>
                    <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>Stake {fmt(stakeCents(a.data))}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Input
                      type="number"
                      value={trades[a.docId] ?? ''}
                      onChange={(e) => setTrades((prev) => ({ ...prev, [a.docId]: e.target.value }))}
                      placeholder="Shares"
                      data-testid={`trade-input-${a.docId}`}
                      style={{ width: 90 }}
                    />
                    <Button variant="secondary" onClick={() => trade(a, 1)} data-testid={`buy-${a.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Buy
                    </Button>
                    <Button variant="ghost" onClick={() => trade(a, -1)} data-testid={`sell-${a.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Sell
                    </Button>
                    {a.data.monthlyYieldPct > 0 && a.data.ownedShares > 0 && (
                      <Button variant="ghost" onClick={() => logDistribution(a)} data-testid={`distribute-${a.docId}`} style={{ padding: '5px 10px', fontSize: 12, marginLeft: 'auto' }}>
                        💸 Log Distribution
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Asset</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakeview Cabin" data-testid="asset-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as Asset['type'])} data-testid="type-select" style={{ width: '100%' }}>
              <option value="real_estate">Real Estate</option>
              <option value="art">Art</option>
              <option value="collectible">Collectible</option>
            </Select>
          </div>
          <div style={{ width: 130 }}>
            <Label>Total Value ($)</Label>
            <Input type="number" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} data-testid="value-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Shares</Label>
            <Input type="number" value={totalShares} onChange={(e) => setTotalShares(e.target.value)} data-testid="shares-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addAsset} data-testid="add-asset-button">
            + List Asset
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Distribution History">
        {distributions.length === 0 ? (
          <EmptyState icon="💸">No distributions logged yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="distributions-list">
            {distributions.slice(0, 6).map((d) => (
              <div key={d.docId} className="module-list-row" data-testid="distribution-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{d.data.asset}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{d.data.note}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>+{fmt(d.data.amountCents)}</span>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportHoldings}>
          ⬇️ Export Holdings as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
