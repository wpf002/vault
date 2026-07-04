import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Service Agreement Generator — Branded contracts created and e-signed in
// one flow. Scope note: legally-binding e-signature is a regulated
// third-party service (audit trails, identity verification); this module
// generates the agreement from standard clauses and records a
// typed-signature acknowledgment (name + date) on the document — the
// draft→sent→signed flow the catalog describes, minus the DocuSign layer.

const CLAUSE_LIBRARY: Record<string, { label: string; text: (a: Agreement) => string }> = {
  scope: {
    label: 'Scope of Work',
    text: (a) => `Provider agrees to deliver the following services to ${a.client}: ${a.service}.`,
  },
  payment: {
    label: 'Payment Terms',
    text: (a) => `Client agrees to pay ${fmt(a.feeCents)} per month, due on the 1st of each month, for a term of ${a.termMonths} months.`,
  },
  termination: {
    label: 'Termination',
    text: () => 'Either party may terminate this agreement with 30 days written notice.',
  },
  confidentiality: {
    label: 'Confidentiality',
    text: () => 'Both parties agree to keep all non-public information confidential during and after the term of this agreement.',
  },
  ip: {
    label: 'Intellectual Property',
    text: () => 'All work product created under this agreement becomes the property of the Client upon full payment.',
  },
};

type Agreement = {
  client: string;
  service: string;
  feeCents: number;
  termMonths: number;
  status: 'draft' | 'sent' | 'signed';
  signedBy: string;
  signedAt: string;
  clauses: string[];
};

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderAgreement(a: Agreement): string {
  const clauses = a.clauses
    .filter((c) => CLAUSE_LIBRARY[c])
    .map((c, i) => `${i + 1}. ${CLAUSE_LIBRARY[c]!.label}\n${CLAUSE_LIBRARY[c]!.text(a)}`)
    .join('\n\n');
  const sig = a.status === 'signed' ? `\n\nSigned: ${a.signedBy} on ${a.signedAt}` : '\n\nSignature: ______________  Date: ________';
  return `SERVICE AGREEMENT\n\nBetween Provider and ${a.client}\n\n${clauses}${sig}`;
}

export function ServiceAgreementGenerator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [agreements, setAgreements] = useState<StoreDoc<Agreement>[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [client, setClient] = useState('');
  const [service, setService] = useState('');
  const [fee, setFee] = useState('');
  const [term, setTerm] = useState('12');
  const [signName, setSignName] = useState('');

  useEffect(() => {
    store.list<Agreement>('agreements').then((docs) => {
      setAgreements(docs);
      if (docs[0]) setOpenId(docs[0].docId);
    });
  }, [store]);

  const open = openId ? (agreements ?? []).find((a) => a.docId === openId) ?? null : null;

  async function createAgreement() {
    if (!client.trim() || !service.trim()) return;
    const a: Agreement = {
      client: client.trim(),
      service: service.trim(),
      feeCents: Math.round((Number(fee) || 0) * 100),
      termMonths: Number(term) || 12,
      status: 'draft',
      signedBy: '',
      signedAt: '',
      clauses: ['scope', 'payment', 'termination'],
    };
    const doc = await store.create('agreements', a);
    setAgreements((prev) => [...(prev ?? []), doc]);
    setOpenId(doc.docId);
    setClient('');
    setService('');
    setFee('');
  }

  async function update(doc: StoreDoc<Agreement>, patch: Partial<Agreement>) {
    const updated = await store.update('agreements', doc.docId, { ...doc.data, ...patch });
    setAgreements((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
  }

  async function toggleClause(clause: string) {
    if (!open) return;
    const clauses = open.data.clauses.includes(clause) ? open.data.clauses.filter((c) => c !== clause) : [...open.data.clauses, clause];
    await update(open, { clauses });
  }

  async function sign() {
    if (!open || !signName.trim()) return;
    await update(open, { status: 'signed', signedBy: signName.trim(), signedAt: new Date().toISOString().slice(0, 10) });
    setSignName('');
  }

  async function remove(docId: string) {
    await store.remove('agreements', docId);
    setAgreements((prev) => (prev ?? []).filter((a) => a.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportAgreement() {
    if (!open) return;
    const blob = new Blob([renderAgreement(open.data)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agreement-${open.data.client.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (agreements === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="service-agreement-generator-root">
      <Section title="Agreements">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {agreements.map((a) => (
            <span key={a.docId} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <Tag active={openId === a.docId} onClick={() => setOpenId(a.docId)}>
                {a.data.status === 'signed' ? '✅' : a.data.status === 'sent' ? '📤' : '📝'} {a.data.client}
              </Tag>
              <IconButton label="Remove agreement" onClick={() => remove(a.docId)}>
                ✕
              </IconButton>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" data-testid="agreement-client-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Service Description</Label>
            <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g. Monthly bookkeeping" data-testid="agreement-service-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Fee ($/mo)</Label>
            <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="agreement-fee-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Term (mo)</Label>
            <Input type="number" value={term} onChange={(e) => setTerm(e.target.value)} data-testid="agreement-term-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={createAgreement} data-testid="create-agreement-button">
            + Create
          </Button>
        </div>
      </Section>

      {open && (
        <>
          <Divider />
          <Section title={`Clauses — ${open.data.client}`}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {Object.entries(CLAUSE_LIBRARY).map(([key, c]) => (
                <Tag key={key} active={open.data.clauses.includes(key)} onClick={() => toggleClause(key)}>
                  {c.label}
                </Tag>
              ))}
            </div>
          </Section>

          <Divider />

          <Section title="Document">
            <div
              data-testid="agreement-preview"
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 16,
                fontSize: 13,
                color: 'var(--color-text-dim)',
                marginBottom: 14,
              }}
            >
              {renderAgreement(open.data)}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
              {open.data.status === 'draft' && (
                <Button variant="secondary" onClick={() => update(open, { status: 'sent' })} data-testid="send-button">
                  Mark Sent
                </Button>
              )}
              {open.data.status === 'sent' && (
                <>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Label>Type Full Name to Sign</Label>
                    <Input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="J. Smith" data-testid="sign-name-input" style={{ width: '100%' }} />
                  </div>
                  <Button variant="primary" onClick={sign} data-testid="sign-button">
                    Record Signature
                  </Button>
                </>
              )}
              {open.data.status === 'signed' && (
                <Tag active>
                  ✅ Signed by {open.data.signedBy} on {open.data.signedAt}
                </Tag>
              )}
            </div>

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportAgreement}>
              Export Agreement
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
