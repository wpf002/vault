import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Interactive Branching Storytelling Platform — create and play
// choose-your-own-adventure stories. Nodes carry a stable key; choices
// reference target keys ('start' is the entry point). Play mode walks the
// graph; the editor flags choices whose target doesn't exist yet, and
// nodes nothing links to.

type Choice = { label: string; target: string };
type StoryNode = { key: string; text: string; choices: Choice[] };

export function InteractiveBranchingStorytellingPlatform({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [nodes, setNodes] = useState<StoreDoc<StoryNode>[] | null>(null);
  const [tab, setTab] = useState<'play' | 'edit'>('play');
  const [currentKey, setCurrentKey] = useState('start');
  const [path, setPath] = useState<string[]>([]);
  const [nodeKey, setNodeKey] = useState('');
  const [nodeText, setNodeText] = useState('');
  const [choicesText, setChoicesText] = useState('');

  useEffect(() => {
    store.list<StoryNode>('nodes').then(setNodes);
  }, [store]);

  const byKey = useMemo(() => new Map((nodes ?? []).map((n) => [n.data.key, n])), [nodes]);
  const current = byKey.get(currentKey) ?? null;

  const brokenTargets = useMemo(
    () => (nodes ?? []).flatMap((n) => n.data.choices.filter((c) => !byKey.has(c.target)).map((c) => `${n.data.key} → ${c.target}`)),
    [nodes, byKey],
  );
  const orphans = useMemo(() => {
    const linked = new Set(['start', ...(nodes ?? []).flatMap((n) => n.data.choices.map((c) => c.target))]);
    return (nodes ?? []).filter((n) => !linked.has(n.data.key)).map((n) => n.data.key);
  }, [nodes]);

  function restart() {
    setCurrentKey('start');
    setPath([]);
  }

  function pick(choice: Choice) {
    setPath((p) => [...p, choice.label]);
    setCurrentKey(choice.target);
  }

  async function addNode() {
    if (!nodeKey.trim() || !nodeText.trim()) return;
    const choices: Choice[] = choicesText
      .split('\n')
      .map((line) => {
        const [label, target] = line.split('->').map((s) => s.trim());
        return label && target ? { label, target } : null;
      })
      .filter((c): c is Choice => c !== null);
    const node: StoryNode = { key: nodeKey.trim(), text: nodeText.trim(), choices };
    const doc = await store.create('nodes', node);
    setNodes((prev) => [...(prev ?? []), doc]);
    setNodeKey('');
    setNodeText('');
    setChoicesText('');
  }

  async function removeNode(docId: string) {
    await store.remove('nodes', docId);
    setNodes((prev) => (prev ?? []).filter((n) => n.docId !== docId));
  }

  function exportStory() {
    const json = JSON.stringify((nodes ?? []).map((n) => n.data), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'story.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (nodes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="branching-storytelling-root">
      <Section title="Story">
        <div style={{ marginBottom: 14 }}>
          <SegmentedControl
            options={[
              { value: 'play', label: '▶ Play' },
              { value: 'edit', label: '✏️ Edit' },
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              if (v === 'play') restart();
            }}
          />
        </div>

        {tab === 'play' ? (
          nodes.length === 0 ? (
            <EmptyState icon="🌳">No story yet — write the first node (key it "start") in the editor.</EmptyState>
          ) : current ? (
            <div data-testid="play-view">
              {path.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: '0 0 8px' }}>Your path: {path.join(' → ')}</p>
              )}
              <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 12 }}>
                <p style={{ color: 'var(--color-text)', fontSize: 14, lineHeight: 1.6, margin: 0 }} data-testid="story-text">
                  {current.data.text}
                </p>
              </div>
              {current.data.choices.length === 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag active>The End</Tag>
                  <Button variant="primary" onClick={restart} data-testid="restart-button">
                    ↺ Play Again
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="choices">
                  {current.data.choices.map((c, i) => (
                    <Button key={i} variant="secondary" onClick={() => pick(c)} data-testid={`choice-${i}`} style={{ textAlign: 'left' }}>
                      → {c.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon="🕳️">
              Dead end — no node named &ldquo;{currentKey}&rdquo;. Fix the broken link in the editor.
            </EmptyState>
          )
        ) : (
          <div data-testid="edit-view">
            {(brokenTargets.length > 0 || orphans.length > 0) && (
              <div style={{ fontSize: 12, color: '#ff9f0a', marginBottom: 10 }}>
                {brokenTargets.length > 0 && <div>⚠️ Broken links: {brokenTargets.join(', ')}</div>}
                {orphans.length > 0 && <div>⚠️ Unreachable nodes: {orphans.join(', ')}</div>}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="nodes-list">
              {nodes.map((n) => (
                <div key={n.docId} className="module-list-row" data-testid="node-item" style={{ alignItems: 'center' }}>
                  <Tag active={n.data.key === 'start'}>{n.data.key}</Tag>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ fontSize: 13 }}>{n.data.text.slice(0, 80)}{n.data.text.length > 80 ? '…' : ''}</span>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      {n.data.choices.length === 0 ? 'ending' : n.data.choices.map((c) => `→ ${c.target}`).join('  ')}
                    </div>
                  </div>
                  <IconButton label="Remove node" onClick={() => removeNode(n.docId)}>
                    ✕
                  </IconButton>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 140 }}>
                <Label>Node Key</Label>
                <Input value={nodeKey} onChange={(e) => setNodeKey(e.target.value)} placeholder="e.g. cave" data-testid="node-key-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Label>Story Text</Label>
                <Textarea value={nodeText} onChange={(e) => setNodeText(e.target.value)} placeholder="What happens here?" data-testid="node-text-input" style={{ minHeight: 60 }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Label>{'Choices (One Per Line: Label -> Target Key; Leave Empty for an Ending)'}</Label>
              <Textarea value={choicesText} onChange={(e) => setChoicesText(e.target.value)} placeholder={'Enter the cave -> cave\nTurn back -> start'} data-testid="node-choices-input" style={{ minHeight: 60 }} />
            </div>
            <Button variant="primary" onClick={addNode} data-testid="add-node-button">
              + Add Node
            </Button>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Export">
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportStory}>
          Export Story as JSON
        </GatedAction>
      </Section>
    </div>
  );
}
