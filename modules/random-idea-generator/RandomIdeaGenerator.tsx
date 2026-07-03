import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Section, Divider, StatDisplay, Tag, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// Random Idea Generator — a combinatorial prompt engine: each mode
// slots random picks into a template (characters × twists × settings ×
// constraints gives ~10k writing combos alone), so it never needs a
// network call or an AI model. Deliberately rule-based — it sits in the
// ai_tools category but is the one module there that doesn't require
// Phase 7's AI proxy. Favorites persist.

type Favorite = { mode: string; text: string };

const WRITING = {
  characters: ['a lighthouse keeper who has never seen the ocean', 'a retired pickpocket teaching ethics', 'a cartographer who maps places that don\'t exist yet', 'twins who share one memory between them', 'a night-shift radio host with exactly one listener', 'a translator for a language nobody else speaks', 'an apprentice clockmaker who fears time', 'a chef who can taste memories'],
  twists: ['inherits a debt owed to a ghost', 'wakes up famous for something they didn\'t do', 'finds a door that opens a day into the past', 'must return everything they\'ve ever borrowed', 'starts receiving mail addressed to their future self', 'is the only one who remembers the old world', 'wins a contest they never entered', 'discovers their shadow has opinions'],
  settings: ['in a city built on the back of a sleeping giant', 'aboard a train that never stops', 'in a village where it has rained for a decade', 'inside a library that rearranges itself at night', 'on the last island on the map', 'in a town that shares one dream', 'at a hotel between seasons', 'in a market that only exists at dusk'],
  constraints: ['told entirely through letters', 'told backwards', 'told in second person', 'where no one may say the word "time"', 'in exactly three scenes', 'narrated by the least reliable witness', 'with a countdown on every page', 'where the weather mirrors the plot'],
};

const DRAWING = {
  subjects: ['a bustling night market', 'an abandoned observatory', 'a mechanical whale', 'a greenhouse in winter', 'a staircase to nowhere', 'an octopus playing chess', 'a floating tea house', 'a robot learning to garden'],
  styles: ['using only geometric shapes', 'in three colors maximum', 'with a single continuous line', 'as a children\'s book illustration', 'in dramatic chiaroscuro', 'as an architectural blueprint', 'in the style of a vintage travel poster', 'from a worm\'s-eye view'],
  moods: ['lit by a single dramatic light source', 'moments before a storm', 'at golden hour', 'reflected in a puddle', 'half in ruin, half rebuilt', 'during a celebration', 'in complete silence', 'caught mid-transformation'],
};

const BRAINSTORM = {
  seeds: ['a public library', 'the morning commute', 'a farmers market', 'neighborhood recycling', 'a school cafeteria', 'street parking', 'the local gym', 'community voting'],
  reframes: ['worked if it lent skills instead of things', 'were designed for people who hate it', 'had to fit in a backpack', 'were run entirely by its users', 'happened only at night', 'were a subscription', 'rewarded the slowest participants', 'were designed by kids'],
  constraints: ['it must run with zero staff', 'it can cost nothing to operate', 'it must work without electricity', 'everyone participates anonymously', 'it has to fit on one city block', 'it must be profitable in month one', 'no screens allowed', 'it must delight a 90-year-old'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generate(mode: string): string {
  if (mode === 'Writing') {
    return `A ${pick(WRITING.characters).replace(/^a /, '')} who ${pick(WRITING.twists).replace(/^(inherits|wakes|finds|must|starts|is|wins|discovers)/, (m) => m)}, set ${pick(WRITING.settings)}, ${pick(WRITING.constraints)}.`;
  }
  if (mode === 'Drawing') {
    return `Draw ${pick(DRAWING.subjects)} — ${pick(DRAWING.styles)}, ${pick(DRAWING.moods)}.`;
  }
  return `How might ${pick(BRAINSTORM.seeds)} work if it ${pick(BRAINSTORM.reframes).replace(/^worked if it /, '').replace(/^were /, 'were ').replace(/^had /, 'had ')}? Constraint: ${pick(BRAINSTORM.constraints)}.`;
}

export function RandomIdeaGenerator({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [favorites, setFavorites] = useState<StoreDoc<Favorite>[] | null>(null);
  const [genMode, setGenMode] = useState('Writing');
  const [current, setCurrent] = useState('');
  const [generated, setGenerated] = useState(0);

  useEffect(() => {
    store.list<Favorite>('favorites').then(setFavorites);
  }, [store]);

  function spin() {
    setCurrent(generate(genMode));
    setGenerated((n) => n + 1);
  }

  async function saveFavorite() {
    if (!current) return;
    const doc = await store.create('favorites', { mode: genMode.toLowerCase(), text: current });
    setFavorites((prev) => [doc, ...(prev ?? [])]);
    setCurrent('');
  }

  async function removeFavorite(docId: string) {
    await store.remove('favorites', docId);
    setFavorites((prev) => (prev ?? []).filter((f) => f.docId !== docId));
  }

  function exportFavorites() {
    const lines = (favorites ?? []).map((f) => `- **[${f.data.mode}]** ${f.data.text}`);
    const md = ['# Saved Prompts', '', ...lines].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'saved-prompts.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (favorites === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="random-idea-generator-root">
      <Section title="The Generator">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SegmentedControl options={['Writing', 'Drawing', 'Brainstorm'].map((v) => ({ value: v, label: v }))} value={genMode} onChange={setGenMode} data-testid="mode-control" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="primary" onClick={spin} data-testid="generate-button">
              💡 Give Me an Idea
            </Button>
            {current && (
              <Button variant="secondary" onClick={saveFavorite} data-testid="save-button">
                ⭐ Keep It
              </Button>
            )}
          </div>
          {current ? (
            <div style={{ padding: '16px 18px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 16, lineHeight: 1.6, color: 'var(--color-text)' }} data-testid="idea-display">
              {current}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>Pick a mode and spin — every prompt is a fresh combination.</p>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Session">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="generated-count">{generated}</span>} label="Ideas generated this session" />
          <StatDisplay value={favorites.length} label="Prompts saved" />
          <StatDisplay value="10,000+" label="Possible combinations" />
        </div>
      </Section>

      <Divider />

      <Section title="Saved Prompts">
        {favorites.length === 0 ? (
          <EmptyState icon="⭐">Nothing saved — keep the ideas worth coming back to.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="favorites-list">
            {favorites.map((f) => (
              <div key={f.docId} className="module-list-row" data-testid="favorite-item" style={{ alignItems: 'center' }}>
                <Tag>{f.data.mode}</Tag>
                <div className="module-list-row-content" style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                  {f.data.text}
                </div>
                <IconButton label="Remove" onClick={() => removeFavorite(f.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportFavorites}>
          ⬇️ Export Saved Prompts as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
