import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Proposal Generator — Template library with variable fields.
// Scope note: "PDF export" trimmed to text export — a real PDF needs a
// rendering dependency; the substance (templates + {{variable}} fill-in +
// live preview) is all here and the export gate works the same either way.

type Template = { name: string; body: string };

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

function extractVars(body: string): string[] {
  return Array.from(new Set(Array.from(body.matchAll(VAR_PATTERN), (m) => m[1]!)));
}

function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(VAR_PATTERN, (_, name: string) => values[name] || `{{${name}}}`);
}

export function ProposalGenerator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [templates, setTemplates] = useState<StoreDoc<Template>[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    store.list<Template>('templates').then((docs) => {
      setTemplates(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
  }, [store]);

  const selected = selectedId ? (templates ?? []).find((t) => t.docId === selectedId) ?? null : null;
  const vars = useMemo(() => (selected ? extractVars(selected.data.body) : []), [selected]);
  const preview = selected ? fillTemplate(selected.data.body, values) : '';

  async function saveTemplate() {
    if (!name.trim() || !body.trim()) return;
    const doc = await store.create('templates', { name: name.trim(), body });
    setTemplates((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setEditing(false);
    setName('');
    setBody('');
  }

  async function removeTemplate(docId: string) {
    await store.remove('templates', docId);
    setTemplates((prev) => (prev ?? []).filter((t) => t.docId !== docId));
    if (selectedId === docId) setSelectedId(null);
  }

  function exportProposal() {
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected?.data.name ?? 'proposal'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (templates === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="proposal-generator-root">
      <Section title="Templates">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {templates.map((t) => (
            <span key={t.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Tag active={selectedId === t.docId} onClick={() => { setSelectedId(t.docId); setValues({}); }}>
                {t.data.name}
              </Tag>
              <IconButton label="Remove template" onClick={() => removeTemplate(t.docId)}>
                ✕
              </IconButton>
            </span>
          ))}
          <Button variant="ghost" onClick={() => setEditing(true)} data-testid="new-template-button">
            + New Template
          </Button>
        </div>

        {editing && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 10 }}>
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Web Project Proposal" data-testid="template-name-input" style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label>{'Body — use {{variables}} for fill-in fields'}</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 120 }} placeholder={'Dear {{client}}, …'} data-testid="template-body-input" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={saveTemplate} data-testid="save-template-button">
                💾 Save Template
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {templates.length === 0 && !editing && <EmptyState icon="📄">No templates yet — create one to get started.</EmptyState>}
      </Section>

      {selected && (
        <>
          <Divider />
          <Section title="Fill In">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              {vars.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>{'This template has no {{variables}}.'}</span>
              ) : (
                vars.map((v) => (
                  <div key={v} style={{ minWidth: 150, flex: 1 }}>
                    <Label>{v}</Label>
                    <Input
                      value={values[v] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [v]: e.target.value }))}
                      data-testid={`var-${v}-input`}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))
              )}
            </div>
          </Section>

          <Divider />

          <Section title="Preview">
            <div
              data-testid="proposal-preview"
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 14,
                fontSize: 13,
                color: 'var(--color-text-dim)',
                marginBottom: 16,
              }}
            >
              {preview}
            </div>
            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportProposal}>
              ⬇️ Export Proposal
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
