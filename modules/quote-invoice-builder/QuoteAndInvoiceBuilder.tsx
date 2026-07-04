import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Quote and Invoice Builder — Custom quoting with line items and tax.
// Money is integer cents everywhere (platform invariant); the tax
// percentage is the only float and totals round per line at cent
// precision. Scope note: "Stripe payment" on an invoice means charging
// the *client's customer* — that's a Stripe Connect feature at the
// platform level, not something a module can do with the store; the
// builder produces the correct totals a payment link would charge.

type Line = { description: string; qty: number; unitCents: number };
type Doc = { client: string; kind: 'quote' | 'invoice'; taxPct: number; lines: Line[] };

function lineTotal(l: Line): number {
  return Math.round(l.qty * l.unitCents);
}
function subtotal(d: Doc): number {
  return d.lines.reduce((sum, l) => sum + lineTotal(l), 0);
}
function taxCents(d: Doc): number {
  return Math.round((subtotal(d) * d.taxPct) / 100);
}
function totalCents(d: Doc): number {
  return subtotal(d) + taxCents(d);
}
function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuoteAndInvoiceBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [docs, setDocs] = useState<StoreDoc<Doc>[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [client, setClient] = useState('');
  const [kind, setKind] = useState<'quote' | 'invoice'>('quote');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [taxPct, setTaxPct] = useState('0');

  useEffect(() => {
    store.list<Doc>('invoices').then((list) => {
      setDocs(list);
      if (list[0]) setOpenId(list[0].docId);
    });
  }, [store]);

  const open = openId ? (docs ?? []).find((d) => d.docId === openId) ?? null : null;

  async function createDoc() {
    if (!client.trim()) return;
    const doc = await store.create('invoices', { client: client.trim(), kind, taxPct: Number(taxPct) || 0, lines: [] });
    setDocs((prev) => [...(prev ?? []), doc]);
    setOpenId(doc.docId);
    setClient('');
  }

  async function addLine() {
    if (!open || !desc.trim()) return;
    const line: Line = { description: desc.trim(), qty: Number(qty) || 1, unitCents: Math.round((Number(unit) || 0) * 100) };
    const updated = await store.update('invoices', open.docId, { ...open.data, lines: [...open.data.lines, line] });
    setDocs((prev) => (prev ?? []).map((d) => (d.docId === open.docId ? updated : d)));
    setDesc('');
    setUnit('');
    setQty('1');
  }

  async function removeLine(index: number) {
    if (!open) return;
    const lines = open.data.lines.filter((_, i) => i !== index);
    const updated = await store.update('invoices', open.docId, { ...open.data, lines });
    setDocs((prev) => (prev ?? []).map((d) => (d.docId === open.docId ? updated : d)));
  }

  async function updateTax(pct: string) {
    setTaxPct(pct);
    if (!open) return;
    const updated = await store.update('invoices', open.docId, { ...open.data, taxPct: Number(pct) || 0 });
    setDocs((prev) => (prev ?? []).map((d) => (d.docId === open.docId ? updated : d)));
  }

  async function removeDoc(docId: string) {
    await store.remove('invoices', docId);
    setDocs((prev) => (prev ?? []).filter((d) => d.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportDoc() {
    if (!open) return;
    const d = open.data;
    const lines = d.lines.map((l) => `${l.description}\t${l.qty} × ${fmt(l.unitCents)}\t${fmt(lineTotal(l))}`).join('\n');
    const text = `${d.kind.toUpperCase()} — ${d.client}\n\n${lines}\n\nSubtotal\t${fmt(subtotal(d))}\nTax (${d.taxPct}%)\t${fmt(taxCents(d))}\nTotal\t${fmt(totalCents(d))}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.kind}-${d.client.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (docs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="quote-invoice-builder-root">
      <Section title="Documents">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {docs.map((d) => (
            <span key={d.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Tag active={openId === d.docId} onClick={() => { setOpenId(d.docId); setTaxPct(String(d.data.taxPct)); }}>
                {d.data.kind === 'quote' ? '📄' : '💳'} {d.data.client}
              </Tag>
              <IconButton label="Remove document" onClick={() => removeDoc(d.docId)}>
                ✕
              </IconButton>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="New client name" data-testid="doc-client-input" style={{ width: '100%' }} />
          </div>
          <SegmentedControl
            options={[
              { value: 'quote', label: 'Quote' },
              { value: 'invoice', label: 'Invoice' },
            ]}
            value={kind}
            onChange={setKind}
          />
          <Button variant="primary" onClick={createDoc} data-testid="create-doc-button">
            + Create
          </Button>
        </div>
      </Section>

      {open && (
        <>
          <Divider />
          <Section title={`${open.data.kind === 'quote' ? 'Quote' : 'Invoice'} — ${open.data.client}`}>
            {open.data.lines.length === 0 ? (
              <EmptyState icon="💳">No line items yet — add the first one below.</EmptyState>
            ) : (
              <div data-testid="lines-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {open.data.lines.map((l, i) => (
                  <div key={i} className="module-list-row" data-testid="line-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)' }}>{l.description}</span>
                      <span style={{ fontSize: 12, marginLeft: 8 }}>
                        {l.qty} × {fmt(l.unitCents)}
                      </span>
                    </div>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 13 }}>{fmt(lineTotal(l))}</span>
                    <IconButton label="Remove line" onClick={() => removeLine(i)}>
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ flex: 2, minWidth: 160 }}>
                <Label>Description</Label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Line item" data-testid="line-desc-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 70 }}>
                <Label>Qty</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} data-testid="line-qty-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 110 }}>
                <Label>Unit ($)</Label>
                <Input type="number" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="0.00" data-testid="line-unit-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={addLine} data-testid="add-line-button">
                + Add Line
              </Button>
              <div style={{ width: 90 }}>
                <Label>Tax %</Label>
                <Input type="number" value={taxPct} onChange={(e) => updateTax(e.target.value)} data-testid="tax-input" style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <StatDisplay
                value={<span data-testid="total-value">{fmt(totalCents(open.data))}</span>}
                label={`Subtotal ${fmt(subtotal(open.data))} + tax ${fmt(taxCents(open.data))} (${open.data.taxPct}%)`}
              />
            </div>

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDoc}>
              Export {open.data.kind === 'quote' ? 'Quote' : 'Invoice'}
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
