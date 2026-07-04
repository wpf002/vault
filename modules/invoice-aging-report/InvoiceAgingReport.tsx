import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Invoice Aging Report — outstanding invoices bucketed into the standard
// aging bands (current / 1-30 / 31-60 / 61+ days overdue), each with a
// reminder log (records the date you sent a follow-up — actually emailing
// is platform notification work). Money is integer cents.

type Invoice = { client: string; number: string; amountCents: number; dueDate: string; paid: boolean; lastReminder: string };

const BUCKETS = [
  { label: 'Current', min: -Infinity, max: 0 },
  { label: '1–30 Days Overdue', min: 1, max: 30 },
  { label: '31–60 Days Overdue', min: 31, max: 60 },
  { label: '61+ Days Overdue', min: 61, max: Infinity },
] as const;

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysOverdue(dueDate: string): number {
  return Math.floor((Date.parse(todayStr()) - Date.parse(dueDate)) / 86400000);
}

export function InvoiceAgingReport({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [invoices, setInvoices] = useState<StoreDoc<Invoice>[] | null>(null);
  const [client, setClient] = useState('');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    store.list<Invoice>('invoices').then(setInvoices);
  }, [store]);

  const outstanding = (invoices ?? []).filter((i) => !i.data.paid);
  const totalOutstanding = outstanding.reduce((s, i) => s + i.data.amountCents, 0);
  const overdue = outstanding.filter((i) => daysOverdue(i.data.dueDate) > 0);

  const buckets = useMemo(
    () =>
      BUCKETS.map((b) => ({
        ...b,
        invoices: outstanding
          .filter((i) => {
            const d = daysOverdue(i.data.dueDate);
            return d >= b.min && d <= b.max;
          })
          .sort((a, z) => daysOverdue(z.data.dueDate) - daysOverdue(a.data.dueDate)),
      })),
    [outstanding],
  );

  async function addInvoice() {
    if (!client.trim() || !dueDate) return;
    const inv: Invoice = { client: client.trim(), number: number.trim() || `INV-${1000 + (invoices?.length ?? 0)}`, amountCents: Math.round((Number(amount) || 0) * 100), dueDate, paid: false, lastReminder: '' };
    const doc = await store.create('invoices', inv);
    setInvoices((prev) => [...(prev ?? []), doc]);
    setClient('');
    setNumber('');
    setAmount('');
  }

  async function logReminder(doc: StoreDoc<Invoice>) {
    const updated = await store.update('invoices', doc.docId, { ...doc.data, lastReminder: todayStr() });
    setInvoices((prev) => (prev ?? []).map((i) => (i.docId === doc.docId ? updated : i)));
  }

  async function markPaid(doc: StoreDoc<Invoice>) {
    const updated = await store.update('invoices', doc.docId, { ...doc.data, paid: true });
    setInvoices((prev) => (prev ?? []).map((i) => (i.docId === doc.docId ? updated : i)));
  }

  async function remove(docId: string) {
    await store.remove('invoices', docId);
    setInvoices((prev) => (prev ?? []).filter((i) => i.docId !== docId));
  }

  function exportReport() {
    const rows = outstanding.map((i) => `"${i.data.client}",${i.data.number},${(i.data.amountCents / 100).toFixed(2)},${i.data.dueDate},${Math.max(0, daysOverdue(i.data.dueDate))},"${i.data.lastReminder}"`);
    const csv = ['client,invoice,amount,due date,days overdue,last reminder', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice-aging.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (invoices === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="invoice-aging-report-root">
      <Section title="Outstanding">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={fmt(totalOutstanding)} label={`${outstanding.length} unpaid invoices`} />
          <StatDisplay value={overdue.length} label="Past due" />
        </div>
      </Section>

      <Divider />

      <Section title="Aging Report">
        {outstanding.length === 0 ? (
          <EmptyState icon="⏳">Nothing outstanding — every invoice is paid.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            {buckets.map(
              (b) =>
                b.invoices.length > 0 && (
                  <div key={b.label} data-testid={`bucket-${b.label.split(' ')[0]}`}>
                    <Label>
                      {b.label} ({fmt(b.invoices.reduce((s, i) => s + i.data.amountCents, 0))})
                    </Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {b.invoices.map((i) => {
                        const d = daysOverdue(i.data.dueDate);
                        return (
                          <div key={i.docId} className="module-list-row" data-testid="invoice-item" style={{ alignItems: 'center' }}>
                            <div className="module-list-row-content" style={{ flex: 1 }}>
                              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                                {i.data.client} · {i.data.number}
                              </span>
                              <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ color: d > 30 ? '#ff6b5e' : d > 0 ? '#ff9f0a' : 'var(--color-text-dim)' }}>
                                  {d > 0 ? `${d} days overdue` : `due ${i.data.dueDate}`}
                                </span>
                                {i.data.lastReminder && <span>✉️ reminded {i.data.lastReminder}</span>}
                              </div>
                            </div>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(i.data.amountCents)}</span>
                            <Button variant="ghost" onClick={() => logReminder(i)} data-testid={`remind-${i.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                              Log Reminder
                            </Button>
                            <Button variant="secondary" onClick={() => markPaid(i)} data-testid={`paid-${i.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                              ✓ Paid
                            </Button>
                            <IconButton label="Remove" onClick={() => remove(i.docId)}>
                              ✕
                            </IconButton>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" data-testid="invoice-client-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Invoice #</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-1042" data-testid="invoice-number-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Amount ($)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="invoice-amount-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="invoice-due-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addInvoice} data-testid="add-invoice-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          Export Aging Report as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
