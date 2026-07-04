import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Digital Product Storefront — sell templates and files. Seller-side
// catalog manager: products with price/kind/publish state, a sales
// counter per product, lifetime revenue math. Scope note: actual
// checkout ("Stripe integration" in the blurb) is the same
// Stripe-Connect platform boundary as the other commerce modules —
// this manages the catalog those checkout links would sell.

type Product = { name: string; kind: string; priceCents: number; sales: number; published: boolean };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function DigitalProductStorefront({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [products, setProducts] = useState<StoreDoc<Product>[] | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    store.list<Product>('products').then(setProducts);
  }, [store]);

  const published = (products ?? []).filter((p) => p.data.published);
  const lifetimeCents = (products ?? []).reduce((sum, p) => sum + p.data.sales * p.data.priceCents, 0);
  const totalSales = (products ?? []).reduce((sum, p) => sum + p.data.sales, 0);

  async function addProduct() {
    if (!name.trim()) return;
    const p: Product = { name: name.trim(), kind: kind.trim() || 'Digital Product', priceCents: Math.round((Number(price) || 0) * 100), sales: 0, published: false };
    const doc = await store.create('products', p);
    setProducts((prev) => [...(prev ?? []), doc]);
    setName('');
    setKind('');
    setPrice('');
  }

  async function togglePublished(doc: StoreDoc<Product>) {
    const updated = await store.update('products', doc.docId, { ...doc.data, published: !doc.data.published });
    setProducts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function recordSale(doc: StoreDoc<Product>) {
    const updated = await store.update('products', doc.docId, { ...doc.data, sales: doc.data.sales + 1 });
    setProducts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('products', docId);
    setProducts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportCatalog() {
    const rows = (products ?? []).map((p) => `"${p.data.name}",${p.data.kind},${(p.data.priceCents / 100).toFixed(2)},${p.data.sales},${((p.data.sales * p.data.priceCents) / 100).toFixed(2)},${p.data.published ? 'published' : 'draft'}`);
    const csv = ['product,kind,price,sales,revenue,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'storefront-catalog.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (products === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="digital-product-storefront-root">
      <Section title="Storefront">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <StatDisplay value={fmt(lifetimeCents)} label="Lifetime revenue" />
          <StatDisplay value={totalSales.toLocaleString()} label="Total sales" />
          <StatDisplay value={`${published.length}/${products.length}`} label="Products live" />
        </div>

        {products.length === 0 ? (
          <EmptyState icon="🏬">No products yet — add your first below.</EmptyState>
        ) : (
          <div data-testid="products-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {products.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="product-item" style={{ alignItems: 'center', opacity: p.data.published ? 1 : 0.6 }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{p.data.kind}</Tag>
                    <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{fmt(p.data.priceCents)}</span>
                    <span>
                      {p.data.sales.toLocaleString()} sales · {fmt(p.data.sales * p.data.priceCents)}
                    </span>
                  </div>
                </div>
                {p.data.published && (
                  <Button variant="secondary" onClick={() => recordSale(p)} data-testid={`sale-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    + Sale
                  </Button>
                )}
                <Tag active={p.data.published} onClick={() => togglePublished(p)}>
                  {p.data.published ? 'Published' : 'Draft'}
                </Tag>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCatalog}>
          Export Catalog as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Product">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Notion Freelancer OS" data-testid="product-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Kind</Label>
            <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Template / Ebook / Asset" data-testid="product-kind-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="product-price-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProduct} data-testid="add-product-button">
            + Add Product
          </Button>
        </div>
      </Section>
    </div>
  );
}
