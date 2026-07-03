import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';

// Freelancer Cash Flow Dashboard — projects the next 12 months of balance
// from current contracts (each contributes monthly revenue until its end
// month) minus monthly burn, and reports the runway: the first month the
// projected balance goes negative, or 12+ if it never does. Money is
// integer cents.

type Settings = { balanceCents: number; monthlyBurnCents: number };
type Contract = { client: string; monthlyCents: number; endMonth: string };

function fmt(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthKey(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}

export function FreelancerCashFlowDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [settings, setSettings] = useState<StoreDoc<Settings> | null | undefined>(undefined);
  const [contracts, setContracts] = useState<StoreDoc<Contract>[] | null>(null);
  const [balance, setBalance] = useState('');
  const [burn, setBurn] = useState('');
  const [client, setClient] = useState('');
  const [monthly, setMonthly] = useState('');
  const [endMonth, setEndMonth] = useState('');

  useEffect(() => {
    store.list<Settings>('settings').then((docs) => setSettings(docs[0] ?? null));
    store.list<Contract>('contracts').then(setContracts);
  }, [store]);

  const s = settings?.data ?? { balanceCents: 0, monthlyBurnCents: 0 };

  const projection = useMemo(() => {
    const months: { month: string; balanceCents: number }[] = [];
    let bal = s.balanceCents;
    for (let i = 1; i <= 12; i++) {
      const m = monthKey(i);
      const income = (contracts ?? []).reduce((sum, c) => (c.data.endMonth >= m ? sum + c.data.monthlyCents : sum), 0);
      bal += income - s.monthlyBurnCents;
      months.push({ month: m, balanceCents: bal });
    }
    return months;
  }, [contracts, s.balanceCents, s.monthlyBurnCents]);

  const runwayIdx = projection.findIndex((m) => m.balanceCents < 0);
  const runwayLabel = runwayIdx === -1 ? '12+ months' : `${runwayIdx} month${runwayIdx === 1 ? '' : 's'}`;
  const maxAbs = Math.max(1, ...projection.map((m) => Math.abs(m.balanceCents)));

  async function saveSettings() {
    const next: Settings = { balanceCents: Math.round((Number(balance) || 0) * 100), monthlyBurnCents: Math.round((Number(burn) || 0) * 100) };
    if (settings) {
      const updated = await store.update('settings', settings.docId, next);
      setSettings(updated);
    } else {
      const doc = await store.create('settings', next);
      setSettings(doc);
    }
    setBalance('');
    setBurn('');
  }

  async function addContract() {
    if (!client.trim() || !endMonth) return;
    const c: Contract = { client: client.trim(), monthlyCents: Math.round((Number(monthly) || 0) * 100), endMonth };
    const doc = await store.create('contracts', c);
    setContracts((prev) => [...(prev ?? []), doc]);
    setClient('');
    setMonthly('');
  }

  async function remove(docId: string) {
    await store.remove('contracts', docId);
    setContracts((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportProjection() {
    const rows = projection.map((m) => `${m.month},${(m.balanceCents / 100).toFixed(2)}`);
    const csv = ['month,projected balance', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-flow-projection.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (settings === undefined || contracts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="freelancer-cash-flow-root">
      <Section title="Runway">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <StatDisplay value={fmt(s.balanceCents)} label="Current balance" />
          <StatDisplay value={fmt(s.monthlyBurnCents)} label="Monthly burn" />
          <StatDisplay value={<span data-testid="runway-value">{runwayLabel}</span>} label="Runway before balance goes negative" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 100, marginBottom: 4 }} data-testid="projection-chart">
          {projection.map((m) => {
            const positive = m.balanceCents >= 0;
            const h = (Math.abs(m.balanceCents) / maxAbs) * 46;
            return (
              <div key={m.month} title={`${m.month}: ${fmt(m.balanceCents)}`} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
                  {positive && <div style={{ width: '100%', height: `${h}%`, minHeight: 2, background: 'var(--module-accent)', borderRadius: '3px 3px 0 0' }} aria-hidden />}
                </div>
                <div style={{ height: 1, background: 'var(--color-border)' }} aria-hidden />
                <div style={{ flex: 1 }}>
                  {!positive && <div style={{ width: '100%', height: `${h}%`, minHeight: 2, background: '#ff6b5e', borderRadius: '0 0 3px 3px' }} aria-hidden />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 10 }}>
          <span>{projection[0]?.month}</span>
          <span>{projection[projection.length - 1]?.month}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 130 }}>
            <Label>Balance ($)</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder={(s.balanceCents / 100).toFixed(0)} data-testid="balance-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Monthly Burn ($)</Label>
            <Input type="number" value={burn} onChange={(e) => setBurn(e.target.value)} placeholder={(s.monthlyBurnCents / 100).toFixed(0)} data-testid="burn-input" style={{ width: '100%' }} />
          </div>
          <Button variant="secondary" onClick={saveSettings} data-testid="save-settings-button">
            Update
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Active Contracts">
        {contracts.length === 0 ? (
          <EmptyState icon="💵">No contracts — add your income sources below.</EmptyState>
        ) : (
          <div data-testid="contracts-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {contracts.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="contract-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.client}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>through {c.data.endMonth}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(c.data.monthlyCents)}/mo</span>
                <IconButton label="Remove" onClick={() => remove(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" data-testid="contract-client-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Monthly ($)</Label>
            <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} data-testid="contract-monthly-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Ends</Label>
            <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} data-testid="contract-end-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addContract} data-testid="add-contract-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportProjection}>
          ⬇️ Export 12-Month Projection as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
