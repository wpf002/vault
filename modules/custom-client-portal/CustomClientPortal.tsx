import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, ListRow, EmptyState, LoadingState } from '@vault/module-ui';

// Custom Client Portal — Branded hub for files, updates, and messages
// between service businesses and clients.
// Scope note: this is the service-business side of the portal — a per-client
// feed of updates, shared files (as named links, since the generic store
// holds JSON, not blobs), and messages, filterable by client. The
// public-facing client login is platform-level auth work, not something a
// module can add on the generic store.

type EntryKind = 'update' | 'file' | 'message';
type Entry = { kind: EntryKind; title: string; body: string; client: string; at: string };

const KIND_ICON: Record<EntryKind, string> = { update: '📌', file: '📎', message: '💬' };

export function CustomClientPortal({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [entries, setEntries] = useState<StoreDoc<Entry>[] | null>(null);
  const [kind, setKind] = useState<EntryKind>('update');
  const [client, setClient] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [activeClient, setActiveClient] = useState<string | null>(null);

  useEffect(() => {
    store.list<Entry>('updates').then((docs) => setEntries(docs.sort((a, b) => b.data.at.localeCompare(a.data.at))));
  }, [store]);

  const clients = useMemo(() => Array.from(new Set((entries ?? []).map((e) => e.data.client))).sort(), [entries]);
  const visible = activeClient ? (entries ?? []).filter((e) => e.data.client === activeClient) : entries ?? [];

  async function addEntry() {
    if (!title.trim() || !client.trim()) return;
    const entry: Entry = { kind, title: title.trim(), body: body.trim(), client: client.trim(), at: new Date().toISOString() };
    const doc = await store.create('updates', entry);
    setEntries((prev) => [doc, ...(prev ?? [])]);
    setTitle('');
    setBody('');
  }

  async function removeEntry(docId: string) {
    await store.remove('updates', docId);
    setEntries((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportFeed() {
    const md = (entries ?? [])
      .map((e) => `## ${KIND_ICON[e.data.kind]} ${e.data.title} — ${e.data.client}\n${e.data.at.slice(0, 10)}\n\n${e.data.body}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client-portal-feed.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (entries === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="custom-client-portal-root">
      <Section title="Post to Portal">
        <div style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={[
              { value: 'update', label: '📌 Update' },
              { value: 'file', label: '📎 File' },
              { value: 'message', label: '💬 Message' },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Co" data-testid="client-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'file' ? 'File name or link' : 'Title'} data-testid="title-input" style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Details</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What does the client need to know?" data-testid="body-input" />
        </div>
        <Button variant="primary" onClick={addEntry} data-testid="post-button">
          Post to Portal
        </Button>
      </Section>

      <Divider />

      <Section title="Portal Feed">
        {clients.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeClient === null} onClick={() => setActiveClient(null)}>
              All Clients
            </Tag>
            {clients.map((c) => (
              <Tag key={c} active={activeClient === c} onClick={() => setActiveClient(c)}>
                {c}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🚪">Nothing posted yet — share an update above.</EmptyState>
        ) : (
          <div data-testid="feed-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {visible.map((e) => (
              <div key={e.docId} data-testid="feed-item">
                <ListRow onRemove={() => removeEntry(e.docId)}>
                  <div style={{ fontWeight: 700, marginBottom: 2, color: 'var(--color-text)' }}>
                    {KIND_ICON[e.data.kind]} {e.data.title}
                  </div>
                  {e.data.body && <div style={{ marginBottom: 6 }}>{e.data.body}</div>}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Tag>{e.data.client}</Tag>
                    <span style={{ fontSize: 12 }}>{e.data.at.slice(0, 10)}</span>
                  </div>
                </ListRow>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportFeed}>
          ⬇️ Export Feed as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
