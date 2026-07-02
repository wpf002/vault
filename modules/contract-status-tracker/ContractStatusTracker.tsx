import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, EmptyState, LoadingState } from '@vault/module-ui';

// Contract Status Tracker — Visual Kanban pipeline for client agreements.
// Money is integer cents (platform invariant) — valueCents, formatted only
// at render time.

const STAGES = ['drafting', 'sent', 'negotiating', 'signed'] as const;
type Stage = (typeof STAGES)[number];
const STAGE_LABELS: Record<Stage, string> = { drafting: 'Drafting', sent: 'Sent', negotiating: 'Negotiating', signed: 'Signed' };

type Contract = { client: string; title: string; valueCents: number; stage: Stage };

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ContractStatusTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [contracts, setContracts] = useState<StoreDoc<Contract>[] | null>(null);
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    store.list<Contract>('contracts').then(setContracts);
  }, [store]);

  async function addContract() {
    if (!client.trim() || !title.trim()) return;
    const valueCents = Math.round((Number(value) || 0) * 100);
    const contract: Contract = { client: client.trim(), title: title.trim(), valueCents, stage: 'drafting' };
    const doc = await store.create('contracts', contract);
    setContracts((prev) => [...(prev ?? []), doc]);
    setClient('');
    setTitle('');
    setValue('');
  }

  async function moveStage(doc: StoreDoc<Contract>, direction: 1 | -1) {
    const idx = STAGES.indexOf(doc.data.stage);
    const next = STAGES[idx + direction];
    if (!next) return;
    const updated = await store.update('contracts', doc.docId, { ...doc.data, stage: next });
    setContracts((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function remove(docId: string) {
    await store.remove('contracts', docId);
    setContracts((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportPipeline() {
    const rows = (contracts ?? []).map((c) => `${c.data.client},"${c.data.title}",${(c.data.valueCents / 100).toFixed(2)},${c.data.stage}`);
    const csv = ['client,title,value,stage', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contract-pipeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (contracts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="contract-status-tracker-root">
      <Section title="Add a Contract">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Acme Co" data-testid="contract-client-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Agreement</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Website Redesign SOW" data-testid="contract-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Value ($)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="12000" data-testid="contract-value-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addContract} data-testid="add-contract-button">
            + Add
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Pipeline">
        {contracts.length === 0 ? (
          <EmptyState icon="📋">No contracts yet — add one above.</EmptyState>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }} data-testid="pipeline-board">
            {STAGES.map((stage) => {
              const inStage = contracts.filter((c) => c.data.stage === stage);
              const total = inStage.reduce((sum, c) => sum + c.data.valueCents, 0);
              return (
                <div key={stage} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', padding: 10 }} data-testid={`stage-${stage}`}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', marginBottom: 2 }}>
                    {STAGE_LABELS[stage]} ({inStage.length})
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--module-accent)', fontWeight: 700, marginBottom: 8 }}>{fmtMoney(total)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inStage.map((c) => (
                      <div key={c.docId} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 8 }} data-testid="contract-card">
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.data.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 6 }}>
                          {c.data.client} · {fmtMoney(c.data.valueCents)}
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <IconButton label="Move back" onClick={() => moveStage(c, -1)} disabled={stage === STAGES[0]} style={{ color: 'var(--color-text-dim)' }}>
                            ←
                          </IconButton>
                          <IconButton label="Move forward" onClick={() => moveStage(c, 1)} disabled={stage === STAGES[STAGES.length - 1]} style={{ color: 'var(--module-accent)' }}>
                            →
                          </IconButton>
                          <span style={{ marginLeft: 'auto' }}>
                            <IconButton label="Remove" onClick={() => remove(c.docId)}>
                              ✕
                            </IconButton>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPipeline}>
          ⬇️ Export Pipeline as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
