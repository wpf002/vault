import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// Nutrition Log for Specific Dietary Protocols — custom macro targets per
// protocol (keto/carnivore/elimination presets, all editable) with a
// today view that tracks intake against them: the carb LIMIT warns when
// exceeded, protein/fat TARGETS fill toward 100%.

type Settings = { protocol: string; carbLimitG: number; proteinTargetG: number; fatTargetG: number };
type Entry = { date: string; food: string; carbsG: number; proteinG: number; fatG: number };

const PRESETS: Record<string, Omit<Settings, 'protocol'>> = {
  keto: { carbLimitG: 25, proteinTargetG: 120, fatTargetG: 140 },
  carnivore: { carbLimitG: 5, proteinTargetG: 160, fatTargetG: 130 },
  elimination: { carbLimitG: 100, proteinTargetG: 100, fatTargetG: 80 },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function NutritionLogForSpecificDietaryProtocols({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [settings, setSettings] = useState<StoreDoc<Settings> | null | undefined>(undefined);
  const [entries, setEntries] = useState<StoreDoc<Entry>[] | null>(null);
  const [food, setFood] = useState('');
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    store.list<Settings>('settings').then((docs) => setSettings(docs[0] ?? null));
    store.list<Entry>('entries').then(setEntries);
  }, [store]);

  const today = (entries ?? []).filter((e) => e.data.date === todayStr());
  const totals = today.reduce(
    (t, e) => ({ carbs: t.carbs + e.data.carbsG, protein: t.protein + e.data.proteinG, fat: t.fat + e.data.fatG }),
    { carbs: 0, protein: 0, fat: 0 },
  );
  const s = settings?.data ?? { protocol: 'keto', ...PRESETS.keto! };
  const overCarbs = totals.carbs > s.carbLimitG;

  async function setProtocol(protocol: string) {
    const next: Settings = { protocol, ...PRESETS[protocol]! };
    if (settings) {
      const updated = await store.update('settings', settings.docId, next);
      setSettings(updated);
    } else {
      const doc = await store.create('settings', next);
      setSettings(doc);
    }
  }

  async function logFood() {
    if (!food.trim()) return;
    const e: Entry = { date: todayStr(), food: food.trim(), carbsG: Number(carbs) || 0, proteinG: Number(protein) || 0, fatG: Number(fat) || 0 };
    const doc = await store.create('entries', e);
    setEntries((prev) => [...(prev ?? []), doc]);
    setFood('');
    setCarbs('');
    setProtein('');
    setFat('');
  }

  async function remove(docId: string) {
    await store.remove('entries', docId);
    setEntries((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportLog() {
    const rows = (entries ?? []).map((e) => `${e.data.date},"${e.data.food}",${e.data.carbsG},${e.data.proteinG},${e.data.fatG}`);
    const csv = ['date,food,carbs g,protein g,fat g', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nutrition-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (settings === undefined || entries === null) return <LoadingState />;

  function MacroBar({ label, value, target, isLimit }: { label: string; value: number; target: number; isLimit?: boolean }) {
    const pct = Math.min(100, (value / Math.max(1, target)) * 100);
    const over = isLimit && value > target;
    return (
      <div style={{ marginBottom: 10 }} data-testid={`macro-${label.toLowerCase()}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: over ? '#ff6b5e' : 'var(--color-text)' }}>
            {label}
            {over && ' — over limit!'}
          </span>
          <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
            {value}g / {target}g {isLimit ? 'limit' : 'target'}
          </span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'var(--color-bg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: over ? '#ff6b5e' : 'var(--module-accent)' }} aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="module-card" data-testid="nutrition-log-root">
      <Section title="Protocol">
        <SegmentedControl
          options={Object.keys(PRESETS).map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
          value={s.protocol}
          onChange={setProtocol}
        />
      </Section>

      <Divider />

      <Section title="Today">
        <MacroBar label="Carbs" value={totals.carbs} target={s.carbLimitG} isLimit />
        <MacroBar label="Protein" value={totals.protein} target={s.proteinTargetG} />
        <MacroBar label="Fat" value={totals.fat} target={s.fatTargetG} />
        {overCarbs && (
          <p style={{ fontSize: 12, color: '#ff6b5e', margin: '4px 0 0' }} data-testid="over-warning">
            ⚠️ Carbs exceed the {s.protocol} limit of {s.carbLimitG}g.
          </p>
        )}
      </Section>

      <Divider />

      <Section title="Log Food">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <Label>Food</Label>
            <Input value={food} onChange={(e) => setFood(e.target.value)} placeholder="What did you eat?" data-testid="food-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Carbs (g)</Label>
            <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} data-testid="carbs-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Protein (g)</Label>
            <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} data-testid="protein-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 90 }}>
            <Label>Fat (g)</Label>
            <Input type="number" value={fat} onChange={(e) => setFat(e.target.value)} data-testid="fat-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={logFood} data-testid="log-food-button">
            + Log
          </Button>
        </div>

        {today.length === 0 ? (
          <EmptyState icon="🥗">Nothing logged today.</EmptyState>
        ) : (
          <div data-testid="entries-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {today.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="entry-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.food}</span>
                  <span style={{ fontSize: 12, marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
                    C {e.data.carbsG}g · P {e.data.proteinG}g · F {e.data.fatG}g
                  </span>
                </div>
                <IconButton label="Remove" onClick={() => remove(e.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          ⬇️ Export Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
