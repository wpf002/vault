import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';
import { initialSrsState, schedule, isDue, todayStr, type Quality, type SrsState } from './sm2';

type Card = SrsState & { front: string; back: string };

const RATINGS: { label: string; quality: Quality; variant: 'secondary' | 'primary' }[] = [
  { label: 'Again', quality: 1, variant: 'secondary' },
  { label: 'Hard', quality: 3, variant: 'secondary' },
  { label: 'Good', quality: 4, variant: 'primary' },
  { label: 'Easy', quality: 5, variant: 'primary' },
];

export function FlashcardBuilderWithSpacedRepetition({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [cards, setCards] = useState<StoreDoc<Card>[] | null>(null);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    store.list<Card>('cards').then(setCards);
  }, [store]);

  const dueCards = useMemo(() => (cards ?? []).filter((c) => isDue(c.data.dueDate)), [cards]);
  const current = dueCards[0] ?? null;

  async function addCard() {
    if (!front.trim() || !back.trim()) return;
    const card: Card = { front: front.trim(), back: back.trim(), ...initialSrsState() };
    const doc = await store.create('cards', card);
    setCards((prev) => [...(prev ?? []), doc]);
    setFront('');
    setBack('');
  }

  async function rate(quality: Quality) {
    if (!current) return;
    const next = schedule(current.data, quality);
    const updated = await store.update('cards', current.docId, { ...current.data, ...next });
    setCards((prev) => (prev ?? []).map((c) => (c.docId === current.docId ? updated : c)));
    setRevealed(false);
  }

  async function removeCard(docId: string) {
    await store.remove('cards', docId);
    setCards((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportDeck() {
    const json = JSON.stringify((cards ?? []).map((c) => c.data), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcard-deck.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cards === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="flashcard-spaced-repetition-root">
      <Section title="Review">
        <div style={{ marginBottom: 16 }}>
          <StatDisplay value={dueCards.length} label={dueCards.length === 1 ? 'card due today' : 'cards due today'} />
        </div>

        {current ? (
          <div data-testid="review-card">
            <div className="module-card" style={{ background: 'var(--color-bg)', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: revealed ? 10 : 0 }} data-testid="card-front">
                {current.data.front}
              </div>
              {revealed && (
                <div style={{ color: 'var(--color-text-dim)', paddingTop: 10, borderTop: '1px solid var(--color-border)' }} data-testid="card-back">
                  {current.data.back}
                </div>
              )}
            </div>

            {!revealed ? (
              <Button variant="primary" onClick={() => setRevealed(true)} data-testid="show-answer-button">
                Show Answer
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {RATINGS.map((r) => (
                  <Button key={r.label} variant={r.variant} onClick={() => rate(r.quality)} data-testid={`rate-${r.label.toLowerCase()}`}>
                    {r.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState icon="🎉">All caught up — no cards due today.</EmptyState>
        )}
      </Section>

      <Divider />

      <Section title="Add a Card">
        <div style={{ marginBottom: 10 }}>
          <Label>Front</Label>
          <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question" data-testid="card-front-input" style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Back</Label>
          <Textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer" data-testid="card-back-input" />
        </div>
        <Button variant="primary" onClick={addCard} data-testid="add-card-button">
          + Add Card
        </Button>
      </Section>

      <Divider />

      <Section title={`Deck (${cards.length})`}>
        {cards.length === 0 ? (
          <EmptyState icon="🧠">No cards yet — add one above.</EmptyState>
        ) : (
          <div data-testid="deck-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {cards.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="deck-item">
                <div className="module-list-row-content">
                  <strong>{c.data.front}</strong>
                  <div>{c.data.dueDate === todayStr() ? 'Due today' : c.data.dueDate < todayStr() ? 'Overdue' : `Due ${c.data.dueDate}`}</div>
                </div>
                <IconButton label="Remove" onClick={() => removeCard(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDeck}>
          ⬇️ Export Deck as JSON
        </GatedAction>
      </Section>
    </div>
  );
}
