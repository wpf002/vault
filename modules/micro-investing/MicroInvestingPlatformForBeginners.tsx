import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Micro-Investing Platform for Beginners — themed portfolios with small
// recurring auto-invest rules and a contribution ledger. Scope note:
// live market data, real brokerage execution, and round-up card linking
// are regulated third-party integrations — the portfolio structure,
// auto-invest rules, and contribution math live here. Money is integer cents.

type Portfolio = { name: string; emoji: string; risk: 'conservative' | 'growth' | 'aggressive'; investedCents: number; autoInvestCents: number; cadence: 'weekly' | 'monthly' | 'off' };
type Contribution = { portfolio: string; amountCents: number; note: string };

const RISK_LABELS: Record<Portfolio['risk'], string> = {
  conservative: '🛡️ Conservative',
  growth: '📈 Growth',
  aggressive: '🚀 Aggressive',
};

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

export function MicroInvestingPlatformForBeginners({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [portfolios, setPortfolios] = useState<StoreDoc<Portfolio>[] | null>(null);
  const [contributions, setContributions] = useState<StoreDoc<Contribution>[] | null>(null);
  const [name, setName] = useState('');
  const [risk, setRisk] = useState<Portfolio['risk']>('growth');
  const [invests, setInvests] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Portfolio>('portfolios').then(setPortfolios);
    store.list<Contribution>('contributions').then(setContributions);
  }, [store]);

  const list = portfolios ?? [];
  const totalInvested = list.reduce((s, p) => s + p.data.investedCents, 0);
  // weekly-equivalent auto-invest rate (monthly ÷ 4.33)
  const weeklyAutoCents = list.reduce((s, p) => {
    if (p.data.cadence === 'weekly') return s + p.data.autoInvestCents;
    if (p.data.cadence === 'monthly') return s + Math.round(p.data.autoInvestCents / 4.33);
    return s;
  }, 0);

  async function addPortfolio() {
    if (!name.trim()) return;
    const p: Portfolio = { name: name.trim(), emoji: '🌱', risk, investedCents: 0, autoInvestCents: 0, cadence: 'off' };
    const doc = await store.create('portfolios', p);
    setPortfolios((prev) => [...(prev ?? []), doc]);
    setName('');
  }

  async function invest(doc: StoreDoc<Portfolio>, note: string, amountCents?: number) {
    const cents = amountCents ?? Math.round((Number(invests[doc.docId]) || 0) * 100);
    if (cents <= 0) return;
    const updated = await store.update('portfolios', doc.docId, { ...doc.data, investedCents: doc.data.investedCents + cents });
    setPortfolios((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
    const c = await store.create('contributions', { portfolio: doc.data.name, amountCents: cents, note });
    setContributions((prev) => [c, ...(prev ?? [])]);
    setInvests((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  async function setAutoInvest(doc: StoreDoc<Portfolio>, cadence: Portfolio['cadence'], amountCents: number) {
    const updated = await store.update('portfolios', doc.docId, { ...doc.data, cadence, autoInvestCents: cadence === 'off' ? 0 : amountCents });
    setPortfolios((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function removePortfolio(docId: string) {
    await store.remove('portfolios', docId);
    setPortfolios((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportLedger() {
    const rows = (contributions ?? []).map((c) => `"${c.data.portfolio}",${(c.data.amountCents / 100).toFixed(2)},"${c.data.note}"`);
    const csv = ['portfolio,amount,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contribution-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (portfolios === null || contributions === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="micro-investing-root">
      <Section title="Portfolio Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={<span data-testid="total-invested">{fmt(totalInvested)}</span>} label={`Across ${list.length} portfolios`} />
          <StatDisplay value={`${fmt(weeklyAutoCents)}/wk`} label="Auto-invest rate" />
          <StatDisplay value={(contributions ?? []).length} label="Contributions logged" />
        </div>
      </Section>

      <Divider />

      <Section title="Themed Portfolios">
        {list.length === 0 ? (
          <EmptyState icon="🌱">No portfolios — plant your first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {list.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="portfolio-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{p.data.emoji}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, flex: 1 }}>{p.data.name}</span>
                  <Tag>{RISK_LABELS[p.data.risk]}</Tag>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }} data-testid={`invested-${p.docId}`}>
                    {fmt(p.data.investedCents)}
                  </span>
                  <IconButton label="Remove" onClick={() => removePortfolio(p.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Input
                    type="number"
                    value={invests[p.docId] ?? ''}
                    onChange={(e) => setInvests((prev) => ({ ...prev, [p.docId]: e.target.value }))}
                    placeholder="Amount ($)"
                    data-testid={`invest-input-${p.docId}`}
                    style={{ width: 110 }}
                  />
                  <Button variant="secondary" onClick={() => invest(p, 'One-time investment')} data-testid={`invest-button-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    💵 Invest
                  </Button>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    Auto:
                    <Select
                      value={p.data.cadence}
                      onChange={(e) => setAutoInvest(p, e.target.value as Portfolio['cadence'], p.data.autoInvestCents || 500)}
                      data-testid={`cadence-${p.docId}`}
                      style={{ fontSize: 12, padding: '4px 24px 4px 8px' }}
                    >
                      <option value="off">Off</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                    {p.data.cadence !== 'off' && (
                      <Input
                        type="number"
                        value={(p.data.autoInvestCents / 100).toString()}
                        onChange={(e) => setAutoInvest(p, p.data.cadence, Math.round((Number(e.target.value) || 0) * 100))}
                        data-testid={`auto-amount-${p.docId}`}
                        style={{ width: 70, fontSize: 12, padding: '4px 8px' }}
                      />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Theme</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Space & Robotics" data-testid="portfolio-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Risk Level</Label>
            <Select value={risk} onChange={(e) => setRisk(e.target.value as Portfolio['risk'])} data-testid="risk-select" style={{ width: '100%' }}>
              <option value="conservative">Conservative</option>
              <option value="growth">Growth</option>
              <option value="aggressive">Aggressive</option>
            </Select>
          </div>
          <Button variant="primary" onClick={addPortfolio} data-testid="add-portfolio-button">
            + Create Portfolio
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Recent Contributions">
        {contributions.length === 0 ? (
          <EmptyState icon="💵">No contributions yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="contributions-list">
            {contributions.slice(0, 8).map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="contribution-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.portfolio}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{c.data.note}</span>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>+{fmt(c.data.amountCents)}</span>
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
