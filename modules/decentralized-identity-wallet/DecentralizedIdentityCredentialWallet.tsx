import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Decentralized Identity & Credential Wallet — hold DIDs, attach
// credentials to them, and verify each credential's integrity
// (tamper-evident fingerprint over its fields) plus its expiry window.
// Scope note: real verifiable credentials need issuer signature
// infrastructure (DID resolution + cryptographic proofs) — the wallet
// structure, integrity sealing, and expiry verification live here; the
// fingerprint is a local tamper-evidence hash, not an issuer signature.

type Identity = { label: string; did: string };
type Credential = { name: string; issuer: string; holderDid: string; issuedDate: string; expiresDate: string; fingerprint: string };

// djb2 over the credential's identity fields — changes if any field is edited
function fingerprint(c: Omit<Credential, 'fingerprint'>): string {
  const s = `${c.name}|${c.issuer}|${c.holderDid}|${c.issuedDate}|${c.expiresDate}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function newDid(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `did:vault:z6Mk${s}`;
}

type Verdict = { ok: boolean; reason: string };

function verify(c: Credential): Verdict {
  if (!c.fingerprint) return { ok: false, reason: 'Unsealed — no integrity fingerprint yet' };
  if (fingerprint(c) !== c.fingerprint) return { ok: false, reason: 'Integrity check failed — fields changed since sealing' };
  const today = new Date().toISOString().slice(0, 10);
  if (c.expiresDate < today) return { ok: false, reason: `Expired ${c.expiresDate}` };
  if (c.issuedDate > today) return { ok: false, reason: `Not valid until ${c.issuedDate}` };
  return { ok: true, reason: `Integrity intact · valid through ${c.expiresDate}` };
}

export function DecentralizedIdentityCredentialWallet({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [identities, setIdentities] = useState<StoreDoc<Identity>[] | null>(null);
  const [credentials, setCredentials] = useState<StoreDoc<Credential>[] | null>(null);
  const [idLabel, setIdLabel] = useState('');
  const [cName, setCName] = useState('');
  const [cIssuer, setCIssuer] = useState('');
  const [cHolder, setCHolder] = useState('');
  const [cExpires, setCExpires] = useState('');
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});

  useEffect(() => {
    store.list<Identity>('identities').then(setIdentities);
    store.list<Credential>('credentials').then(setCredentials);
  }, [store]);

  const idList = identities ?? [];
  const credList = credentials ?? [];
  const verifiedCount = Object.values(verdicts).filter((v) => v.ok).length;

  async function addIdentity() {
    if (!idLabel.trim()) return;
    const doc = await store.create('identities', { label: idLabel.trim(), did: newDid() });
    setIdentities((prev) => [...(prev ?? []), doc]);
    setIdLabel('');
  }

  async function removeIdentity(docId: string) {
    await store.remove('identities', docId);
    setIdentities((prev) => (prev ?? []).filter((i) => i.docId !== docId));
  }

  async function addCredential() {
    if (!cName.trim() || !cIssuer.trim() || !cHolder) return;
    const today = new Date().toISOString().slice(0, 10);
    const base = { name: cName.trim(), issuer: cIssuer.trim(), holderDid: cHolder, issuedDate: today, expiresDate: cExpires || today };
    const c: Credential = { ...base, fingerprint: fingerprint(base) };
    const doc = await store.create('credentials', c);
    setCredentials((prev) => [...(prev ?? []), doc]);
    setCName('');
    setCIssuer('');
    setCExpires('');
  }

  async function sealCredential(doc: StoreDoc<Credential>) {
    const sealed: Credential = { ...doc.data, fingerprint: fingerprint(doc.data) };
    const updated = await store.update('credentials', doc.docId, sealed);
    setCredentials((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
    setVerdicts((prev) => ({ ...prev, [doc.docId]: verify(sealed) }));
  }

  function verifyCredential(doc: StoreDoc<Credential>) {
    setVerdicts((prev) => ({ ...prev, [doc.docId]: verify(doc.data) }));
  }

  async function removeCredential(docId: string) {
    await store.remove('credentials', docId);
    setCredentials((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportWallet() {
    const payload = {
      identities: idList.map((i) => i.data),
      credentials: credList.map((c) => c.data),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'identity-wallet.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (identities === null || credentials === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="decentralized-identity-wallet-root">
      <Section title="Wallet Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={idList.length} label="Identities held" />
          <StatDisplay value={credList.length} label="Credentials in wallet" />
          <StatDisplay value={<span data-testid="verified-count">{verifiedCount}</span>} label="Verified this session" />
        </div>
      </Section>

      <Divider />

      <Section title="Identities">
        {idList.length === 0 ? (
          <EmptyState icon="🪪">No identities — generate your first DID below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="identities-list">
            {idList.map((i) => (
              <div key={i.docId} className="module-list-row" data-testid="identity-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{i.data.label}</span>
                  <div style={{ fontSize: 12, marginTop: 2, fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>{i.data.did}</div>
                </div>
                <Tag>{credList.filter((c) => c.data.holderDid === i.data.did).length} credentials</Tag>
                <IconButton label="Remove" onClick={() => removeIdentity(i.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Label</Label>
            <Input value={idLabel} onChange={(e) => setIdLabel(e.target.value)} placeholder="e.g. Freelance" data-testid="identity-label-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addIdentity} data-testid="add-identity-button">
            Generate DID
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Credentials">
        {credList.length === 0 ? (
          <EmptyState icon="📜">No credentials — issue one to an identity below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="credentials-list">
            {credList.map((c) => {
              const v = verdicts[c.docId];
              const holder = idList.find((i) => i.data.did === c.data.holderDid);
              return (
                <div key={c.docId} className="module-list-row" data-testid="credential-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.name}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        {c.data.issuer} → {holder?.data.label ?? c.data.holderDid} · issued {c.data.issuedDate}
                      </div>
                    </div>
                    {c.data.fingerprint ? (
                      <Tag>🔏 {c.data.fingerprint}</Tag>
                    ) : (
                      <Button variant="ghost" onClick={() => sealCredential(c)} data-testid={`seal-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        Seal
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => verifyCredential(c)} data-testid={`verify-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Verify
                    </Button>
                    <IconButton label="Remove" onClick={() => removeCredential(c.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  {v && (
                    <div
                      data-testid={`verdict-${c.docId}`}
                      style={{ fontSize: 12, color: v.ok ? '#39d98a' : '#ff6b5e', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {v.ok ? '✅' : '⛔'} {v.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Credential</Label>
            <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Notary Commission" data-testid="credential-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Issuer</Label>
            <Input value={cIssuer} onChange={(e) => setCIssuer(e.target.value)} placeholder="e.g. County Clerk" data-testid="credential-issuer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Held By</Label>
            <Select value={cHolder} onChange={(e) => setCHolder(e.target.value)} data-testid="holder-select" style={{ width: '100%' }}>
              <option value="">Choose identity…</option>
              {idList.map((i) => (
                <option key={i.docId} value={i.data.did}>
                  {i.data.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 150 }}>
            <Label>Expires</Label>
            <Input type="date" value={cExpires} onChange={(e) => setCExpires(e.target.value)} data-testid="expires-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addCredential} data-testid="add-credential-button">
            + Issue & Seal
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportWallet}>
          Export Wallet as JSON
        </GatedAction>
      </Section>
    </div>
  );
}
