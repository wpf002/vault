import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Social Food Delivery App — the social layer of food delivery: a
// recommendation feed from your circle (with the one-line reason that
// actually sells a place), a deals board with live/expired codes, and a
// tried-it rating loop that turns recs into your own reviews. Scope
// note: actual ordering/courier dispatch is a delivery-platform
// integration — discovery and recommendations are the substance.

type Rec = { restaurant: string; cuisine: string; recommendedBy: string; blurb: string; tried: boolean; rating: number };
type Deal = { restaurant: string; deal: string; code: string; expires: string };

function isLive(deal: Deal): boolean {
  return deal.expires >= new Date().toISOString().slice(0, 10);
}

export function SocialFoodDeliveryApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [recs, setRecs] = useState<StoreDoc<Rec>[] | null>(null);
  const [deals, setDeals] = useState<StoreDoc<Deal>[] | null>(null);
  const [restaurant, setRestaurant] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [recommendedBy, setRecommendedBy] = useState('');
  const [blurb, setBlurb] = useState('');
  const [dRestaurant, setDRestaurant] = useState('');
  const [dDeal, setDDeal] = useState('');
  const [dCode, setDCode] = useState('');
  const [dExpires, setDExpires] = useState('');

  useEffect(() => {
    store.list<Rec>('recs').then(setRecs);
    store.list<Deal>('deals').then(setDeals);
  }, [store]);

  const recList = recs ?? [];
  const dealList = deals ?? [];
  const toTry = recList.filter((r) => !r.data.tried).length;
  const liveDeals = dealList.filter((d) => isLive(d.data)).length;
  const tried = recList.filter((r) => r.data.tried && r.data.rating > 0);
  const avgRating = tried.length > 0 ? tried.reduce((s, r) => s + r.data.rating, 0) / tried.length : 0;

  async function addRec() {
    if (!restaurant.trim() || !blurb.trim()) return;
    const r: Rec = { restaurant: restaurant.trim(), cuisine: cuisine.trim() || 'Food', recommendedBy: recommendedBy.trim() || 'You', blurb: blurb.trim(), tried: false, rating: 0 };
    const doc = await store.create('recs', r);
    setRecs((prev) => [doc, ...(prev ?? [])]);
    setRestaurant('');
    setCuisine('');
    setRecommendedBy('');
    setBlurb('');
  }

  async function rate(doc: StoreDoc<Rec>, rating: number) {
    const updated = await store.update('recs', doc.docId, { ...doc.data, tried: true, rating });
    setRecs((prev) => (prev ?? []).map((r) => (r.docId === doc.docId ? updated : r)));
  }

  async function removeRec(docId: string) {
    await store.remove('recs', docId);
    setRecs((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  async function addDeal() {
    if (!dRestaurant.trim() || !dDeal.trim()) return;
    const d: Deal = { restaurant: dRestaurant.trim(), deal: dDeal.trim(), code: dCode.trim().toUpperCase() || '—', expires: dExpires || new Date().toISOString().slice(0, 10) };
    const doc = await store.create('deals', d);
    setDeals((prev) => [doc, ...(prev ?? [])]);
    setDRestaurant('');
    setDDeal('');
    setDCode('');
    setDExpires('');
  }

  async function removeDeal(docId: string) {
    await store.remove('deals', docId);
    setDeals((prev) => (prev ?? []).filter((d) => d.docId !== docId));
  }

  function exportGuide() {
    const lines = recList.map((r) => `- **${r.data.restaurant}** (${r.data.cuisine}) — "${r.data.blurb}" — ${r.data.recommendedBy}${r.data.tried ? ` · you rated ${r.data.rating}/5` : ' · on your try list'}`);
    const dealLines = dealList.filter((d) => isLive(d.data)).map((d) => `- ${d.data.restaurant}: ${d.data.deal} (code **${d.data.code}**, until ${d.data.expires})`);
    const md = ['# Our Food Guide', '', ...lines, '', '## Live Deals', ...(dealLines.length ? dealLines : ['_None right now._'])].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'food-guide.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (recs === null || deals === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="social-food-delivery-root">
      <Section title="Your Food Circle">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="to-try-count">{toTry}</span>} label="On your try list" />
          <StatDisplay value={<span data-testid="live-deals-count">{liveDeals}</span>} label="Live deals" />
          <StatDisplay value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—'} label="Your average rating" />
        </div>
      </Section>

      <Divider />

      <Section title="Recommendation Feed">
        {recList.length === 0 ? (
          <EmptyState icon="🚴">No recs yet — share the first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="recs-list">
            {recList.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="rec-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.restaurant}</span>
                    <span style={{ fontSize: 12, marginLeft: 8 }}>{r.data.cuisine} · rec'd by {r.data.recommendedBy}</span>
                  </div>
                  {r.data.tried ? (
                    <Tag active data-testid={`rating-${r.docId}`}>
                      {'★'.repeat(r.data.rating)}{'☆'.repeat(5 - r.data.rating)}
                    </Tag>
                  ) : (
                    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }} data-testid={`rate-row-${r.docId}`}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Tried it?</span>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Button key={v} variant="ghost" onClick={() => rate(r, v)} data-testid={`rate-${r.docId}-${v}`} style={{ padding: '2px 6px', fontSize: 12 }}>
                          {v}★
                        </Button>
                      ))}
                    </span>
                  )}
                  <IconButton label="Remove" onClick={() => removeRec(r.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ padding: '8px 12px', marginLeft: 4, borderRadius: 8, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text)' }}>
                  💬 {r.data.blurb}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Label>Restaurant</Label>
              <Input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="e.g. Taco Norte" data-testid="restaurant-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 120 }}>
              <Label>Cuisine</Label>
              <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Mexican" data-testid="cuisine-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 130 }}>
              <Label>Rec'd By</Label>
              <Input value={recommendedBy} onChange={(e) => setRecommendedBy(e.target.value)} placeholder="You" data-testid="rec-by-input" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>Why It's Worth Ordering</Label>
              <Input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="The one-liner that sells it" data-testid="blurb-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addRec} data-testid="add-rec-button">
              Recommend
            </Button>
          </div>
        </div>
      </Section>

      <Divider />

      <Section title="Deals Board">
        {dealList.length === 0 ? (
          <EmptyState icon="🏷️">No deals shared.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="deals-list">
            {dealList.map((d) => {
              const live = isLive(d.data);
              return (
                <div key={d.docId} className="module-list-row" data-testid="deal-item" style={{ alignItems: 'center', opacity: live ? 1 : 0.5 }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{d.data.restaurant}</span>
                    <span style={{ fontSize: 12, marginLeft: 8 }}>{d.data.deal}</span>
                  </div>
                  <Tag active={live} data-testid={`deal-status-${d.docId}`}>
                    {live ? `🏷️ ${d.data.code}` : 'Expired'}
                  </Tag>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{live ? `until ${d.data.expires}` : d.data.expires}</span>
                  <IconButton label="Remove" onClick={() => removeDeal(d.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>Restaurant</Label>
            <Input value={dRestaurant} onChange={(e) => setDRestaurant(e.target.value)} placeholder="e.g. Taco Norte" data-testid="deal-restaurant-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Deal</Label>
            <Input value={dDeal} onChange={(e) => setDDeal(e.target.value)} placeholder="e.g. 2-for-1 Tuesdays" data-testid="deal-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Code</Label>
            <Input value={dCode} onChange={(e) => setDCode(e.target.value)} placeholder="TACOTWO" data-testid="deal-code-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Expires</Label>
            <Input type="date" value={dExpires} onChange={(e) => setDExpires(e.target.value)} data-testid="deal-expires-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addDeal} data-testid="add-deal-button">
            Share Deal
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportGuide}>
          Export Food Guide as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
