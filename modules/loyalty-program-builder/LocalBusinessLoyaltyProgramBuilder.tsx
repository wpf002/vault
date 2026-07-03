import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Local Business Loyalty Program Builder — the shop-owner's side of a
// punch-card program: define programs (N punches → reward), issue cards
// to customers, punch on purchase, redeem when the card fills (punches
// reset, redemption count increments). No platform lock-in is the point:
// your customer list exports as plain CSV.

type Program = { name: string; reward: string; punchesRequired: number };
type Card = { customer: string; program: string; punches: number; redeemed: number };

export function LocalBusinessLoyaltyProgramBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [programs, setPrograms] = useState<StoreDoc<Program>[] | null>(null);
  const [cards, setCards] = useState<StoreDoc<Card>[] | null>(null);
  const [pName, setPName] = useState('');
  const [pReward, setPReward] = useState('');
  const [pPunches, setPPunches] = useState('8');
  const [cName, setCName] = useState('');
  const [cProgram, setCProgram] = useState('');

  useEffect(() => {
    store.list<Program>('programs').then((docs) => {
      setPrograms(docs);
      if (docs[0]) setCProgram(docs[0].data.name);
    });
    store.list<Card>('cards').then(setCards);
  }, [store]);

  const programList = programs ?? [];
  const cardList = cards ?? [];
  const totalRedeemed = cardList.reduce((s, c) => s + c.data.redeemed, 0);
  const readyCount = cardList.filter((c) => {
    const prog = programList.find((p) => p.data.name === c.data.program);
    return prog && c.data.punches >= prog.data.punchesRequired;
  }).length;

  function requiredFor(card: Card): number {
    return programList.find((p) => p.data.name === card.program)?.data.punchesRequired ?? 10;
  }

  async function addProgram() {
    if (!pName.trim() || !pReward.trim()) return;
    const p: Program = { name: pName.trim(), reward: pReward.trim(), punchesRequired: Math.max(1, Math.round(Number(pPunches) || 8)) };
    const doc = await store.create('programs', p);
    setPrograms((prev) => [...(prev ?? []), doc]);
    if (!cProgram) setCProgram(p.name);
    setPName('');
    setPReward('');
    setPPunches('8');
  }

  async function removeProgram(docId: string) {
    await store.remove('programs', docId);
    setPrograms((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  async function issueCard() {
    if (!cName.trim() || !cProgram) return;
    const doc = await store.create('cards', { customer: cName.trim(), program: cProgram, punches: 0, redeemed: 0 });
    setCards((prev) => [...(prev ?? []), doc]);
    setCName('');
  }

  async function punch(doc: StoreDoc<Card>) {
    const required = requiredFor(doc.data);
    if (doc.data.punches >= required) return; // full card must be redeemed first
    const updated = await store.update('cards', doc.docId, { ...doc.data, punches: doc.data.punches + 1 });
    setCards((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function redeem(doc: StoreDoc<Card>) {
    const required = requiredFor(doc.data);
    if (doc.data.punches < required) return;
    const updated = await store.update('cards', doc.docId, { ...doc.data, punches: 0, redeemed: doc.data.redeemed + 1 });
    setCards((prev) => (prev ?? []).map((c) => (c.docId === doc.docId ? updated : c)));
  }

  async function removeCard(docId: string) {
    await store.remove('cards', docId);
    setCards((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportCustomers() {
    const rows = cardList.map((c) => `"${c.data.customer}","${c.data.program}",${c.data.punches},${requiredFor(c.data)},${c.data.redeemed}`);
    const csv = ['customer,program,punches,punches required,rewards redeemed', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'loyalty-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (programs === null || cards === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="loyalty-program-builder-root">
      <Section title="Program Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={programList.length} label="Active programs" />
          <StatDisplay value={cardList.length} label="Cards issued" />
          <StatDisplay value={<span data-testid="ready-count">{readyCount}</span>} label="Rewards ready" />
          <StatDisplay value={<span data-testid="redeemed-count">{totalRedeemed}</span>} label="Rewards redeemed" />
        </div>
      </Section>

      <Divider />

      <Section title="Punch Card Programs">
        {programList.length === 0 ? (
          <EmptyState icon="🪙">No programs yet — design your first punch card below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="programs-list">
            {programList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="program-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>
                    {p.data.punchesRequired} punches → {p.data.reward}
                  </span>
                </div>
                <Tag>{cardList.filter((c) => c.data.program === p.data.name).length} cards</Tag>
                <IconButton label="Remove" onClick={() => removeProgram(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 140 }}>
            <Label>Program</Label>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Bagel Dozen" data-testid="program-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Reward</Label>
            <Input value={pReward} onChange={(e) => setPReward(e.target.value)} placeholder="e.g. Free dozen bagels" data-testid="program-reward-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Punches</Label>
            <Input type="number" value={pPunches} onChange={(e) => setPPunches(e.target.value)} data-testid="program-punches-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProgram} data-testid="add-program-button">
            + Create Program
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Customer Cards">
        {cardList.length === 0 ? (
          <EmptyState icon="💳">No cards issued yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="cards-list">
            {cardList.map((c) => {
              const required = requiredFor(c.data);
              const ready = c.data.punches >= required;
              return (
                <div key={c.docId} className="module-list-row" data-testid="card-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.customer}</span>
                      <span style={{ fontSize: 12, marginLeft: 8 }}>{c.data.program}</span>
                    </div>
                    {c.data.redeemed > 0 && <Tag>🏅 {c.data.redeemed} redeemed</Tag>}
                    {ready ? (
                      <Button variant="primary" onClick={() => redeem(c)} data-testid={`redeem-${c.docId}`} style={{ padding: '5px 12px', fontSize: 12 }}>
                        🎉 Redeem Reward
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => punch(c)} data-testid={`punch-${c.docId}`} style={{ padding: '5px 12px', fontSize: 12 }}>
                        👊 Punch
                      </Button>
                    )}
                    <IconButton label="Remove" onClick={() => removeCard(c.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} data-testid={`punches-${c.docId}`}>
                    {Array.from({ length: required }, (_, i) => (
                      <span
                        key={i}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          background: i < c.data.punches ? 'var(--module-accent)' : 'var(--color-surface-2, rgba(255,255,255,0.08))',
                          color: i < c.data.punches ? '#000' : 'var(--color-text-dim)',
                        }}
                      >
                        {i < c.data.punches ? '✓' : ''}
                      </span>
                    ))}
                    <span style={{ fontSize: 11, color: ready ? 'var(--module-accent)' : 'var(--color-text-dim)', marginLeft: 6 }}>
                      {ready ? 'Reward ready!' : `${c.data.punches} / ${required}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Customer</Label>
            <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="e.g. Dana W." data-testid="customer-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Program</Label>
            <Select value={cProgram} onChange={(e) => setCProgram(e.target.value)} data-testid="card-program-select" style={{ width: '100%' }}>
              {programList.map((p) => (
                <option key={p.docId} value={p.data.name}>
                  {p.data.name}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={issueCard} data-testid="issue-card-button">
            💳 Issue Card
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCustomers}>
          ⬇️ Export Customers as CSV — No Lock-In
        </GatedAction>
      </Section>
    </div>
  );
}
