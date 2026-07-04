import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Small Business CRM with Marketing Automation — leads with a simple
// status funnel, campaign templates with {{name}} merge fields, and a
// "Run Automations" step that drafts a personalized email into the
// outbox for every lead whose status matches an active campaign's
// trigger (skipping anyone already drafted for that campaign). Scope
// note: actually delivering email is platform notification infra — the
// automation engine and merge rendering are the substance.

type Lead = { name: string; email: string; source: string; status: 'new' | 'contacted' | 'customer' | 'lost' };
type Campaign = { name: string; trigger: 'new' | 'contacted'; subject: string; body: string; active: boolean };
type Draft = { lead: string; email: string; campaign: string; subject: string; sent: boolean };

const STATUS_LABELS: Record<Lead['status'], string> = { new: '✨ New', contacted: '📞 Contacted', customer: '🤝 Customer', lost: 'Lost' };
const STATUS_FLOW: Lead['status'][] = ['new', 'contacted', 'customer'];

function merge(template: string, lead: Lead): string {
  return template.replaceAll('{{name}}', lead.name);
}

export function SmallBusinessCRMWithMarketingAutomation({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [leads, setLeads] = useState<StoreDoc<Lead>[] | null>(null);
  const [campaigns, setCampaigns] = useState<StoreDoc<Campaign>[] | null>(null);
  const [outbox, setOutbox] = useState<StoreDoc<Draft>[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [cName, setCName] = useState('');
  const [cTrigger, setCTrigger] = useState<Campaign['trigger']>('new');
  const [cSubject, setCSubject] = useState('');
  const [cBody, setCBody] = useState('');
  const [lastRun, setLastRun] = useState<number | null>(null);

  useEffect(() => {
    store.list<Lead>('leads').then(setLeads);
    store.list<Campaign>('campaigns').then(setCampaigns);
    store.list<Draft>('outbox').then(setOutbox);
  }, [store]);

  const leadList = leads ?? [];
  const customers = leadList.filter((l) => l.data.status === 'customer').length;
  const decided = leadList.filter((l) => l.data.status === 'customer' || l.data.status === 'lost').length;
  const conversionPct = decided > 0 ? (customers / decided) * 100 : 0;
  const queued = (outbox ?? []).filter((d) => !d.data.sent);

  async function addLead() {
    if (!name.trim() || !email.trim()) return;
    const l: Lead = { name: name.trim(), email: email.trim(), source: source.trim() || 'Manual', status: 'new' };
    const doc = await store.create('leads', l);
    setLeads((prev) => [...(prev ?? []), doc]);
    setName('');
    setEmail('');
    setSource('');
  }

  async function advanceLead(doc: StoreDoc<Lead>) {
    const idx = STATUS_FLOW.indexOf(doc.data.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next: Lead = { ...doc.data, status: STATUS_FLOW[idx + 1]! };
    const updated = await store.update('leads', doc.docId, next);
    setLeads((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
  }

  async function markLost(doc: StoreDoc<Lead>) {
    const next: Lead = { ...doc.data, status: 'lost' };
    const updated = await store.update('leads', doc.docId, next);
    setLeads((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
  }

  async function removeLead(docId: string) {
    await store.remove('leads', docId);
    setLeads((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  async function addCampaign() {
    if (!cName.trim() || !cSubject.trim() || !cBody.trim()) return;
    const c: Campaign = { name: cName.trim(), trigger: cTrigger, subject: cSubject.trim(), body: cBody.trim(), active: true };
    const doc = await store.create('campaigns', c);
    setCampaigns((prev) => [...(prev ?? []), doc]);
    setCName('');
    setCSubject('');
    setCBody('');
  }

  async function toggleCampaign(doc: StoreDoc<Campaign>) {
    const updated = await store.update('campaigns', doc.docId, { ...doc.data, active: !doc.data.active });
    setCampaigns((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function removeCampaign(docId: string) {
    await store.remove('campaigns', docId);
    setCampaigns((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  // The automation pass: draft one personalized email per (matching lead × active campaign),
  // skipping pairs already in the outbox — idempotent, run it as often as you like.
  async function runAutomations() {
    const existing = new Set((outbox ?? []).map((d) => `${d.data.lead}|${d.data.campaign}`));
    const drafts: Draft[] = [];
    for (const c of (campaigns ?? []).filter((x) => x.data.active)) {
      for (const l of leadList.filter((x) => x.data.status === c.data.trigger)) {
        const key = `${l.data.name}|${c.data.name}`;
        if (existing.has(key)) continue;
        drafts.push({ lead: l.data.name, email: l.data.email, campaign: c.data.name, subject: merge(c.data.subject, l.data), sent: false });
        existing.add(key);
      }
    }
    const created: StoreDoc<Draft>[] = [];
    for (const d of drafts) created.push(await store.create('outbox', d));
    setOutbox((prev) => [...(prev ?? []), ...created]);
    setLastRun(drafts.length);
  }

  async function markSent(doc: StoreDoc<Draft>) {
    const updated = await store.update('outbox', doc.docId, { ...doc.data, sent: true });
    setOutbox((prev) => (prev ?? []).map((d) => (d.docId === doc.docId ? updated : d)));
  }

  async function removeDraft(docId: string) {
    await store.remove('outbox', docId);
    setOutbox((prev) => (prev ?? []).filter((d) => d.docId !== docId));
  }

  function exportLeads() {
    const rows = leadList.map((l) => `"${l.data.name}",${l.data.email},"${l.data.source}",${l.data.status}`);
    const csv = ['name,email,source,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (leads === null || campaigns === null || outbox === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="small-business-crm-root">
      <Section title="Funnel Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={leadList.length} label="Leads in the funnel" />
          <StatDisplay value={`${conversionPct.toFixed(0)}%`} label="Conversion of decided leads" />
          <StatDisplay value={<span data-testid="queued-count">{queued.length}</span>} label="Drafts queued to send" />
        </div>
      </Section>

      <Divider />

      <Section title="Leads">
        {leadList.length === 0 ? (
          <EmptyState icon="📇">No leads yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="leads-list">
            {leadList.map((l) => (
              <div key={l.docId} className="module-list-row" data-testid="lead-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{l.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {l.data.email} · via {l.data.source}
                  </div>
                </div>
                <Tag active={l.data.status === 'customer'}>{STATUS_LABELS[l.data.status]}</Tag>
                {STATUS_FLOW.indexOf(l.data.status) >= 0 && STATUS_FLOW.indexOf(l.data.status) < STATUS_FLOW.length - 1 && (
                  <>
                    <Button variant="secondary" onClick={() => advanceLead(l)} data-testid={`advance-${l.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      → {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(l.data.status) + 1]!].split(' ')[1]}
                    </Button>
                    <Button variant="ghost" onClick={() => markLost(l)} data-testid={`lost-${l.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Lost
                    </Button>
                  </>
                )}
                <IconButton label="Remove" onClick={() => removeLead(l.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 140 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kim Boyle" data-testid="lead-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kim@company.com" data-testid="lead-email-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Referral" data-testid="lead-source-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addLead} data-testid="add-lead-button">
            + Add Lead
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Campaigns">
        {campaigns.length === 0 ? (
          <EmptyState icon="✉️">No campaigns — build your first automation below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="campaigns-list">
            {campaigns.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="campaign-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    Triggers on {STATUS_LABELS[c.data.trigger]} leads · "{c.data.subject}"
                  </div>
                </div>
                <Tag active={c.data.active} onClick={() => toggleCampaign(c)}>
                  {c.data.active ? '🟢 Active' : 'Paused'}
                </Tag>
                <IconButton label="Remove" onClick={() => removeCampaign(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 160 }}>
              <Label>Campaign</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Win-Back Offer" data-testid="campaign-name-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 160 }}>
              <Label>Trigger</Label>
              <Select value={cTrigger} onChange={(e) => setCTrigger(e.target.value as Campaign['trigger'])} data-testid="trigger-select" style={{ width: '100%' }}>
                <option value="new">Lead Is New</option>
                <option value="contacted">Lead Was Contacted</option>
              </Select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Label>Subject ({'{{name}}'} Merges)</Label>
              <Input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="e.g. A quick hello, {{name}}" data-testid="subject-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addCampaign} data-testid="add-campaign-button">
              + Create
            </Button>
          </div>
          <Textarea value={cBody} onChange={(e) => setCBody(e.target.value)} placeholder={'Hi {{name}},\n\nYour message here…'} data-testid="body-input" rows={3} style={{ width: '100%' }} />
        </div>
      </Section>

      <Divider />

      <Section title="Automation Outbox">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <Button variant="primary" onClick={runAutomations} data-testid="run-automations-button">
            Run Automations
          </Button>
          {lastRun !== null && (
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }} data-testid="run-result">
              {lastRun === 0 ? 'Nothing new to draft — everyone matching is already queued.' : `Drafted ${lastRun} personalized ${lastRun === 1 ? 'email' : 'emails'}.`}
            </span>
          )}
        </div>

        {outbox.length === 0 ? (
          <EmptyState icon="📤">Outbox is empty — run automations to draft campaign emails.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="outbox-list">
            {outbox.map((d) => (
              <div key={d.docId} className="module-list-row" data-testid="draft-item" style={{ alignItems: 'center', opacity: d.data.sent ? 0.6 : 1 }}>
                <span style={{ minWidth: 24 }}>{d.data.sent ? '✅' : '📨'}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{d.data.subject}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    To {d.data.lead} ({d.data.email}) · {d.data.campaign}
                  </div>
                </div>
                {!d.data.sent && (
                  <Button variant="secondary" onClick={() => markSent(d)} data-testid={`sent-${d.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    ✓ Mark Sent
                  </Button>
                )}
                <IconButton label="Remove" onClick={() => removeDraft(d.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLeads}>
          Export Leads as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
