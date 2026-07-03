import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Specialized Niche CRM — the "specialized" part is real: pick an
// industry template and the pipeline stages, client-field prompt, and
// vocabulary change with it (photographers track shoots, realtors track
// listings, coaches track programs). Clients keep their stage name if
// you switch templates; anything unmatched lands in the first stage on
// display. Money is integer cents.

type Industry = 'photography' | 'real_estate' | 'fitness';
type Settings = { industry: Industry };
type Client = { name: string; contact: string; detail: string; stage: string; valueCents: number };

const TEMPLATES: Record<Industry, { label: string; icon: string; clientNoun: string; detailPrompt: string; stages: string[] }> = {
  photography: {
    label: 'Photography Studio',
    icon: '📸',
    clientNoun: 'Shoot',
    detailPrompt: 'e.g. Oct 18, golden-hour ceremony, 2 shooters',
    stages: ['Inquiry', 'Proposal Sent', 'Booked', 'Shoot Done', 'Editing & Delivery'],
  },
  real_estate: {
    label: 'Real Estate',
    icon: '🏡',
    clientNoun: 'Listing / Buyer',
    detailPrompt: 'e.g. 3BR on Elm St, pre-approved to $450k',
    stages: ['New Lead', 'Showing', 'Offer Made', 'Under Contract', 'Closed'],
  },
  fitness: {
    label: 'Fitness Coaching',
    icon: '💪',
    clientNoun: 'Client',
    detailPrompt: 'e.g. 12-week strength program, knee history',
    stages: ['Consult', 'Trial Session', 'Active Program', 'Renewal Due', 'Alumni'],
  },
};

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function SpecializedNicheCRM({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [settings, setSettings] = useState<StoreDoc<Settings> | null | undefined>(undefined);
  const [clients, setClients] = useState<StoreDoc<Client>[] | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [detail, setDetail] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    store.list<Settings>('settings').then((docs) => setSettings(docs[0] ?? null));
    store.list<Client>('clients').then(setClients);
  }, [store]);

  const industry: Industry = settings?.data.industry ?? 'photography';
  const template = TEMPLATES[industry];
  const list = clients ?? [];
  const pipelineValueCents = list.filter((c) => c.data.stage !== template.stages[template.stages.length - 1]).reduce((s, c) => s + c.data.valueCents, 0);

  function stageOf(c: Client): string {
    return template.stages.includes(c.stage) ? c.stage : template.stages[0]!;
  }

  async function setIndustry(next: Industry) {
    if (settings) {
      const updated = await store.update('settings', settings.docId, { industry: next });
      setSettings(updated);
    } else {
      const doc = await store.create('settings', { industry: next });
      setSettings(doc);
    }
  }

  async function addClient() {
    if (!name.trim()) return;
    const c: Client = { name: name.trim(), contact: contact.trim() || '—', detail: detail.trim(), stage: template.stages[0]!, valueCents: Math.round((Number(value) || 0) * 100) };
    const doc = await store.create('clients', c);
    setClients((prev) => [...(prev ?? []), doc]);
    setName('');
    setContact('');
    setDetail('');
    setValue('');
  }

  async function advance(doc: StoreDoc<Client>) {
    const idx = template.stages.indexOf(stageOf(doc.data));
    if (idx >= template.stages.length - 1) return;
    const updated = await store.update('clients', doc.docId, { ...doc.data, stage: template.stages[idx + 1]! });
    setClients((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function removeClient(docId: string) {
    await store.remove('clients', docId);
    setClients((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportPipeline() {
    const rows = list.map((c) => `"${c.data.name}","${c.data.contact}","${c.data.detail.replace(/"/g, '""')}",${stageOf(c.data)},${(c.data.valueCents / 100).toFixed(2)}`);
    const csv = ['client,contact,details,stage,value', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm-pipeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (settings === undefined || clients === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="niche-crm-root">
      <Section title="Your Industry">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(Object.entries(TEMPLATES) as [Industry, (typeof TEMPLATES)[Industry]][]).map(([key, t]) => (
            <Tag key={key} active={industry === key} onClick={() => setIndustry(key)}>
              {t.icon} {t.label}
            </Tag>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={list.length} label={`${template.clientNoun}s in the book`} />
          <StatDisplay value={<span data-testid="pipeline-value">{fmt(pipelineValueCents)}</span>} label="Open pipeline value" />
          <StatDisplay value={list.filter((c) => stageOf(c.data) === template.stages[template.stages.length - 1]).length} label={`${template.stages[template.stages.length - 1]}`} />
        </div>
      </Section>

      <Divider />

      <Section title="Pipeline">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }} data-testid="pipeline">
          {template.stages.map((stage) => {
            const stageClients = list.filter((c) => stageOf(c.data) === stage);
            return (
              <div key={stage} data-testid={`stage-${stage.replace(/[^a-zA-Z]+/g, '-')}`}>
                <Label>
                  {stage} ({stageClients.length}{stageClients.length > 0 ? ` · ${fmt(stageClients.reduce((s, c) => s + c.data.valueCents, 0))}` : ''})
                </Label>
                {stageClients.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>Empty</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {stageClients.map((c) => (
                      <div key={c.docId} className="module-list-row" data-testid="client-item" style={{ alignItems: 'center' }}>
                        <div className="module-list-row-content" style={{ flex: 1 }}>
                          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.name}</span>
                          <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                            {c.data.contact}
                            {c.data.detail ? ` · ${c.data.detail}` : ''}
                          </div>
                        </div>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(c.data.valueCents)}</span>
                        {template.stages.indexOf(stage) < template.stages.length - 1 && (
                          <Button variant="secondary" onClick={() => advance(c)} data-testid={`advance-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                            → {template.stages[template.stages.indexOf(stage) + 1]}
                          </Button>
                        )}
                        <IconButton label="Remove" onClick={() => removeClient(c.docId)}>
                          ✕
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>{template.clientNoun}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" data-testid="client-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Contact</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" data-testid="client-contact-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 170 }}>
            <Label>Details</Label>
            <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={template.detailPrompt} data-testid="client-detail-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Value ($)</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} data-testid="client-value-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addClient} data-testid="add-client-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPipeline}>
          ⬇️ Export Pipeline as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
