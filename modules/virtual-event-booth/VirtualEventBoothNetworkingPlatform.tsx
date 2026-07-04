import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Virtual Event Booth & Networking Platform — the exhibitor's cockpit:
// design your booth (live preview card, the thing attendees see), stock
// it with resources, and capture visitors with hot/warm/cold interest
// so the follow-up queue writes itself. Scope note: live video and
// attendee-side networking are realtime infra — booth authoring and
// lead capture are the exhibitor's real workflow.

type Resource = { title: string; kind: string };
type Booth = { company: string; tagline: string; pitch: string; offer: string; resources: Resource[] };
type Visitor = { name: string; company: string; interest: 'hot' | 'warm' | 'cold'; note: string };

const INTEREST_META: Record<Visitor['interest'], { label: string; color: string }> = {
  hot: { label: '🔥 Hot', color: '#ff6b5e' },
  warm: { label: '🌤️ Warm', color: '#f5c451' },
  cold: { label: '❄️ Cold', color: '#93c5fd' },
};

export function VirtualEventBoothNetworkingPlatform({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [booth, setBooth] = useState<StoreDoc<Booth> | null | undefined>(undefined);
  const [visitors, setVisitors] = useState<StoreDoc<Visitor>[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Booth>({ company: '', tagline: '', pitch: '', offer: '', resources: [] });
  const [resTitle, setResTitle] = useState('');
  const [resKind, setResKind] = useState('PDF');
  const [vName, setVName] = useState('');
  const [vCompany, setVCompany] = useState('');
  const [vInterest, setVInterest] = useState<Visitor['interest']>('warm');
  const [vNote, setVNote] = useState('');

  useEffect(() => {
    store.list<Booth>('booth').then((docs) => setBooth(docs[0] ?? null));
    store.list<Visitor>('visitors').then(setVisitors);
  }, [store]);

  const visitorList = visitors ?? [];
  const hotCount = visitorList.filter((v) => v.data.interest === 'hot').length;

  async function saveBooth(next: Booth) {
    if (booth) {
      const updated = await store.update('booth', booth.docId, next);
      setBooth(updated);
    } else {
      const doc = await store.create('booth', next);
      setBooth(doc);
    }
  }

  function startEditing() {
    setDraft(booth?.data ?? { company: '', tagline: '', pitch: '', offer: '', resources: [] });
    setEditing(true);
  }

  async function commitEdit() {
    if (!draft.company.trim()) return;
    await saveBooth(draft);
    setEditing(false);
  }

  async function addResource() {
    if (!booth || !resTitle.trim()) return;
    await saveBooth({ ...booth.data, resources: [...booth.data.resources, { title: resTitle.trim(), kind: resKind }] });
    setResTitle('');
  }

  async function removeResource(index: number) {
    if (!booth) return;
    await saveBooth({ ...booth.data, resources: booth.data.resources.filter((_, i) => i !== index) });
  }

  async function logVisitor() {
    if (!vName.trim()) return;
    const v: Visitor = { name: vName.trim(), company: vCompany.trim() || '—', interest: vInterest, note: vNote.trim() };
    const doc = await store.create('visitors', v);
    setVisitors((prev) => [doc, ...(prev ?? [])]);
    setVName('');
    setVCompany('');
    setVNote('');
  }

  async function setInterest(doc: StoreDoc<Visitor>, interest: Visitor['interest']) {
    const updated = await store.update('visitors', doc.docId, { ...doc.data, interest });
    setVisitors((prev) => (prev ?? []).map((v) => (v.docId === doc.docId ? updated : v)));
  }

  async function removeVisitor(docId: string) {
    await store.remove('visitors', docId);
    setVisitors((prev) => (prev ?? []).filter((v) => v.docId !== docId));
  }

  function exportLeads() {
    const rows = visitorList.map((v) => `"${v.data.name}","${v.data.company}",${v.data.interest},"${v.data.note.replace(/"/g, '""')}"`);
    const csv = ['name,company,interest,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booth-leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (booth === undefined || visitors === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="virtual-event-booth-root">
      <Section title="Your Booth">
        {booth && !editing ? (
          <div
            data-testid="booth-preview"
            style={{ borderRadius: 12, padding: 20, background: 'linear-gradient(135deg, var(--color-surface-2, rgba(255,255,255,0.06)), rgba(255,255,255,0.02))', border: '1px solid var(--module-accent)', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{booth.data.company}</div>
              <div style={{ fontSize: 13, color: 'var(--module-accent)', fontWeight: 600 }}>{booth.data.tagline}</div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)', margin: 0 }}>{booth.data.pitch}</p>
            {booth.data.offer && (
              <div style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)' }} data-testid="booth-offer">
                {booth.data.offer}
              </div>
            )}
            {booth.data.resources.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} data-testid="booth-resources">
                {booth.data.resources.map((r, i) => (
                  <Tag key={i} onClick={() => removeResource(i)}>
                    📎 {r.title} ({r.kind}) ✕
                  </Tag>
                ))}
              </div>
            )}
            <Button variant="secondary" onClick={startEditing} data-testid="edit-booth-button" style={{ alignSelf: 'flex-start' }}>
              Edit Booth
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="booth-editor">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ width: 180 }}>
                <Label>Company</Label>
                <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} placeholder="e.g. Fernwood Analytics" data-testid="company-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Label>Tagline</Label>
                <Input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} placeholder="One line that stops the scroll" data-testid="tagline-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <Label>Pitch</Label>
              <Textarea value={draft.pitch} onChange={(e) => setDraft({ ...draft, pitch: e.target.value })} placeholder="What you do, for whom, in three sentences." data-testid="pitch-input" rows={3} style={{ width: '100%' }} />
            </div>
            <div>
              <Label>Show Offer (Optional)</Label>
              <Input value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })} placeholder="e.g. 🎁 Expo discount for visitors" data-testid="offer-input" style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={commitEdit} data-testid="save-booth-button">
                Save Booth
              </Button>
              {booth && (
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {booth && !editing && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Add Resource</Label>
              <Input value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="e.g. Case Study: Meridian" data-testid="resource-title-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 110 }}>
              <Label>Type</Label>
              <Select value={resKind} onChange={(e) => setResKind(e.target.value)} data-testid="resource-kind-select" style={{ width: '100%' }}>
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
                <option value="Link">Link</option>
                <option value="Deck">Deck</option>
              </Select>
            </div>
            <Button variant="secondary" onClick={addResource} data-testid="add-resource-button">
              Stock It
            </Button>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Visitor Log">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="visitor-count">{visitorList.length}</span>} label="Booth visitors" />
          <StatDisplay value={<span data-testid="hot-count">{hotCount}</span>} label="Hot leads to chase" />
          <StatDisplay value={booth?.data.resources.length ?? 0} label="Resources stocked" />
        </div>

        {visitorList.length === 0 ? (
          <EmptyState icon="🖥️">No visitors logged yet — capture the first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="visitors-list">
            {visitorList.map((v) => (
              <div key={v.docId} className="module-list-row" data-testid="visitor-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{v.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {v.data.company}
                    {v.data.note ? ` · ${v.data.note}` : ''}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  {(Object.keys(INTEREST_META) as Visitor['interest'][]).map((k) => (
                    <Tag key={k} active={v.data.interest === k} onClick={() => setInterest(v, k)}>
                      {INTEREST_META[k].label}
                    </Tag>
                  ))}
                </span>
                <IconButton label="Remove" onClick={() => removeVisitor(v.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 140 }}>
            <Label>Visitor</Label>
            <Input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. Grace Lin" data-testid="visitor-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Company</Label>
            <Input value={vCompany} onChange={(e) => setVCompany(e.target.value)} placeholder="Their company" data-testid="visitor-company-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Interest</Label>
            <Select value={vInterest} onChange={(e) => setVInterest(e.target.value as Visitor['interest'])} data-testid="interest-select" style={{ width: '100%' }}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Note</Label>
            <Input value={vNote} onChange={(e) => setVNote(e.target.value)} placeholder="What they asked about" data-testid="visitor-note-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={logVisitor} data-testid="log-visitor-button">
            + Capture Lead
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLeads}>
          Export Leads as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
