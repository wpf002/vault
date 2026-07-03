import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Supplement Tracking Tool — a dosing schedule (stack grouped by
// morning/midday/evening timing) with daily taken-checkoffs and notes on
// observed effects per supplement.

const TIMINGS = ['morning', 'midday', 'evening'] as const;
type Timing = (typeof TIMINGS)[number];
const TIMING_ICON: Record<Timing, string> = { morning: '🌅', midday: '☀️', evening: '🌙' };

type Supplement = { name: string; dose: string; timing: Timing; notes: string };
type Dose = { date: string; supplement: string };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function SupplementTrackingTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [supplements, setSupplements] = useState<StoreDoc<Supplement>[] | null>(null);
  const [doses, setDoses] = useState<StoreDoc<Dose>[] | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [timing, setTiming] = useState<Timing>('morning');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Supplement>('supplements').then(setSupplements);
    store.list<Dose>('doses').then(setDoses);
  }, [store]);

  const todayDoses = (doses ?? []).filter((d) => d.data.date === todayStr());
  const takenToday = new Set(todayDoses.map((d) => d.data.supplement));
  const takenCount = (supplements ?? []).filter((s) => takenToday.has(s.data.name)).length;

  async function addSupplement() {
    if (!name.trim()) return;
    const s: Supplement = { name: name.trim(), dose: dose.trim() || '—', timing, notes: notes.trim() };
    const doc = await store.create('supplements', s);
    setSupplements((prev) => [...(prev ?? []), doc]);
    setName('');
    setDose('');
    setNotes('');
  }

  async function toggleTaken(supplement: Supplement) {
    const existing = todayDoses.find((d) => d.data.supplement === supplement.name);
    if (existing) {
      await store.remove('doses', existing.docId);
      setDoses((prev) => (prev ?? []).filter((d) => d.docId !== existing.docId));
    } else {
      const doc = await store.create('doses', { date: todayStr(), supplement: supplement.name });
      setDoses((prev) => [...(prev ?? []), doc]);
    }
  }

  async function removeSupplement(docId: string) {
    await store.remove('supplements', docId);
    setSupplements((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportStack() {
    const rows = (supplements ?? []).map((s) => `"${s.data.name}","${s.data.dose}",${s.data.timing},"${s.data.notes}"`);
    const csv = ['supplement,dose,timing,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplement-stack.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (supplements === null || doses === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="supplement-tracking-root">
      <Section title="Today">
        <div style={{ marginBottom: 4 }}>
          <StatDisplay value={`${takenCount}/${supplements.length}`} label="Doses taken today" />
        </div>
      </Section>

      <Divider />

      <Section title="Dosing Schedule">
        {supplements.length === 0 ? (
          <EmptyState icon="💊">No supplements in your stack yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            {TIMINGS.map((t) => {
              const group = supplements.filter((s) => s.data.timing === t);
              if (group.length === 0) return null;
              return (
                <div key={t}>
                  <Label>
                    {TIMING_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid={`timing-${t}`}>
                    {group.map((s) => {
                      const taken = takenToday.has(s.data.name);
                      return (
                        <div key={s.docId} className="module-list-row" data-testid="supplement-item" style={{ alignItems: 'center' }}>
                          <Button
                            variant={taken ? 'primary' : 'secondary'}
                            onClick={() => toggleTaken(s.data)}
                            data-testid={`take-${s.docId}`}
                            style={{ padding: '4px 10px', fontSize: 12, minWidth: 34 }}
                          >
                            {taken ? '✓' : ''}
                          </Button>
                          <div className="module-list-row-content" style={{ flex: 1 }}>
                            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.name}</span>
                            <span style={{ fontSize: 12, marginLeft: 8 }}>
                              <Tag>{s.data.dose}</Tag>
                            </span>
                            {s.data.notes && <div style={{ fontSize: 12, marginTop: 2 }}>{s.data.notes}</div>}
                          </div>
                          <IconButton label="Remove" onClick={() => removeSupplement(s.docId)}>
                            ✕
                          </IconButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportStack}>
          ⬇️ Export Stack as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add to Stack">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Supplement</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vitamin D3" data-testid="supp-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Dose</Label>
            <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="4000 IU" data-testid="supp-dose-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Timing</Label>
            <Select value={timing} onChange={(e) => setTiming(e.target.value as Timing)} data-testid="supp-timing-select">
              {TIMINGS.map((t) => (
                <option key={t} value={t}>
                  {TIMING_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Effect Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do you notice?" data-testid="supp-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addSupplement} data-testid="add-supp-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
