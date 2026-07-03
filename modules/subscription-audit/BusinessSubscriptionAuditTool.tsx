import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Business Subscription Audit Tool — recurring charges grouped by vendor
// category with keep/cancel/pending verdicts and a projected-savings
// readout (what canceling everything marked cancel saves per year).
// Money is integer cents. Scope note: bank-feed import is a third-party
// aggregator integration; you log the charges, the audit math is here.

type Sub = { vendor: string; plan: string; monthlyCents: number; category: string; verdict: 'keep' | 'cancel' | 'pending' };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function BusinessSubscriptionAuditTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [subs, setSubs] = useState<StoreDoc<Sub>[] | null>(null);
  const [vendor, setVendor] = useState('');
  const [plan, setPlan] = useState('');
  const [monthly, setMonthly] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    store.list<Sub>('subs').then(setSubs);
  }, [store]);

  const list = subs ?? [];
  const monthlyTotal = list.reduce((s, x) => s + x.data.monthlyCents, 0);
  const cancelSavings = list.filter((x) => x.data.verdict === 'cancel').reduce((s, x) => s + x.data.monthlyCents, 0);
  const pendingCount = list.filter((x) => x.data.verdict === 'pending').length;

  const byCategory = useMemo(() => {
    const map = new Map<string, StoreDoc<Sub>[]>();
    for (const s of list) map.set(s.data.category, [...(map.get(s.data.category) ?? []), s]);
    return Array.from(map.entries()).sort((a, b) => b[1].reduce((x, y) => x + y.data.monthlyCents, 0) - a[1].reduce((x, y) => x + y.data.monthlyCents, 0));
  }, [list]);

  async function addSub() {
    if (!vendor.trim()) return;
    const s: Sub = { vendor: vendor.trim(), plan: plan.trim() || '—', monthlyCents: Math.round((Number(monthly) || 0) * 100), category: category.trim() || 'Other', verdict: 'pending' };
    const doc = await store.create('subs', s);
    setSubs((prev) => [...(prev ?? []), doc]);
    setVendor('');
    setPlan('');
    setMonthly('');
  }

  async function setVerdict(doc: StoreDoc<Sub>, verdict: Sub['verdict']) {
    const updated = await store.update('subs', doc.docId, { ...doc.data, verdict });
    setSubs((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function remove(docId: string) {
    await store.remove('subs', docId);
    setSubs((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportAudit() {
    const rows = list.map((s) => `"${s.data.vendor}","${s.data.plan}",${(s.data.monthlyCents / 100).toFixed(2)},${s.data.category},${s.data.verdict}`);
    const csv = ['vendor,plan,monthly,category,verdict', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscription-audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (subs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="subscription-audit-root">
      <Section title="Audit Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={`${fmt(monthlyTotal)}/mo`} label={`${list.length} recurring charges`} />
          <StatDisplay value={<span data-testid="savings-value">{fmt(cancelSavings * 12)}/yr</span>} label="Savings if cancels go through" />
          <StatDisplay value={pendingCount} label="Awaiting a verdict" />
        </div>
      </Section>

      <Divider />

      <Section title="By Category">
        {byCategory.length === 0 ? (
          <EmptyState icon="🔍">No subscriptions logged — add the first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            {byCategory.map(([cat, catSubs]) => (
              <div key={cat} data-testid={`category-${cat}`}>
                <Label>
                  {cat} ({fmt(catSubs.reduce((s, x) => s + x.data.monthlyCents, 0))}/mo)
                </Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {catSubs.map((s) => (
                    <div key={s.docId} className="module-list-row" data-testid="sub-item" style={{ alignItems: 'center', opacity: s.data.verdict === 'cancel' ? 0.6 : 1 }}>
                      <div className="module-list-row-content" style={{ flex: 1 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: s.data.verdict === 'cancel' ? 'line-through' : 'none' }}>{s.data.vendor}</span>
                        <span style={{ fontSize: 12, marginLeft: 8 }}>{s.data.plan}</span>
                      </div>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(s.data.monthlyCents)}/mo</span>
                      {s.data.verdict === 'pending' ? (
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                          <Button variant="secondary" onClick={() => setVerdict(s, 'keep')} data-testid={`keep-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                            Keep
                          </Button>
                          <Button variant="secondary" onClick={() => setVerdict(s, 'cancel')} data-testid={`cancel-${s.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        <Tag active={s.data.verdict === 'keep'} onClick={() => setVerdict(s, 'pending')}>
                          {s.data.verdict === 'keep' ? '✓ Keep' : '✂️ Cancel'}
                        </Tag>
                      )}
                      <IconButton label="Remove" onClick={() => remove(s.docId)}>
                        ✕
                      </IconButton>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Vendor</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Figma" data-testid="sub-vendor-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Plan</Label>
            <Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Pro ×4 seats" data-testid="sub-plan-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Monthly ($)</Label>
            <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} data-testid="sub-monthly-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Design" data-testid="sub-category-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addSub} data-testid="add-sub-button">
            + Log
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportAudit}>
          ⬇️ Export Audit as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
