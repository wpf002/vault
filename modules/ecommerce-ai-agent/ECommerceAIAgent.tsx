import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// E-Commerce AI Agent — two agent jobs on your real shop data: a pricing
// review (views/sales/stock per product → RAISE / LOWER / HOLD with a
// reason, suggestions only — you reprice, it never touches prices) and
// cart-recovery email drafts personalized to each abandoned cart. Scope
// note: live storefront/webhook integration is platform work — the
// agent's judgment loop is the substance. CONTRACT.md #11 states rendered.

type Product = { name: string; priceCents: number; stock: number; viewsWeek: number; salesWeek: number };
type Cart = { customer: string; items: string; valueCents: number; hoursAgo: number };
type Output = { kind: 'pricing' | 'recovery'; title: string; body: string };

const PRICING_SYSTEM = [
  'You are a pricing analyst for a small online shop. For each numbered product output exactly one line:',
  'PRODUCT NAME | RAISE to $X or LOWER to $X or HOLD | one-sentence reason using the views/sales/stock numbers',
  'Be conservative: suggest changes within ±25% of current price. No headers, no commentary.',
].join(' ');

const RECOVERY_SYSTEM = [
  'You write cart-recovery emails for a small home-goods shop. Given one abandoned cart, write a short friendly email:',
  'subject line first prefixed "Subject:", then a 3-4 sentence body that mentions the actual items, no fake discounts unless told, warm but not desperate.',
  'Plain text only.',
].join(' ');

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function ECommerceAIAgent({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [products, setProducts] = useState<StoreDoc<Product>[] | null>(null);
  const [carts, setCarts] = useState<StoreDoc<Cart>[] | null>(null);
  const [outputs, setOutputs] = useState<StoreDoc<Output>[] | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [views, setViews] = useState('');
  const [sales, setSales] = useState('');
  const [working, setWorking] = useState<'pricing' | 'recovery' | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Product>('products').then(setProducts);
    store.list<Cart>('carts').then(setCarts);
    store.list<Output>('outputs').then(setOutputs);
  }, [store]);

  const productList = products ?? [];
  const cartList = carts ?? [];
  const abandonedValueCents = cartList.reduce((s, c) => s + c.data.valueCents, 0);

  async function runAi(kind: 'pricing' | 'recovery', system: string, prompt: string, title: string) {
    if (!ai || working) return;
    setWorking(kind);
    setFailure(null);
    const res = await ai.complete({ system, prompt, maxTokens: 500 });
    setWorking(null);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const doc = await store.create('outputs', { kind, title, body: res.text.trim() });
    setOutputs((prev) => [doc, ...(prev ?? [])]);
  }

  async function reviewPricing() {
    if (productList.length === 0) return;
    const numbered = productList.map((p, i) => `${i + 1}. ${p.data.name}: ${fmt(p.data.priceCents)}, ${p.data.stock} in stock, ${p.data.viewsWeek} views and ${p.data.salesWeek} sales this week`);
    await runAi('pricing', PRICING_SYSTEM, `Products:\n${numbered.join('\n')}`, `Pricing review — ${productList.length} products`);
  }

  async function draftRecovery(cart: StoreDoc<Cart>) {
    await runAi(
      'recovery',
      RECOVERY_SYSTEM,
      `Abandoned cart: ${cart.data.customer} left ${cart.data.items} (${fmt(cart.data.valueCents)}) in their cart ${cart.data.hoursAgo} hours ago. Write the recovery email.`,
      `Recovery draft → ${cart.data.customer.split(' ')[0]}`,
    );
  }

  async function addProduct() {
    if (!name.trim()) return;
    const p: Product = { name: name.trim(), priceCents: Math.round((Number(price) || 0) * 100), stock: Math.max(0, Math.round(Number(stock) || 0)), viewsWeek: Math.max(0, Math.round(Number(views) || 0)), salesWeek: Math.max(0, Math.round(Number(sales) || 0)) };
    const doc = await store.create('products', p);
    setProducts((prev) => [...(prev ?? []), doc]);
    setName('');
    setPrice('');
    setStock('');
    setViews('');
    setSales('');
  }

  async function removeProduct(docId: string) {
    await store.remove('products', docId);
    setProducts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  async function removeCart(docId: string) {
    await store.remove('carts', docId);
    setCarts((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  async function removeOutput(docId: string) {
    await store.remove('outputs', docId);
    setOutputs((prev) => (prev ?? []).filter((o) => o.docId !== docId));
  }

  function exportOutputs() {
    const lines = (outputs ?? []).map((o) => `## ${o.data.title}\n\n${o.data.body}`);
    const md = ['# Agent Outputs', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-outputs.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (products === null || carts === null || outputs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="ecommerce-ai-agent-root">
      <Section title="Shop Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={productList.length} label="Products" />
          <StatDisplay value={<span data-testid="abandoned-value">{fmt(abandonedValueCents)}</span>} label={`Abandoned in ${cartList.length} carts`} />
          <StatDisplay value={outputs.length} label="Agent outputs" />
        </div>
      </Section>

      <Divider />

      <Section title="Agent Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={reviewPricing} data-testid="pricing-button" disabled={working !== null || productList.length === 0}>
              {working === 'pricing' ? '🛒 Reviewing…' : '💲 Review Pricing'}
            </Button>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Suggestions only — the agent never changes a price itself.</span>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for the always-on agent.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The agent needs an account, even to try it — sign in for a few free runs.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free agent runs are used up — unlock the app to put it back to work.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The agent is offline right now — your shop data is untouched, try again in a bit.
            </div>
          )}

          {outputs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="outputs-list">
              {outputs.map((o) => (
                <div key={o.docId} className="module-list-row" data-testid="output-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag active={o.data.kind === 'pricing'}>{o.data.kind === 'pricing' ? '💲 Pricing' : '✉️ Recovery'}</Tag>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{o.data.title}</span>
                    </div>
                    <IconButton label="Remove" onClick={() => removeOutput(o.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', marginLeft: 4 }}>{o.data.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Abandoned Carts">
        {cartList.length === 0 ? (
          <EmptyState icon="🛒">No abandoned carts — enjoy it while it lasts.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }} data-testid="carts-list">
            {cartList.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="cart-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.customer}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {c.data.items} · {c.data.hoursAgo}h ago
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(c.data.valueCents)}</span>
                <Button variant="secondary" onClick={() => draftRecovery(c)} data-testid={`recover-${c.docId}`} disabled={working !== null} style={{ padding: '5px 10px', fontSize: 12 }}>
                  ✉️ Draft Recovery
                </Button>
                <IconButton label="Remove" onClick={() => removeCart(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Catalog">
        {productList.length === 0 ? (
          <EmptyState icon="📦">No products — add your catalog below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="products-list">
            {productList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="product-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                    {p.data.stock} in stock · {p.data.viewsWeek} views · {p.data.salesWeek} sales this week
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(p.data.priceCents)}</span>
                <IconButton label="Remove" onClick={() => removeProduct(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Product</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wool Slippers" data-testid="name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="price-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 80 }}>
            <Label>Stock</Label>
            <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} data-testid="stock-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Views/Wk</Label>
            <Input type="number" value={views} onChange={(e) => setViews(e.target.value)} data-testid="views-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Sales/Wk</Label>
            <Input type="number" value={sales} onChange={(e) => setSales(e.target.value)} data-testid="sales-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProduct} data-testid="add-product-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportOutputs}>
          ⬇️ Export Agent Outputs as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
