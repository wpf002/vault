import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Digital Dice Roller / Coin Flipper — standard dice notation (NdM+K)
// with per-die faces shown, multi-coin flips, and a decision picker for
// custom options. Randomness uses crypto.getRandomValues with rejection
// sampling (no modulo bias — fair dice, not approximately-fair dice).
// Rolls are pure client state; only named presets persist, plus a gated
// session-log export.

type Preset = { name: string; notation: string };
type RollResult = { label: string; detail: string; total: string };

// unbiased integer in [1, max] via rejection sampling
function fairInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0]!;
  } while (v >= limit);
  return (v % max) + 1;
}

function parseNotation(notation: string): { count: number; sides: number; modifier: number } | null {
  const m = notation.trim().toLowerCase().match(/^(\d{1,2})d(\d{1,3})([+-]\d{1,3})?$/);
  if (!m) return null;
  const count = Number(m[1]);
  const sides = Number(m[2]);
  if (count < 1 || count > 50 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier: m[3] ? Number(m[3]) : 0 };
}

export function DigitalDiceRollerCoinFlipper({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [presets, setPresets] = useState<StoreDoc<Preset>[] | null>(null);
  const [notation, setNotation] = useState('2d6');
  const [presetName, setPresetName] = useState('');
  const [coinCount, setCoinCount] = useState('1');
  const [options, setOptions] = useState('Pizza, Thai, Burgers');
  const [current, setCurrent] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);

  useEffect(() => {
    store.list<Preset>('presets').then(setPresets);
  }, [store]);

  function record(result: RollResult) {
    setCurrent(result);
    setHistory((prev) => [result, ...prev].slice(0, 20));
  }

  function rollDice(n: string) {
    const parsed = parseNotation(n);
    if (!parsed) return;
    const faces = Array.from({ length: parsed.count }, () => fairInt(parsed.sides));
    const total = faces.reduce((s, f) => s + f, 0) + parsed.modifier;
    const detail = `${faces.join(' + ')}${parsed.modifier !== 0 ? ` ${parsed.modifier > 0 ? '+' : '−'} ${Math.abs(parsed.modifier)}` : ''}`;
    record({ label: `🎲 ${n.trim()}`, detail, total: String(total) });
  }

  function flipCoins() {
    const n = Math.min(20, Math.max(1, Math.round(Number(coinCount) || 1)));
    const flips = Array.from({ length: n }, () => (fairInt(2) === 1 ? 'Heads' : 'Tails'));
    const heads = flips.filter((f) => f === 'Heads').length;
    record({ label: `🪙 ${n} ${n === 1 ? 'coin' : 'coins'}`, detail: flips.join(', '), total: n === 1 ? flips[0]! : `${heads} heads / ${n - heads} tails` });
  }

  function decide() {
    const opts = options.split(',').map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return;
    const winner = opts[fairInt(opts.length) - 1]!;
    record({ label: '🎯 Decision', detail: opts.join(' vs. '), total: winner });
  }

  async function savePreset() {
    if (!presetName.trim() || !parseNotation(notation)) return;
    const doc = await store.create('presets', { name: presetName.trim(), notation: notation.trim() });
    setPresets((prev) => [...(prev ?? []), doc]);
    setPresetName('');
  }

  async function removePreset(docId: string) {
    await store.remove('presets', docId);
    setPresets((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportLog() {
    const rows = history.map((h) => `"${h.label}","${h.detail}","${h.total}"`);
    const csv = ['roll,detail,result', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roll-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (presets === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="dice-roller-coin-flipper-root">
      <Section title="Roll It">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 130 }}>
              <Label>Dice (NdM+K)</Label>
              <Input value={notation} onChange={(e) => setNotation(e.target.value)} placeholder="e.g. 3d8+2" data-testid="notation-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={() => rollDice(notation)} data-testid="roll-button" disabled={!parseNotation(notation)}>
              Roll
            </Button>
            <div style={{ width: 90 }}>
              <Label>Coins</Label>
              <Input type="number" value={coinCount} onChange={(e) => setCoinCount(e.target.value)} data-testid="coin-count-input" style={{ width: '100%' }} />
            </div>
            <Button variant="secondary" onClick={flipCoins} data-testid="flip-button">
              Flip
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Label>Decide Between (Comma-Separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} data-testid="options-input" style={{ width: '100%' }} />
            </div>
            <Button variant="secondary" onClick={decide} data-testid="decide-button">
              Decide for Me
            </Button>
          </div>

          {current && (
            <div style={{ textAlign: 'center', padding: '18px 16px', borderRadius: 12, background: 'var(--color-surface-2, rgba(255,255,255,0.05))' }} data-testid="result-panel">
              <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{current.label}</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--module-accent)', margin: '6px 0', fontVariantNumeric: 'tabular-nums' }} data-testid="result-total">
                {current.total}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }} data-testid="result-detail">
                {current.detail}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Saved Rolls">
        {presets.length === 0 ? (
          <EmptyState icon="🎲">No presets — save the rolls you use most.</EmptyState>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }} data-testid="presets-list">
            {presets.map((p) => (
              <span key={p.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <Tag active onClick={() => { setNotation(p.data.notation); rollDice(p.data.notation); }} data-testid={`preset-${p.docId}`}>
                  {p.data.name} ({p.data.notation})
                </Tag>
                <IconButton label="Remove" onClick={() => removePreset(p.docId)}>
                  ✕
                </IconButton>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Save Current Notation As</Label>
            <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g. Sneak Attack" data-testid="preset-name-input" style={{ width: '100%' }} />
          </div>
          <Button variant="secondary" onClick={savePreset} data-testid="save-preset-button">
            Save Preset
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Session Log">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="roll-count">{history.length}</span>} label="Rolls this session" />
          <StatDisplay value={presets.length} label="Saved presets" />
        </div>
        {history.length === 0 ? (
          <EmptyState icon="📜">Nothing rolled yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="history-list">
            {history.map((h, i) => (
              <div key={i} className="module-list-row" data-testid="history-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{h.label}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{h.detail}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{h.total}</span>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          Export Session Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
