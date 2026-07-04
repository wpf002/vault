import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Shared Expense Tracker for Small Teams — shared ledger with receipt name
// references and settle-up balances: assuming an even split among everyone
// who appears in the ledger, who owes and who is owed. Money is integer
// cents; the remainder from integer division lands on the settle-up view
// as at most a one-cent-per-person discrepancy, which we distribute to the
// largest payers first so totals reconcile exactly.

type Expense = { payer: string; description: string; amountCents: number; receipt: string };

function fmt(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SharedExpenseTrackerForSmallTeams({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [expenses, setExpenses] = useState<StoreDoc<Expense>[] | null>(null);
  const [payer, setPayer] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    store.list<Expense>('expenses').then(setExpenses);
  }, [store]);

  const totalCents = (expenses ?? []).reduce((s, e) => s + e.data.amountCents, 0);

  const balances = useMemo(() => {
    const list = expenses ?? [];
    const people = Array.from(new Set(list.map((e) => e.data.payer)));
    if (people.length === 0) return [];
    const paid = new Map<string, number>(people.map((p) => [p, 0]));
    for (const e of list) paid.set(e.data.payer, (paid.get(e.data.payer) ?? 0) + e.data.amountCents);
    const share = Math.floor(totalCents / people.length);
    let remainder = totalCents - share * people.length;
    // sort by paid desc so the extra cents go to the biggest payers
    const sorted = [...people].sort((a, b) => (paid.get(b) ?? 0) - (paid.get(a) ?? 0));
    return sorted.map((p) => {
      const owes = share + (remainder-- > 0 ? 1 : 0);
      return { person: p, paidCents: paid.get(p) ?? 0, netCents: (paid.get(p) ?? 0) - owes };
    });
  }, [expenses, totalCents]);

  async function addExpense() {
    if (!payer.trim() || !description.trim()) return;
    const e: Expense = { payer: payer.trim(), description: description.trim(), amountCents: Math.round((Number(amount) || 0) * 100), receipt: receipt.trim() };
    const doc = await store.create('expenses', e);
    setExpenses((prev) => [...(prev ?? []), doc]);
    setDescription('');
    setAmount('');
    setReceipt('');
  }

  async function remove(docId: string) {
    await store.remove('expenses', docId);
    setExpenses((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportLedger() {
    const rows = (expenses ?? []).map((e) => `"${e.data.payer}","${e.data.description}",${(e.data.amountCents / 100).toFixed(2)},"${e.data.receipt}"`);
    const csv = ['payer,description,amount,receipt', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (expenses === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="shared-expense-tracker-root">
      <Section title="Ledger">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={fmt(totalCents)} label={`Total shared spend across ${balances.length} people`} />
        </div>

        {expenses.length === 0 ? (
          <EmptyState icon="🧾">No expenses logged yet.</EmptyState>
        ) : (
          <div data-testid="expenses-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {expenses.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="expense-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.description}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{e.data.payer}</Tag>
                    {e.data.receipt && <span>📎 {e.data.receipt}</span>}
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(e.data.amountCents)}</span>
                <IconButton label="Remove" onClick={() => remove(e.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ width: 120 }}>
            <Label>Payer</Label>
            <Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Who paid?" data-testid="expense-payer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it?" data-testid="expense-desc-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Amount ($)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="expense-amount-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Receipt (Name)</Label>
            <Input value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Optional" data-testid="expense-receipt-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addExpense} data-testid="add-expense-button">
            + Log
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Settle Up (Even Split)">
        {balances.length === 0 ? (
          <EmptyState icon="⚖️">Balances appear once expenses are logged.</EmptyState>
        ) : (
          <div data-testid="balances-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {balances.map((b) => (
              <div key={b.person} className="module-list-row" data-testid="balance-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{b.person}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>paid {fmt(b.paidCents)}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: b.netCents >= 0 ? 'var(--module-accent)' : '#ff6b5e' }} data-testid={`net-${b.person}`}>
                  {b.netCents >= 0 ? `is owed ${fmt(b.netCents)}` : `owes ${fmt(-b.netCents)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLedger}>
          Export Ledger as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
