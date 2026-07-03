import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Skincare App — AM/PM routines ordered by step
// (cleanse→treat→moisturize→protect) with a rule-based ingredient
// conflict checker for the known clash pairs (retinol+AHA/BHA,
// retinol+vitamin C, benzoyl peroxide+retinol). Rule-based, not AI —
// the conflict table is right here in the source.

const STEPS = ['cleanse', 'treat', 'moisturize', 'protect'] as const;
type Step = (typeof STEPS)[number];
type Routine = 'am' | 'pm' | 'both';

type Product = { name: string; step: Step; routine: Routine; keyIngredients: string[]; notes: string };

// well-known clash pairs, checked within the same routine
const CONFLICTS: [string, string, string][] = [
  ['retinol', 'aha', 'Retinol + AHA can over-exfoliate — alternate nights instead'],
  ['retinol', 'bha', 'Retinol + BHA can over-exfoliate — alternate nights instead'],
  ['retinol', 'ascorbic acid', 'Retinol + vitamin C compete at different pH — split AM/PM'],
  ['benzoyl peroxide', 'retinol', 'Benzoyl peroxide deactivates retinol — use at different times'],
];

export function SkincareApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [products, setProducts] = useState<StoreDoc<Product>[] | null>(null);
  const [view, setView] = useState<'am' | 'pm'>('am');
  const [name, setName] = useState('');
  const [step, setStep] = useState<Step>('cleanse');
  const [routine, setRoutine] = useState<Routine>('both');
  const [ingredients, setIngredients] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Product>('products').then(setProducts);
  }, [store]);

  const inRoutine = (products ?? []).filter((p) => p.data.routine === view || p.data.routine === 'both');
  const ordered = STEPS.flatMap((s) => inRoutine.filter((p) => p.data.step === s));

  const warnings = useMemo(() => {
    const out: string[] = [];
    const allIngredients = inRoutine.flatMap((p) => p.data.keyIngredients.map((i) => i.toLowerCase()));
    for (const [a, b, msg] of CONFLICTS) {
      if (allIngredients.some((i) => i.includes(a)) && allIngredients.some((i) => i.includes(b))) out.push(msg);
    }
    return out;
  }, [inRoutine]);

  async function addProduct() {
    if (!name.trim()) return;
    const p: Product = {
      name: name.trim(),
      step,
      routine,
      keyIngredients: ingredients.split(',').map((i) => i.trim().toLowerCase()).filter(Boolean),
      notes: notes.trim(),
    };
    const doc = await store.create('products', p);
    setProducts((prev) => [...(prev ?? []), doc]);
    setName('');
    setIngredients('');
    setNotes('');
  }

  async function remove(docId: string) {
    await store.remove('products', docId);
    setProducts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportRoutine() {
    const rows = (products ?? []).map((p) => `"${p.data.name}",${p.data.step},${p.data.routine},"${p.data.keyIngredients.join(' + ')}","${p.data.notes}"`);
    const csv = ['product,step,routine,key ingredients,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skincare-routine.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (products === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="skincare-app-root">
      <Section title="Routine">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'am', label: '🌅 Morning' },
              { value: 'pm', label: '🌙 Night' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        {warnings.length > 0 && (
          <div style={{ background: 'rgba(255, 159, 10, 0.1)', border: '1px solid rgba(255, 159, 10, 0.4)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 12 }} data-testid="conflict-warnings">
            {warnings.map((w, i) => (
              <p key={i} style={{ fontSize: 12, color: '#ff9f0a', margin: i ? '4px 0 0' : 0 }}>
                ⚠️ {w}
              </p>
            ))}
          </div>
        )}

        {ordered.length === 0 ? (
          <EmptyState icon="🧴">No products in this routine — add one below.</EmptyState>
        ) : (
          <div data-testid="routine-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {ordered.map((p, i) => (
              <div key={p.docId} className="module-list-row" data-testid="product-item" style={{ alignItems: 'center' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag active>{p.data.step}</Tag>
                    {p.data.keyIngredients.map((ing) => (
                      <Tag key={ing}>{ing}</Tag>
                    ))}
                    {p.data.notes && <span>{p.data.notes}</span>}
                  </div>
                </div>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportRoutine}>
          ⬇️ Export Routine as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Product">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Product</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vitamin C Serum" data-testid="product-name-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Step</Label>
            <Select value={step} onChange={(e) => setStep(e.target.value as Step)} data-testid="product-step-select">
              {STEPS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Routine</Label>
            <Select value={routine} onChange={(e) => setRoutine(e.target.value as Routine)} data-testid="product-routine-select">
              <option value="am">Morning</option>
              <option value="pm">Night</option>
              <option value="both">Both</option>
            </Select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Key Ingredients (Comma Separated)</Label>
            <Input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="retinol, ceramides" data-testid="product-ingredients-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" data-testid="product-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProduct} data-testid="add-product-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
