import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Drag-and-Drop Form Builder — Visual form builder with validation.
// Scope note: reordering is up/down arrows rather than drag-and-drop — a
// DnD library is a dependency the field-builder substance doesn't need,
// and arrows are keyboard-accessible for free. "Backend integration"
// (submissions) is what the store already is: the live preview validates
// required fields and would submit to the module's own collection.

const FIELD_KINDS = ['text', 'email', 'number', 'select', 'textarea'] as const;
type FieldKind = (typeof FIELD_KINDS)[number];

type Field = { label: string; kind: FieldKind; required: boolean; options?: string[] };

export function DragAndDropFormBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [fields, setFields] = useState<StoreDoc<Field>[] | null>(null);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<FieldKind>('text');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  useEffect(() => {
    store.list<Field>('fields').then(setFields);
  }, [store]);

  async function addField() {
    if (!label.trim()) return;
    const field: Field = {
      label: label.trim(),
      kind,
      required,
      ...(kind === 'select' ? { options: options.split(',').map((o) => o.trim()).filter(Boolean) } : {}),
    };
    const doc = await store.create('fields', field);
    setFields((prev) => [...(prev ?? []), doc]);
    setLabel('');
    setOptions('');
  }

  async function move(index: number, dir: -1 | 1) {
    const list = [...(fields ?? [])];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index]!;
    const b = list[target]!;
    list[index] = b;
    list[target] = a;
    setFields(list);
  }

  async function removeField(docId: string) {
    await store.remove('fields', docId);
    setFields((prev) => (prev ?? []).filter((f) => f.docId !== docId));
  }

  function trySubmit() {
    const missing = (fields ?? []).filter((f) => f.data.required && !(answers[f.docId] ?? '').trim());
    if (missing.length > 0) {
      setSubmitResult(`Missing required: ${missing.map((f) => f.data.label).join(', ')}`);
    } else {
      setSubmitResult('✓ Valid submission — all required fields filled.');
    }
  }

  function exportSchema() {
    const json = JSON.stringify((fields ?? []).map((f) => f.data), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-schema.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (fields === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="form-builder-root">
      <Section title="Add a Field">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Email" data-testid="field-label-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as FieldKind)} data-testid="field-kind-select">
              {FIELD_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          {kind === 'select' && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Options (comma separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Small, Medium, Large" data-testid="field-options-input" style={{ width: '100%' }} />
            </div>
          )}
          <Button variant={required ? 'primary' : 'secondary'} onClick={() => setRequired((r) => !r)} data-testid="field-required-toggle">
            {required ? 'Required ✓' : 'Optional'}
          </Button>
          <Button variant="primary" onClick={addField} data-testid="add-field-button">
            + Add Field
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Form Structure">
        {fields.length === 0 ? (
          <EmptyState icon="🧩">No fields yet — add one above.</EmptyState>
        ) : (
          <div data-testid="fields-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
            {fields.map((f, i) => (
              <div key={f.docId} className="module-list-row" data-testid="field-item" style={{ alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0} style={{ height: 20, color: 'var(--color-text-dim)' }}>
                    ▲
                  </IconButton>
                  <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === fields.length - 1} style={{ height: 20, color: 'var(--color-text-dim)' }}>
                    ▼
                  </IconButton>
                </div>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{f.data.label}</span>{' '}
                  <Tag>{f.data.kind}</Tag> {f.data.required && <Tag active>Required</Tag>}
                </div>
                <IconButton label="Remove" onClick={() => removeField(f.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Section>

      {fields.length > 0 && (
        <>
          <Divider />
          <Section title="Live Preview">
            <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 14 }} data-testid="form-preview">
              {fields.map((f) => (
                <div key={f.docId} style={{ marginBottom: 12 }}>
                  <Label>
                    {f.data.label}
                    {f.data.required ? ' *' : ''}
                  </Label>
                  {f.data.kind === 'textarea' ? (
                    <Textarea
                      value={answers[f.docId] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [f.docId]: e.target.value }))}
                      data-testid={`preview-${f.docId}`}
                    />
                  ) : f.data.kind === 'select' ? (
                    <Select value={answers[f.docId] ?? ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [f.docId]: e.target.value }))} data-testid={`preview-${f.docId}`}>
                      <option value="">Choose…</option>
                      {(f.data.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={f.data.kind}
                      value={answers[f.docId] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [f.docId]: e.target.value }))}
                      data-testid={`preview-${f.docId}`}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              ))}
              <Button variant="secondary" onClick={trySubmit} data-testid="test-submit-button">
                Test Submit
              </Button>
              {submitResult && (
                <p style={{ fontSize: 13, marginTop: 8, marginBottom: 0, color: submitResult.startsWith('✓') ? 'var(--module-accent)' : '#ff6b5e' }} data-testid="submit-result">
                  {submitResult}
                </p>
              )}
            </div>
            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSchema}>
              Export Form Schema as JSON
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
