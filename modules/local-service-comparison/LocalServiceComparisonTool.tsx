import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Local Service Comparison Tool — Side-by-side quotes for roofing,
// landscaping, cleaning, or any local service. Quotes group by project;
// the comparison table highlights the cheapest bid per project. Money is
// integer cents.

type Quote = { project: string; vendor: string; priceCents: number; timeline: string; warranty: string; notes: string };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function LocalServiceComparisonTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [quotes, setQuotes] = useState<StoreDoc<Quote>[] | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [project, setProject] = useState('');
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState('');
  const [timeline, setTimeline] = useState('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    store.list<Quote>('quotes').then((docs) => {
      setQuotes(docs);
      const first = docs[0]?.data.project;
      if (first) setActiveProject(first);
    });
  }, [store]);

  const projects = useMemo(() => Array.from(new Set((quotes ?? []).map((q) => q.data.project))).sort(), [quotes]);
  const visible = (quotes ?? []).filter((q) => q.data.project === activeProject).sort((a, b) => a.data.priceCents - b.data.priceCents);
  const cheapest = visible[0]?.docId;

  async function addQuote() {
    if (!project.trim() || !vendor.trim()) return;
    const q: Quote = {
      project: project.trim(),
      vendor: vendor.trim(),
      priceCents: Math.round((Number(price) || 0) * 100),
      timeline: timeline.trim() || '—',
      warranty: warranty.trim() || '—',
      notes: notes.trim(),
    };
    const doc = await store.create('quotes', q);
    setQuotes((prev) => [...(prev ?? []), doc]);
    setActiveProject(q.project);
    setVendor('');
    setPrice('');
    setTimeline('');
    setWarranty('');
    setNotes('');
  }

  async function remove(docId: string) {
    await store.remove('quotes', docId);
    setQuotes((prev) => (prev ?? []).filter((q) => q.docId !== docId));
  }

  function exportComparison() {
    const rows = (quotes ?? []).map((q) => `"${q.data.project}","${q.data.vendor}",${(q.data.priceCents / 100).toFixed(2)},"${q.data.timeline}","${q.data.warranty}","${q.data.notes}"`);
    const csv = ['project,vendor,price,timeline,warranty,notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-quotes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (quotes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="local-service-comparison-root">
      <Section title="Compare Quotes">
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {projects.map((p) => (
              <Tag key={p} active={activeProject === p} onClick={() => setActiveProject(p)}>
                {p}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="⚖️">No quotes for this project yet — log the first bid below.</EmptyState>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }} data-testid="comparison-table">
              <thead>
                <tr style={{ color: 'var(--color-text-dim)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor</th>
                  <th style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                  <th style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</th>
                  <th style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warranty</th>
                  <th style={{ padding: '6px 10px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((q) => (
                  <tr
                    key={q.docId}
                    data-testid="quote-row"
                    style={{
                      background: q.docId === cheapest ? 'color-mix(in srgb, var(--module-accent) 10%, var(--color-bg))' : 'var(--color-bg)',
                      borderTop: '4px solid var(--color-surface)',
                    }}
                  >
                    <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {q.data.vendor}
                      {q.docId === cheapest && <Tag active> Best Price</Tag>}
                    </td>
                    <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(q.data.priceCents)}</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-dim)' }}>{q.data.timeline}</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-dim)' }}>{q.data.warranty}</td>
                    <td style={{ padding: '10px', color: 'var(--color-text-dim)', maxWidth: 220 }}>{q.data.notes}</td>
                    <td style={{ padding: '10px' }}>
                      <IconButton label="Remove" onClick={() => remove(q.docId)}>
                        ✕
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportComparison}>
          ⬇️ Export All Quotes as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Log a Quote">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Project</Label>
            <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Roof replacement" data-testid="quote-project-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Vendor</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Company name" data-testid="quote-vendor-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Price ($)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="quote-price-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 130 }}>
            <Label>Timeline</Label>
            <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="2 weeks" data-testid="quote-timeline-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Warranty</Label>
            <Input value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="25 yr" data-testid="quote-warranty-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's included?" data-testid="quote-notes-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addQuote} data-testid="add-quote-button">
            + Log Quote
          </Button>
        </div>
      </Section>
    </div>
  );
}
