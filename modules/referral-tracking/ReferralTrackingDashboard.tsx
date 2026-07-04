import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Referral Tracking Dashboard — Logs referrals, revenue, and a top-referrer
// leaderboard. Money is integer cents (platform invariant).

type Referral = { referrer: string; client: string; revenueCents: number; converted: boolean };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ReferralTrackingDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [referrals, setReferrals] = useState<StoreDoc<Referral>[] | null>(null);
  const [referrer, setReferrer] = useState('');
  const [client, setClient] = useState('');

  useEffect(() => {
    store.list<Referral>('referrals').then(setReferrals);
  }, [store]);

  const leaderboard = useMemo(() => {
    const byReferrer = new Map<string, { count: number; converted: number; revenueCents: number }>();
    for (const r of referrals ?? []) {
      const entry = byReferrer.get(r.data.referrer) ?? { count: 0, converted: 0, revenueCents: 0 };
      entry.count += 1;
      if (r.data.converted) entry.converted += 1;
      entry.revenueCents += r.data.revenueCents;
      byReferrer.set(r.data.referrer, entry);
    }
    return Array.from(byReferrer.entries()).sort((a, b) => b[1].revenueCents - a[1].revenueCents);
  }, [referrals]);

  const totalRevenue = (referrals ?? []).reduce((s, r) => s + r.data.revenueCents, 0);

  async function addReferral() {
    if (!referrer.trim() || !client.trim()) return;
    const doc = await store.create('referrals', { referrer: referrer.trim(), client: client.trim(), revenueCents: 0, converted: false });
    setReferrals((prev) => [...(prev ?? []), doc]);
    setClient('');
  }

  async function convert(doc: StoreDoc<Referral>, revenue: string) {
    const revenueCents = Math.round((Number(revenue) || 0) * 100);
    const updated = await store.update('referrals', doc.docId, { ...doc.data, converted: true, revenueCents });
    setReferrals((prev) => (prev ?? []).map((r) => (r.docId === doc.docId ? updated : r)));
  }

  async function remove(docId: string) {
    await store.remove('referrals', docId);
    setReferrals((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  function exportReport() {
    const rows = (referrals ?? []).map((r) => `${r.data.referrer},"${r.data.client}",${r.data.converted ? 'converted' : 'open'},${(r.data.revenueCents / 100).toFixed(2)}`);
    const csv = ['referrer,client,status,revenue', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'referrals.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (referrals === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="referral-tracking-root">
      <Section title="Referral Revenue">
        <div style={{ marginBottom: 14 }}>
          <StatDisplay value={fmt(totalRevenue)} label={`${referrals.filter((r) => r.data.converted).length} conversions from ${referrals.length} referrals`} />
        </div>
      </Section>

      <Divider />

      <Section title="Leaderboard">
        {leaderboard.length === 0 ? (
          <EmptyState icon="🔗">No referrals logged yet.</EmptyState>
        ) : (
          <div data-testid="leaderboard" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
            {leaderboard.map(([name, stats], i) => (
              <div key={name} className="module-list-row" style={{ alignItems: 'center' }} data-testid="leaderboard-row">
                <span style={{ fontSize: 16, minWidth: 28 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{name}</span>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {stats.converted}/{stats.count} converted
                  </div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{fmt(stats.revenueCents)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Log a Referral">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Referrer</Label>
            <Input value={referrer} onChange={(e) => setReferrer(e.target.value)} placeholder="Who referred them?" data-testid="referrer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Prospect</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Who did they refer?" data-testid="client-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addReferral} data-testid="add-referral-button">
            + Log
          </Button>
        </div>

        {referrals.length > 0 && (
          <div data-testid="referrals-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {referrals.map((r) => (
              <ReferralRow key={r.docId} doc={r} onConvert={convert} onRemove={remove} />
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportReport}>
          Export Referrals as CSV
        </GatedAction>
      </Section>
    </div>
  );
}

function ReferralRow({ doc, onConvert, onRemove }: { doc: StoreDoc<Referral>; onConvert: (d: StoreDoc<Referral>, revenue: string) => void; onRemove: (id: string) => void }) {
  const [revenue, setRevenue] = useState('');
  const [converting, setConverting] = useState(false);

  return (
    <div className="module-list-row" data-testid="referral-item" style={{ alignItems: 'center' }}>
      <div className="module-list-row-content" style={{ flex: 1 }}>
        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{doc.data.client}</span>
        <div style={{ fontSize: 12, marginTop: 2 }}>referred by {doc.data.referrer}</div>
      </div>
      {doc.data.converted ? (
        <Tag active>✓ {fmt(doc.data.revenueCents)}</Tag>
      ) : converting ? (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <Input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="Revenue $" data-testid={`revenue-${doc.docId}`} style={{ width: 110, padding: '5px 8px', fontSize: 12 }} />
          <Button variant="primary" onClick={() => onConvert(doc, revenue)} data-testid={`confirm-convert-${doc.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
            ✓
          </Button>
        </span>
      ) : (
        <Button variant="secondary" onClick={() => setConverting(true)} data-testid={`convert-${doc.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
          Mark Converted
        </Button>
      )}
      <IconButton label="Remove" onClick={() => onRemove(doc.docId)}>
        ✕
      </IconButton>
    </div>
  );
}
