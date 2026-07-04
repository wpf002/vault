import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Affiliate Dashboard — clicks, conversions, and payouts across programs,
// with per-program conversion rate and outstanding-balance tracking.
// Money is integer cents. Scope note: pulling stats from affiliate
// networks is per-network API work; you log the numbers, the dashboard
// does the math.

type Program = { name: string; clicks: number; conversions: number; payoutCents: number; paid: boolean };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function AffiliateDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [programs, setPrograms] = useState<StoreDoc<Program>[] | null>(null);
  const [name, setName] = useState('');
  const [clicks, setClicks] = useState('');
  const [conversions, setConversions] = useState('');
  const [payout, setPayout] = useState('');

  useEffect(() => {
    store.list<Program>('programs').then((docs) => setPrograms(docs.sort((a, b) => b.data.payoutCents - a.data.payoutCents)));
  }, [store]);

  const totalPayout = (programs ?? []).reduce((s, p) => s + p.data.payoutCents, 0);
  const outstanding = (programs ?? []).filter((p) => !p.data.paid).reduce((s, p) => s + p.data.payoutCents, 0);
  const totalClicks = (programs ?? []).reduce((s, p) => s + p.data.clicks, 0);
  const totalConv = (programs ?? []).reduce((s, p) => s + p.data.conversions, 0);
  const overallRate = totalClicks ? ((totalConv / totalClicks) * 100).toFixed(1) : '—';

  async function addProgram() {
    if (!name.trim()) return;
    const p: Program = { name: name.trim(), clicks: Number(clicks) || 0, conversions: Number(conversions) || 0, payoutCents: Math.round((Number(payout) || 0) * 100), paid: false };
    const doc = await store.create('programs', p);
    setPrograms((prev) => [...(prev ?? []), doc].sort((a, b) => b.data.payoutCents - a.data.payoutCents));
    setName('');
    setClicks('');
    setConversions('');
    setPayout('');
  }

  async function togglePaid(doc: StoreDoc<Program>) {
    const updated = await store.update('programs', doc.docId, { ...doc.data, paid: !doc.data.paid });
    setPrograms((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('programs', docId);
    setPrograms((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportReport() {
    const rows = (programs ?? []).map((p) => `"${p.data.name}",${p.data.clicks},${p.data.conversions},${p.data.clicks ? ((p.data.conversions / p.data.clicks) * 100).toFixed(2) : 0},${(p.data.payoutCents / 100).toFixed(2)},${p.data.paid ? 'paid' : 'outstanding'}`);
    const csv = ['program,clicks,conversions,conversion rate %,payout,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'affiliate-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (programs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="affiliate-dashboard-root">
      <Section title="Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={fmt(totalPayout)} label="Total payouts" />
          <StatDisplay value={fmt(outstanding)} label="Outstanding (unpaid)" />
          <StatDisplay value={`${overallRate}%`} label={`Overall conversion (${totalConv.toLocaleString()}/${totalClicks.toLocaleString()})`} />
        </div>
      </Section>

      <Divider />

      <Section title="Programs">
        {programs.length === 0 ? (
          <EmptyState icon="💹">No programs tracked yet — log the first below.</EmptyState>
        ) : (
          <div data-testid="programs-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {programs.map((p) => {
              const rate = p.data.clicks ? ((p.data.conversions / p.data.clicks) * 100).toFixed(1) : '0';
              return (
                <div key={p.docId} className="module-list-row" data-testid="program-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      {p.data.clicks.toLocaleString()} clicks → {p.data.conversions.toLocaleString()} conversions ({rate}%)
                    </div>
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(p.data.payoutCents)}</span>
                  <Tag active={p.data.paid} onClick={() => togglePaid(p)}>
                    {p.data.paid ? '✓ Paid' : 'Outstanding'}
                  </Tag>
                  <IconButton label="Remove" onClick={() => remove(p.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          Export Report as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Log a Program">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Program</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HostingCo" data-testid="program-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Clicks</Label>
            <Input type="number" value={clicks} onChange={(e) => setClicks(e.target.value)} data-testid="program-clicks-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Conversions</Label>
            <Input type="number" value={conversions} onChange={(e) => setConversions(e.target.value)} data-testid="program-conversions-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Payout ($)</Label>
            <Input type="number" value={payout} onChange={(e) => setPayout(e.target.value)} data-testid="program-payout-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProgram} data-testid="add-program-button">
            + Log
          </Button>
        </div>
      </Section>
    </div>
  );
}
