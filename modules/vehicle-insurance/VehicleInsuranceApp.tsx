import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Vehicle Insurance App — track policies with renewal countdowns, compare
// quotes side by side (sorted by 6-month premium), and file/advance
// claims. Scope note: live quotes from real carriers are aggregator API
// integrations — you enter quotes, the comparison and policy/claim
// tracking are the substance. Money is integer cents.

type Policy = { vehicle: string; insurer: string; premiumCents: number; deductibleCents: number; renewalDate: string };
type Quote = { insurer: string; premiumCents: number; deductibleCents: number };
type Claim = { vehicle: string; description: string; amountCents: number; status: 'filed' | 'approved' | 'denied' };

const CLAIM_LABELS: Record<Claim['status'], string> = { filed: '📨 Filed', approved: '✅ Approved', denied: '⛔ Denied' };

function fmt(cents: number): string {
  const frac = cents % 100 === 0 ? 0 : 2;
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: frac, maximumFractionDigits: frac })}`;
}

function daysUntil(date: string): number {
  return Math.ceil((Date.parse(date) - Date.now()) / 86400000);
}

export function VehicleInsuranceApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [policies, setPolicies] = useState<StoreDoc<Policy>[] | null>(null);
  const [quotes, setQuotes] = useState<StoreDoc<Quote>[] | null>(null);
  const [claims, setClaims] = useState<StoreDoc<Claim>[] | null>(null);
  const [qInsurer, setQInsurer] = useState('');
  const [qPremium, setQPremium] = useState('');
  const [qDeductible, setQDeductible] = useState('');
  const [cVehicle, setCVehicle] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cAmount, setCAmount] = useState('');

  useEffect(() => {
    store.list<Policy>('policies').then(setPolicies);
    store.list<Quote>('quotes').then(setQuotes);
    store.list<Claim>('claims').then(setClaims);
  }, [store]);

  const policyList = policies ?? [];
  const totalPremiumCents = policyList.reduce((s, p) => s + p.data.premiumCents, 0);
  const nextRenewal = policyList.map((p) => daysUntil(p.data.renewalDate)).filter((d) => d >= 0).sort((a, b) => a - b)[0];
  const openClaims = (claims ?? []).filter((c) => c.data.status === 'filed').length;
  const sortedQuotes = [...(quotes ?? [])].sort((a, b) => a.data.premiumCents - b.data.premiumCents);
  const bestPremium = sortedQuotes[0]?.data.premiumCents;

  async function addQuote() {
    if (!qInsurer.trim()) return;
    const q: Quote = { insurer: qInsurer.trim(), premiumCents: Math.round((Number(qPremium) || 0) * 100), deductibleCents: Math.round((Number(qDeductible) || 0) * 100) };
    const doc = await store.create('quotes', q);
    setQuotes((prev) => [...(prev ?? []), doc]);
    setQInsurer('');
    setQPremium('');
    setQDeductible('');
  }

  async function removeQuote(docId: string) {
    await store.remove('quotes', docId);
    setQuotes((prev) => (prev ?? []).filter((q) => q.docId !== docId));
  }

  async function fileClaim() {
    if (!cVehicle.trim() || !cDescription.trim()) return;
    const c: Claim = { vehicle: cVehicle.trim(), description: cDescription.trim(), amountCents: Math.round((Number(cAmount) || 0) * 100), status: 'filed' };
    const doc = await store.create('claims', c);
    setClaims((prev) => [doc, ...(prev ?? [])]);
    setCVehicle('');
    setCDescription('');
    setCAmount('');
  }

  async function setClaimStatus(doc: StoreDoc<Claim>, status: Claim['status']) {
    const updated = await store.update('claims', doc.docId, { ...doc.data, status });
    setClaims((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function renewPolicy(doc: StoreDoc<Policy>) {
    // roll the renewal date forward one 6-month term
    const next = new Date(Date.parse(doc.data.renewalDate) + 182 * 86400000).toISOString().slice(0, 10);
    const updated = await store.update('policies', doc.docId, { ...doc.data, renewalDate: next });
    setPolicies((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function removePolicy(docId: string) {
    await store.remove('policies', docId);
    setPolicies((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportPolicies() {
    const rows = policyList.map((p) => `"${p.data.vehicle}","${p.data.insurer}",${(p.data.premiumCents / 100).toFixed(2)},${(p.data.deductibleCents / 100).toFixed(2)},${p.data.renewalDate}`);
    const csv = ['vehicle,insurer,6-month premium,deductible,renewal date', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle-policies.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (policies === null || quotes === null || claims === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="vehicle-insurance-root">
      <Section title="Coverage Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={fmt(totalPremiumCents)} label={`6-month premiums · ${policyList.length} policies`} />
          <StatDisplay value={nextRenewal !== undefined ? `${nextRenewal} days` : '—'} label="Until next renewal" />
          <StatDisplay value={<span data-testid="open-claims">{openClaims}</span>} label="Open claims" />
        </div>
      </Section>

      <Divider />

      <Section title="Your Policies">
        {policyList.length === 0 ? (
          <EmptyState icon="🚗">No policies tracked yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
            {policyList.map((p) => {
              const d = daysUntil(p.data.renewalDate);
              return (
                <div key={p.docId} className="module-list-row" data-testid="policy-item" style={{ alignItems: 'center' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.vehicle}</span>
                    <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{p.data.insurer}</span>
                      <span>· deductible {fmt(p.data.deductibleCents)}</span>
                      <span style={{ color: d <= 30 ? '#ff9f0a' : 'var(--color-text-dim)' }} data-testid={`renewal-${p.docId}`}>
                        · renews in {d} days
                      </span>
                    </div>
                  </div>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(p.data.premiumCents)}/6mo</span>
                  <Button variant="secondary" onClick={() => renewPolicy(p)} data-testid={`renew-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    🔄 Renew
                  </Button>
                  <IconButton label="Remove" onClick={() => removePolicy(p.docId)}>
                    ✕
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Compare Quotes">
        {sortedQuotes.length === 0 ? (
          <EmptyState icon="⚖️">No quotes to compare — add one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="quotes-list">
            {sortedQuotes.map((q, i) => (
              <div key={q.docId} className="module-list-row" data-testid="quote-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{q.data.insurer}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>deductible {fmt(q.data.deductibleCents)}</span>
                </div>
                {i === 0 && <Tag active>🏆 Lowest Premium</Tag>}
                {i > 0 && bestPremium !== undefined && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>+{fmt(q.data.premiumCents - bestPremium)}</span>
                )}
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(q.data.premiumCents)}/6mo</span>
                <IconButton label="Remove" onClick={() => removeQuote(q.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Insurer</Label>
            <Input value={qInsurer} onChange={(e) => setQInsurer(e.target.value)} placeholder="e.g. Beacon Direct" data-testid="quote-insurer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>6-Mo Premium ($)</Label>
            <Input type="number" value={qPremium} onChange={(e) => setQPremium(e.target.value)} data-testid="quote-premium-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Deductible ($)</Label>
            <Input type="number" value={qDeductible} onChange={(e) => setQDeductible(e.target.value)} data-testid="quote-deductible-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addQuote} data-testid="add-quote-button">
            + Add Quote
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Claims">
        {claims.length === 0 ? (
          <EmptyState icon="📨">No claims filed.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="claims-list">
            {claims.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="claim-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.description}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{c.data.vehicle}</span>
                </div>
                <Tag active={c.data.status === 'approved'}>{CLAIM_LABELS[c.data.status]}</Tag>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(c.data.amountCents)}</span>
                {c.data.status === 'filed' && (
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <Button variant="secondary" onClick={() => setClaimStatus(c, 'approved')} data-testid={`approve-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      ✅
                    </Button>
                    <Button variant="ghost" onClick={() => setClaimStatus(c, 'denied')} data-testid={`deny-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      ⛔
                    </Button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>Vehicle</Label>
            <Input value={cVehicle} onChange={(e) => setCVehicle(e.target.value)} placeholder="2021 Honda CR-V" data-testid="claim-vehicle-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>What Happened</Label>
            <Input value={cDescription} onChange={(e) => setCDescription(e.target.value)} placeholder="e.g. Hail damage on hood" data-testid="claim-description-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Estimate ($)</Label>
            <Input type="number" value={cAmount} onChange={(e) => setCAmount(e.target.value)} data-testid="claim-amount-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={fileClaim} data-testid="file-claim-button">
            📨 File Claim
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPolicies}>
          ⬇️ Export Policies as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
