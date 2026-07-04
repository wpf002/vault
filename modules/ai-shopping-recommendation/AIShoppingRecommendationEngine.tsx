import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Shopping & Recommendation Engine — "learns your taste" from a
// loved/passed history you build as you shop; recommendations go through
// the proxy with that history and a budget cap, and come back in strict
// PRODUCT | WHY | EST PRICE lines tied to what you actually loved vs.
// passed on. Picks land on a wishlist. Scope note: live price feeds and
// affiliate links are retailer integrations — the taste model and the
// recommendation loop are the substance. CONTRACT.md #11 states rendered.

type Taste = { item: string; category: string; priceCents: number; verdict: 'loved' | 'passed' };
type WishItem = { product: string; why: string; estPrice: string };

const SYSTEM_PROMPT = [
  'You are a personal shopper. Output ONLY recommendation lines, one per line, exactly:',
  'PRODUCT | WHY (one sentence tied to their taste history) | EST PRICE (a range like $20-30)',
  'Recommend real product types, not brands with made-up prices. Respect the stated budget. No headers, no numbering, no commentary.',
].join(' ');

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function parsePicks(text: string): WishItem[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'))
    .map((line) => {
      const [product = '', why = '', estPrice = '—'] = line.split('|').map((p) => p.trim());
      return { product, why, estPrice };
    })
    .filter((p) => p.product.length > 0);
}

export function AIShoppingRecommendationEngine({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [tastes, setTastes] = useState<StoreDoc<Taste>[] | null>(null);
  const [wishlist, setWishlist] = useState<StoreDoc<WishItem>[] | null>(null);
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [verdict, setVerdict] = useState<Taste['verdict']>('loved');
  const [budget, setBudget] = useState('50');
  const [occasion, setOccasion] = useState('');
  const [working, setWorking] = useState(false);
  const [picks, setPicks] = useState<WishItem[] | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Taste>('tastes').then(setTastes);
    store.list<WishItem>('wishlist').then(setWishlist);
  }, [store]);

  const tasteList = tastes ?? [];
  const lovedCount = tasteList.filter((t) => t.data.verdict === 'loved').length;

  async function recommend() {
    if (!ai || working || tasteList.length < 3) return;
    setWorking(true);
    setFailure(null);
    setPicks(null);
    const history = tasteList.map((t) => `${t.data.verdict.toUpperCase()}: ${t.data.item} (${t.data.category}, ${fmt(t.data.priceCents)})`);
    const prompt = [
      `My taste history:\n${history.join('\n')}`,
      `\nRecommend 5 products under $${Number(budget) || 50}${occasion.trim() ? ` for: ${occasion.trim()}` : ' that fit my taste'}.`,
      'Weight LOVED heavily, avoid anything like PASSED.',
    ].join('');
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setPicks(parsePicks(res.text));
  }

  async function addToWishlist(pick: WishItem) {
    const doc = await store.create('wishlist', pick);
    setWishlist((prev) => [doc, ...(prev ?? [])]);
    setPicks((prev) => (prev ?? []).filter((p) => p.product !== pick.product));
  }

  async function addTaste() {
    if (!item.trim()) return;
    const t: Taste = { item: item.trim(), category: category.trim() || 'General', priceCents: Math.round((Number(price) || 0) * 100), verdict };
    const doc = await store.create('tastes', t);
    setTastes((prev) => [...(prev ?? []), doc]);
    setItem('');
    setCategory('');
    setPrice('');
  }

  async function removeTaste(docId: string) {
    await store.remove('tastes', docId);
    setTastes((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  async function removeWish(docId: string) {
    await store.remove('wishlist', docId);
    setWishlist((prev) => (prev ?? []).filter((w) => w.docId !== docId));
  }

  function exportWishlist() {
    const lines = (wishlist ?? []).map((w) => `- **${w.data.product}** (${w.data.estPrice}) — ${w.data.why}`);
    const md = ['# Wishlist', '', ...lines].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wishlist.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tastes === null || wishlist === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="ai-shopping-recommendation-root">
      <Section title="Recommend Me Something">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 110 }}>
              <Label>Budget ($)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="budget-input" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Label>Occasion (Optional)</Label>
              <Input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="e.g. Gift for my brother who codes" data-testid="occasion-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={recommend} data-testid="recommend-button" disabled={working || tasteList.length < 3}>
              {working ? 'Shopping…' : 'Recommend'}
            </Button>
          </div>
          {tasteList.length < 3 && <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Rate at least 3 items below so the engine knows your taste.</span>}

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited picks.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The engine needs an account, even to try it — sign in for a few free picks.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free picks are used up — unlock the app for unlimited recommendations.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The engine is offline right now — try again in a bit.
            </div>
          )}

          {picks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="picks-panel">
              {picks.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>Came back empty — try again.</p>
              ) : (
                picks.map((p) => (
                  <div key={p.product} className="module-list-row" data-testid="pick-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.product}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{p.why}</div>
                    </div>
                    <Tag>{p.estPrice}</Tag>
                    <Button variant="secondary" onClick={() => addToWishlist(p)} data-testid={`wish-${p.product.slice(0, 12).replace(/\W/g, '')}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      + Wishlist
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Wishlist">
        {wishlist.length === 0 ? (
          <EmptyState icon="🛍️">Nothing on the wishlist — get some picks.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} data-testid="wishlist-list">
            {wishlist.map((w) => (
              <div key={w.docId} className="module-list-row" data-testid="wish-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{w.data.product}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{w.data.why}</div>
                </div>
                <Tag>{w.data.estPrice}</Tag>
                <IconButton label="Remove" onClick={() => removeWish(w.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportWishlist}>
          Export Wishlist as Markdown
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Your Taste History">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={tasteList.length} label="Items rated" />
          <StatDisplay value={<span data-testid="loved-count">{lovedCount}</span>} label="Loved" />
          <StatDisplay value={wishlist.length} label="On the wishlist" />
        </div>

        {tasteList.length === 0 ? (
          <EmptyState icon="🏷️">Rate things you've bought or considered — that's the taste model.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="tastes-list">
            {tasteList.map((t) => (
              <div key={t.docId} className="module-list-row" data-testid="taste-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.data.item}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{t.data.category} · {fmt(t.data.priceCents)}</span>
                </div>
                <Tag active={t.data.verdict === 'loved'}>{t.data.verdict === 'loved' ? '❤️ Loved' : '👎 Passed'}</Tag>
                <IconButton label="Remove" onClick={() => removeTaste(t.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Item</Label>
            <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. Cast iron skillet" data-testid="item-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kitchen" data-testid="category-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="price-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Verdict</Label>
            <Select value={verdict} onChange={(e) => setVerdict(e.target.value as Taste['verdict'])} data-testid="verdict-select" style={{ width: '100%' }}>
              <option value="loved">Loved</option>
              <option value="passed">Passed</option>
            </Select>
          </div>
          <Button variant="primary" onClick={addTaste} data-testid="add-taste-button">
            + Rate It
          </Button>
        </div>
      </Section>
    </div>
  );
}
