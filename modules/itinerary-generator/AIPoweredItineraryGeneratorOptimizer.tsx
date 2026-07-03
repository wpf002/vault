import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI-Powered Itinerary Generator & Optimizer — destination, days,
// budget, and preference sliders go to the proxy; a day-by-day plan
// comes back. The "optimizer" is the refine loop: tell it what's wrong
// ("day 2 is too packed", "more food, fewer museums") and it rewrites
// the same plan with your itinerary as context. Saved trips persist.
// CONTRACT.md #11 failure states rendered.

type Itinerary = { destination: string; params: string; body: string };

const SYSTEM_PROMPT = [
  'You are a travel planner who knows real places. Produce a day-by-day itinerary, one line per day starting "Day N:".',
  'Ground it in the stated budget, pace, and interests. Name specific real neighborhoods, sights, and food — not generic filler.',
  'Include rough costs where useful. No headers, no preamble, no commentary — just the day lines.',
].join(' ');

const PACES = ['Relaxed', 'Moderate', 'Packed'];

export function AIPoweredItineraryGeneratorOptimizer({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [itineraries, setItineraries] = useState<StoreDoc<Itinerary>[] | null>(null);
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('3');
  const [budget, setBudget] = useState('100');
  const [interests, setInterests] = useState('');
  const [pace, setPace] = useState('Moderate');
  const [working, setWorking] = useState(false);
  const [current, setCurrent] = useState<Itinerary | null>(null);
  const [feedback, setFeedback] = useState('');
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Itinerary>('itineraries').then(setItineraries);
  }, [store]);

  function paramsLine(): string {
    return `Budget ~$${Number(budget) || 100}/day · ${interests.trim() || 'general sightseeing'} · ${pace.toLowerCase()} pace`;
  }

  async function generate() {
    if (!ai || working || !destination.trim()) return;
    setWorking(true);
    setFailure(null);
    const prompt = `Plan ${Number(days) || 3} days in ${destination.trim()}. Budget about $${Number(budget) || 100} per day. Interests: ${interests.trim() || 'a bit of everything'}. Pace: ${pace.toLowerCase()}.`;
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 800 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setCurrent({ destination: `${destination.trim()}, ${Number(days) || 3} days`, params: paramsLine(), body: res.text.trim() });
  }

  async function optimize() {
    if (!ai || working || !current || !feedback.trim()) return;
    setWorking(true);
    setFailure(null);
    const prompt = `Here is my current itinerary for ${current.destination}:\n${current.body}\n\nRewrite the full plan with this change: ${feedback.trim()}. Keep what already works.`;
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 800 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setCurrent({ ...current, body: res.text.trim() });
    setFeedback('');
  }

  async function keepItinerary() {
    if (!current) return;
    const doc = await store.create('itineraries', current);
    setItineraries((prev) => [doc, ...(prev ?? [])]);
    setCurrent(null);
  }

  async function removeItinerary(docId: string) {
    await store.remove('itineraries', docId);
    setItineraries((prev) => (prev ?? []).filter((i) => i.docId !== docId));
  }

  function exportTrips() {
    const lines = (itineraries ?? []).map((i) => `## ${i.data.destination}\n_${i.data.params}_\n\n${i.data.body}`);
    const md = ['# My Itineraries', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'itineraries.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (itineraries === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="itinerary-generator-root">
      <Section title="Plan a Trip">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Destination</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Mexico City" data-testid="destination-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 80 }}>
              <Label>Days</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} data-testid="days-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 110 }}>
              <Label>Budget/Day ($)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} data-testid="budget-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 130 }}>
              <Label>Pace</Label>
              <Select value={pace} onChange={(e) => setPace(e.target.value)} data-testid="pace-select" style={{ width: '100%' }}>
                {PACES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>Interests</Label>
              <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. street food, markets, one great view per day" data-testid="interests-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={generate} data-testid="generate-button" disabled={working || !destination.trim()}>
              {working ? '🧳 Planning…' : '🧳 Generate Itinerary'}
            </Button>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited planning.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Planning needs an account, even to try it — sign in for a few free itineraries.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free planning calls are used up — unlock the app to keep planning.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The planner is offline right now — try again in a bit.
            </div>
          )}

          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="current-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} data-testid="itinerary-text">
                {current.body}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Label>Optimize It</Label>
                  <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="e.g. Day 2 is too packed — spread it out" data-testid="feedback-input" style={{ width: '100%' }} />
                </div>
                <Button variant="secondary" onClick={optimize} data-testid="optimize-button" disabled={working || !feedback.trim()}>
                  🔧 Rework
                </Button>
                <Button variant="primary" onClick={keepItinerary} data-testid="keep-button">
                  💾 Save Trip
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Saved Trips">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="trip-count">{itineraries.length}</span>} label="Trips planned" />
        </div>

        {itineraries.length === 0 ? (
          <EmptyState icon="🧳">No saved trips — plan the first one.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="trips-list">
            {itineraries.map((i) => (
              <div key={i.docId} className="module-list-row" data-testid="trip-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{i.data.destination}</span>
                  </div>
                  <Tag>{i.data.params.split('·')[0]?.trim()}</Tag>
                  <IconButton label="Remove" onClick={() => removeItinerary(i.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', marginLeft: 4 }}>{i.data.body}</div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportTrips}>
          ⬇️ Export Trips as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
