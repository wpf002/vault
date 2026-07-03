import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Recipe Sharing App — recipe box with ratings and ingredient search:
// type what's in your fridge (comma separated) and recipes rank by how
// many of their ingredients you already have.

type Recipe = { name: string; ingredients: string[]; steps: string; minutes: number; rating: number };

export function RecipeSharingApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [recipes, setRecipes] = useState<StoreDoc<Recipe>[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pantry, setPantry] = useState('');
  const [name, setName] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [steps, setSteps] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    store.list<Recipe>('recipes').then(setRecipes);
  }, [store]);

  const pantryItems = useMemo(() => pantry.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean), [pantry]);

  const ranked = useMemo(() => {
    const list = (recipes ?? []).map((r) => {
      const have = pantryItems.length ? r.data.ingredients.filter((i) => pantryItems.some((p) => i.toLowerCase().includes(p))).length : 0;
      return { doc: r, have };
    });
    return pantryItems.length ? list.sort((a, b) => b.have - a.have || b.doc.data.rating - a.doc.data.rating) : list.sort((a, b) => b.doc.data.rating - a.doc.data.rating);
  }, [recipes, pantryItems]);

  const open = openId ? (recipes ?? []).find((r) => r.docId === openId) ?? null : null;

  async function addRecipe() {
    if (!name.trim() || !ingredientsText.trim()) return;
    const r: Recipe = {
      name: name.trim(),
      ingredients: ingredientsText.split(',').map((i) => i.trim()).filter(Boolean),
      steps: steps.trim(),
      minutes: Number(minutes) || 30,
      rating,
    };
    const doc = await store.create('recipes', r);
    setRecipes((prev) => [...(prev ?? []), doc]);
    setName('');
    setIngredientsText('');
    setSteps('');
  }

  async function remove(docId: string) {
    await store.remove('recipes', docId);
    setRecipes((prev) => (prev ?? []).filter((r) => r.docId !== docId));
    if (openId === docId) setOpenId(null);
  }

  function exportBox() {
    const md = (recipes ?? [])
      .map((r) => `# ${r.data.name}\n_${r.data.minutes} min · ${'★'.repeat(r.data.rating)}_\n\n**Ingredients:** ${r.data.ingredients.join(', ')}\n\n${r.data.steps}`)
      .join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipe-box.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (recipes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="recipe-sharing-root">
      <Section title="What Can I Make?">
        <Label>Ingredients You Have (Comma Separated)</Label>
        <Input value={pantry} onChange={(e) => setPantry(e.target.value)} placeholder="pasta, butter, lemon…" data-testid="pantry-input" style={{ width: '100%', marginBottom: 14 }} />

        {ranked.length === 0 ? (
          <EmptyState icon="🍳">No recipes yet — add your first below.</EmptyState>
        ) : (
          <div data-testid="recipes-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {ranked.map(({ doc: r, have }) => (
              <div key={r.docId} className="module-list-row" data-testid="recipe-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <button onClick={() => setOpenId(openId === r.docId ? null : r.docId)} style={{ all: 'unset', cursor: 'pointer' }} data-testid={`open-${r.docId}`}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.name}</span>
                  </button>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--module-accent)', letterSpacing: 1 }}>
                      {'★'.repeat(r.data.rating)}
                      <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - r.data.rating)}</span>
                    </span>
                    <span>⏱ {r.data.minutes} min</span>
                    {pantryItems.length > 0 && (
                      <Tag active={have === r.data.ingredients.length}>
                        {have}/{r.data.ingredients.length} ingredients on hand
                      </Tag>
                    )}
                  </div>
                </div>
                <IconButton label="Remove" onClick={() => remove(r.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16 }} data-testid="recipe-detail">
            <strong style={{ color: 'var(--color-text)' }}>{open.data.name}</strong>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
              {open.data.ingredients.map((i) => (
                <Tag key={i} active={pantryItems.some((p) => i.toLowerCase().includes(p))}>
                  {i}
                </Tag>
              ))}
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0, whiteSpace: 'pre-wrap' }}>{open.data.steps}</p>
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBox}>
          ⬇️ Export Recipe Box as Markdown
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Add a Recipe">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name" data-testid="recipe-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Minutes</Label>
            <Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} data-testid="recipe-minutes-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Rating</Label>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ all: 'unset', cursor: 'pointer', fontSize: 20, color: n <= rating ? 'var(--module-accent)' : 'var(--color-border)' }} data-testid={`rating-${n}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <Label>Ingredients (Comma Separated)</Label>
          <Input value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} placeholder="pasta, miso, butter" data-testid="recipe-ingredients-input" style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Steps</Label>
          <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="How to make it" data-testid="recipe-steps-input" />
        </div>
        <Button variant="primary" onClick={addRecipe} data-testid="add-recipe-button">
          + Add Recipe
        </Button>
      </Section>
    </div>
  );
}
