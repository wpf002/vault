import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// E-Wallet — a top-up/spend ledger with category cashback rates and a
// redeemable cashback balance. Scope note: real card issuing / payment
// rails are regulated processor integrations — the ledger math and
// cashback accrual logic live here. Money is integer cents; balance is
// always derived from the ledger, never stored separately (no drift).

type Txn = { kind: 'topup' | 'spend' | 'redeem'; label: string; category: string; amountCents: number; cashbackCents: number };

// cashback rate by spend category, in basis points (300 = 3%)
const CASHBACK_BPS: Record<string, number> = {
  Dining: 300,
  Transport: 200,
  Groceries: 100,
  Shopping: 100,
  Entertainment: 200,
  Other: 50,
};

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function EWallet({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [txns, setTxns] = useState<StoreDoc<Txn>[] | null>(null);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('Dining');
  const [amount, setAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    store.list<Txn>('transactions').then(setTxns);
  }, [store]);

  const list = txns ?? [];
  // ledger-derived balances
  const balanceCents = list.reduce((s, t) => {
    if (t.data.kind === 'topup') return s + t.data.amountCents;
    if (t.data.kind === 'spend') return s - t.data.amountCents;
    return s + t.data.amountCents; // redeem moves cashback into the wallet
  }, 0);
  const cashbackEarnedCents = list.reduce((s, t) => s + t.data.cashbackCents, 0);
  const cashbackRedeemedCents = list.filter((t) => t.data.kind === 'redeem').reduce((s, t) => s + t.data.amountCents, 0);
  const cashbackAvailableCents = cashbackEarnedCents - cashbackRedeemedCents;
  const spentCents = list.filter((t) => t.data.kind === 'spend').reduce((s, t) => s + t.data.amountCents, 0);

  async function add(t: Txn) {
    const doc = await store.create('transactions', t);
    setTxns((prev) => [doc, ...(prev ?? [])]);
  }

  async function topUp() {
    const cents = Math.round((Number(topUpAmount) || 0) * 100);
    if (cents <= 0) return;
    await add({ kind: 'topup', label: 'Wallet Top-Up', category: '—', amountCents: cents, cashbackCents: 0 });
    setTopUpAmount('');
  }

  async function spend() {
    const cents = Math.round((Number(amount) || 0) * 100);
    if (!label.trim() || cents <= 0) return;
    if (cents > balanceCents) return; // wallet can't go negative
    const cashback = Math.round((cents * (CASHBACK_BPS[category] ?? 0)) / 10000);
    await add({ kind: 'spend', label: label.trim(), category, amountCents: cents, cashbackCents: cashback });
    setLabel('');
    setAmount('');
  }

  async function redeemCashback() {
    if (cashbackAvailableCents <= 0) return;
    await add({ kind: 'redeem', label: 'Cashback Redeemed', category: '—', amountCents: cashbackAvailableCents, cashbackCents: 0 });
  }

  async function remove(docId: string) {
    await store.remove('transactions', docId);
    setTxns((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportLedger() {
    const rows = list.map((t) => `${t.data.kind},"${t.data.label}",${t.data.category},${(t.data.amountCents / 100).toFixed(2)},${(t.data.cashbackCents / 100).toFixed(2)}`);
    const csv = ['type,label,category,amount,cashback', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallet-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (txns === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="e-wallet-root">
      <Section title="Wallet">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <StatDisplay value={<span data-testid="balance-value">{fmt(balanceCents)}</span>} label="Available balance" />
          <StatDisplay value={<span data-testid="cashback-value">{fmt(cashbackAvailableCents)}</span>} label="Cashback ready to redeem" />
          <StatDisplay value={fmt(spentCents)} label="Total spent" />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 130 }}>
            <Label>Top Up ($)</Label>
            <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} data-testid="topup-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={topUp} data-testid="topup-button">
            ⬆️ Top Up
          </Button>
          <Button variant="secondary" onClick={redeemCashback} data-testid="redeem-button" disabled={cashbackAvailableCents <= 0}>
            🎁 Redeem {cashbackAvailableCents > 0 ? fmt(cashbackAvailableCents) : 'Cashback'}
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Pay from Wallet">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Merchant</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Corner Café" data-testid="merchant-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 170 }}>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-select" style={{ width: '100%' }}>
              {Object.keys(CASHBACK_BPS).map((c) => (
                <option key={c} value={c}>
                  {c} ({CASHBACK_BPS[c]! / 100}% back)
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 110 }}>
            <Label>Amount ($)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="amount-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={spend} data-testid="pay-button">
            💳 Pay
          </Button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>Payments are declined past your balance — the wallet never goes negative.</p>
      </Section>

      <Divider />

      <Section title="Transactions">
        {list.length === 0 ? (
          <EmptyState icon="👛">No transactions — top up your wallet to start.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="transactions-list">
            {list.map((t) => (
              <div key={t.docId} className="module-list-row" data-testid="txn-item" style={{ alignItems: 'center' }}>
                <span style={{ minWidth: 24 }}>{t.data.kind === 'topup' ? '⬆️' : t.data.kind === 'redeem' ? '🎁' : '💳'}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.data.label}</span>
                  {t.data.kind === 'spend' && <span style={{ fontSize: 12, marginLeft: 8 }}>{t.data.category}</span>}
                </div>
                {t.data.cashbackCents > 0 && <Tag active>+{fmt(t.data.cashbackCents)} back</Tag>}
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: t.data.kind === 'spend' ? 'var(--color-text)' : 'var(--module-accent)' }}>
                  {t.data.kind === 'spend' ? '−' : '+'}
                  {fmt(t.data.amountCents)}
                </span>
                <IconButton label="Remove" onClick={() => remove(t.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLedger}>
          ⬇️ Export Ledger as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
