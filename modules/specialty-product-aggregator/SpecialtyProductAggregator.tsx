import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Specialty Product Aggregator — Price comparison for niche verticals with
// spec tables. Products carry free-form spec key/values; the comparison
// table unions all spec keys across products so gaps show as "—". Scope
// note: live price scraping is a third-party-API concern; you log the
// prices you find, the table does the comparing.

type Product = { name: string; vendor: string; priceCents: number; specs: Record<string, string> };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SpecialtyProductAggregator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [products, setProducts] = useState<StoreDoc<Product>[] | null>(null);
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState('');
  const [specsText, setSpecsText] = useState('');

  useEffect(() => {
    store.list<Product>('products').then((docs) => setProducts(docs.sort((a, b) => a.data.priceCents - b.data.priceCents)));
  }, [store]);

  const specKeys = useMemo(() => Array.from(new Set((products ?? []).flatMap((p) => Object.keys(p.data.specs)))), [products]);
  const cheapest = (products ?? [])[0]?.docId;

  async function addProduct() {
    if (!name.trim()) return;
    const specs: Record<string, string> = {};
    for (const pair of specsText.split(',')) {
      const [k, v] = pair.split(':').map((s) => s.trim());
      if (k && v) specs[k] = v;
    }
    const p: Product = { name: name.trim(), vendor: vendor.trim() || '—', priceCents: Math.round((Number(price) || 0) * 100), specs };
    const doc = await store.create('products', p);
    setProducts((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.priceCents - b.data.priceCents));
    setName('');
    setVendor('');
    setPrice('');
    setSpecsText('');
  }

  async function remove(docId: string) {
    await store.remove('products', docId);
    setProducts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportTable() {
    const header = ['product', 'vendor', 'price', ...specKeys];
    const rows = (products ?? []).map((p) => [
      `"${p.data.name}"`,
      `"${p.data.vendor}"`,
      (p.data.priceCents / 100).toFixed(2),
      ...specKeys.map((k) => `"${p.data.specs[k] ?? ''}"`),
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (products === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="specialty-product-aggregator-root">
      <Section title="Comparison Table">
        {products.length === 0 ? (
          <EmptyState icon="🏷️">No products logged yet — add the first below.</EmptyState>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }} data-testid="spec-table">
              <thead>
                <tr style={{ color: 'var(--color-text-dim)', textAlign: 'left' }}>
                  {['Product', 'Price', ...specKeys, ''].map((h, i) => (
                    <th key={i} style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.docId}
                    data-testid="product-row"
                    style={{
                      background: p.docId === cheapest ? 'color-mix(in srgb, var(--module-accent) 10%, var(--color-bg))' : 'var(--color-bg)',
                      borderTop: '4px solid var(--color-surface)',
                    }}
                  >
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{p.data.name}</span>
                      <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{p.data.vendor}</div>
                      {p.docId === cheapest && <Tag active>Lowest Price</Tag>}
                    </td>
                    <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(p.data.priceCents)}</td>
                    {specKeys.map((k) => (
                      <td key={k} style={{ padding: '10px', color: 'var(--color-text-dim)' }}>
                        {p.data.specs[k] ?? '—'}
                      </td>
                    ))}
                    <td style={{ padding: '10px' }}>
                      <IconButton label="Remove" onClick={() => remove(p.docId)}>
                        ✕
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportTable}>
          Export Comparison as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Product">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Product</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" data-testid="product-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Label>Vendor</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Brand / store" data-testid="product-vendor-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="product-price-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Label>Specs (Key: Value, Comma Separated)</Label>
            <Input value={specsText} onChange={(e) => setSpecsText(e.target.value)} placeholder="Capacity: 1.0 L, Wattage: 1200 W" data-testid="product-specs-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProduct} data-testid="add-product-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
