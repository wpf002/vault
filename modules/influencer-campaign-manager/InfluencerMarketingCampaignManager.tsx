import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Influencer Marketing Campaign Manager — collab pipeline
// (prospect→negotiating→agreed→posted) grouped by campaign, with fee
// tracking and post-campaign reach logging. Money is integer cents.
// Scope note: pulling reach straight from platform APIs is third-party
// integration work; you log the numbers reported.

const STAGES = ['prospect', 'negotiating', 'agreed', 'posted'] as const;
type Stage = (typeof STAGES)[number];

type Collab = { influencer: string; platform: string; followers: number; feeCents: number; campaign: string; stage: Stage; reach: number };

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function InfluencerMarketingCampaignManager({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [collabs, setCollabs] = useState<StoreDoc<Collab>[] | null>(null);
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState('');
  const [platform, setPlatform] = useState('');
  const [followers, setFollowers] = useState('');
  const [fee, setFee] = useState('');
  const [campaign, setCampaign] = useState('');
  const [reachDrafts, setReachDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Collab>('collabs').then((docs) => {
      setCollabs(docs);
      const first = docs[0]?.data.campaign;
      if (first) setActiveCampaign(first);
    });
  }, [store]);

  const campaigns = useMemo(() => Array.from(new Set((collabs ?? []).map((c) => c.data.campaign))).sort(), [collabs]);
  const visible = (collabs ?? []).filter((c) => !activeCampaign || c.data.campaign === activeCampaign);
  const spendCents = visible.filter((c) => c.data.stage === 'agreed' || c.data.stage === 'posted').reduce((s, c) => s + c.data.feeCents, 0);
  const totalReach = visible.reduce((s, c) => s + c.data.reach, 0);

  async function addCollab() {
    if (!influencer.trim() || !campaign.trim()) return;
    const c: Collab = { influencer: influencer.trim(), platform: platform.trim() || '—', followers: Number(followers) || 0, feeCents: Math.round((Number(fee) || 0) * 100), campaign: campaign.trim(), stage: 'prospect', reach: 0 };
    const doc = await store.create('collabs', c);
    setCollabs((prev) => [...(prev ?? []), doc]);
    setActiveCampaign(c.campaign);
    setInfluencer('');
    setFollowers('');
    setFee('');
  }

  async function advance(doc: StoreDoc<Collab>) {
    const idx = STAGES.indexOf(doc.data.stage);
    const next = STAGES[idx + 1];
    if (!next) return;
    const patch: Collab = { ...doc.data, stage: next };
    if (next === 'posted') {
      const logged = Number(reachDrafts[doc.docId] ?? '') || 0;
      patch.reach = logged;
    }
    const updated = await store.update('collabs', doc.docId, patch);
    setCollabs((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function remove(docId: string) {
    await store.remove('collabs', docId);
    setCollabs((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportCampaign() {
    const rows = (collabs ?? []).map((c) => `"${c.data.campaign}","${c.data.influencer}",${c.data.platform},${c.data.followers},${(c.data.feeCents / 100).toFixed(2)},${c.data.stage},${c.data.reach}`);
    const csv = ['campaign,influencer,platform,followers,fee,stage,reach', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (collabs === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="influencer-campaign-manager-root">
      <Section title="Campaign">
        {campaigns.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {campaigns.map((c) => (
              <Tag key={c} active={activeCampaign === c} onClick={() => setActiveCampaign(c)}>
                {c}
              </Tag>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={fmt(spendCents)} label="Committed spend (agreed + posted)" />
          <StatDisplay value={totalReach.toLocaleString()} label="Logged reach so far" />
        </div>
      </Section>

      <Divider />

      <Section title="Collaborations">
        {visible.length === 0 ? (
          <EmptyState icon="📢">No collabs in this campaign — add one below.</EmptyState>
        ) : (
          <div data-testid="collabs-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="collab-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.influencer}</span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Tag>{c.data.platform}</Tag>
                    <span>{c.data.followers.toLocaleString()} followers</span>
                    <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{fmt(c.data.feeCents)}</span>
                    {c.data.stage === 'posted' && <span>📈 {c.data.reach.toLocaleString()} reach</span>}
                  </div>
                </div>
                <Tag active={c.data.stage === 'posted'}>{c.data.stage}</Tag>
                {c.data.stage !== 'posted' && (
                  <>
                    {c.data.stage === 'agreed' && (
                      <Input
                        type="number"
                        value={reachDrafts[c.docId] ?? ''}
                        onChange={(e) => setReachDrafts((prev) => ({ ...prev, [c.docId]: e.target.value }))}
                        placeholder="Reach"
                        data-testid={`reach-${c.docId}`}
                        style={{ width: 90, padding: '5px 8px', fontSize: 12 }}
                      />
                    )}
                    <Button variant="secondary" onClick={() => advance(c)} data-testid={`advance-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      {c.data.stage === 'prospect' ? 'Start Talks' : c.data.stage === 'negotiating' ? 'Mark Agreed' : 'Mark Posted'}
                    </Button>
                  </>
                )}
                <IconButton label="Remove" onClick={() => remove(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCampaign}>
          ⬇️ Export Campaign Report as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Collaboration">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Influencer</Label>
            <Input value={influencer} onChange={(e) => setInfluencer(e.target.value)} placeholder="@handle" data-testid="collab-influencer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Platform</Label>
            <Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Instagram" data-testid="collab-platform-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Followers</Label>
            <Input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} data-testid="collab-followers-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Fee ($)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="collab-fee-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Campaign</Label>
            <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Summer Launch" data-testid="collab-campaign-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addCollab} data-testid="add-collab-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
