import { useEffect, useRef, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Real-Time Collaborative Whiteboard — SVG canvas with freehand pen,
// sticky notes, an eraser (click a stroke or note to remove it), and
// named boards that persist. Scope note: live multi-user cursors need
// websocket infra the platform doesn't have yet — boards save/load per
// user, and the drawing surface is the substance. Freehand capture is
// hand-rolled pointer events; no drawing library.

type Stroke = { points: string; color: string };
type Note = { x: number; y: number; text: string; color: string };
type Board = { name: string; strokes: Stroke[]; notes: Note[] };

const COLORS = ['#5eead4', '#f5c451', '#f0a5c0', '#a3e635', '#93c5fd'];
const CANVAS_W = 600;
const CANVAS_H = 340;

type Tool = 'pen' | 'sticky' | 'erase';

export function RealTimeCollaborativeWhiteboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [boards, setBoards] = useState<StoreDoc<Board>[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(COLORS[0]!);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ x: number; y: number } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [boardName, setBoardName] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    store.list<Board>('boards').then((docs) => {
      setBoards(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
  }, [store]);

  const selected = (boards ?? []).find((b) => b.docId === selectedId) ?? null;

  async function saveBoard(next: Board) {
    if (!selected) return;
    const updated = await store.update('boards', selected.docId, next);
    setBoards((prev) => (prev ?? []).map((b) => (b.docId === selected.docId ? updated : b)));
  }

  function svgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!selected) return;
    const p = svgPoint(e);
    if (tool === 'pen') setDrawing(`${p.x},${p.y}`);
    if (tool === 'sticky') {
      setNoteDraft(p);
      setNoteText('');
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (tool !== 'pen' || drawing === null) return;
    const p = svgPoint(e);
    setDrawing((d) => `${d} ${p.x},${p.y}`);
  }

  async function onPointerUp() {
    if (tool !== 'pen' || drawing === null || !selected) return;
    const stroke: Stroke = { points: drawing, color };
    setDrawing(null);
    if (drawing.split(' ').length >= 2) await saveBoard({ ...selected.data, strokes: [...selected.data.strokes, stroke] });
  }

  async function placeNote() {
    if (!selected || !noteDraft || !noteText.trim()) return;
    const note: Note = { x: noteDraft.x, y: noteDraft.y, text: noteText.trim(), color };
    await saveBoard({ ...selected.data, notes: [...selected.data.notes, note] });
    setNoteDraft(null);
    setNoteText('');
  }

  async function eraseStroke(index: number) {
    if (!selected || tool !== 'erase') return;
    await saveBoard({ ...selected.data, strokes: selected.data.strokes.filter((_, i) => i !== index) });
  }

  async function eraseNote(index: number) {
    if (!selected || tool !== 'erase') return;
    await saveBoard({ ...selected.data, notes: selected.data.notes.filter((_, i) => i !== index) });
  }

  async function clearBoard() {
    if (!selected) return;
    await saveBoard({ ...selected.data, strokes: [], notes: [] });
  }

  async function addBoard() {
    if (!boardName.trim()) return;
    const doc = await store.create('boards', { name: boardName.trim(), strokes: [], notes: [] });
    setBoards((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setBoardName('');
  }

  async function removeBoard(docId: string) {
    await store.remove('boards', docId);
    setBoards((prev) => {
      const next = (prev ?? []).filter((b) => b.docId !== docId);
      if (selectedId === docId) setSelectedId(next[0]?.docId ?? '');
      return next;
    });
  }

  function exportBoard() {
    if (!selected || !svgRef.current) return;
    const svgMarkup = svgRef.current.outerHTML;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.data.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (boards === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="collaborative-whiteboard-root">
      <Section title="Whiteboard">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
          {boards.length > 0 && (
            <div style={{ width: 200 }}>
              <Label>Board</Label>
              <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} data-testid="board-select" style={{ width: '100%' }}>
                {boards.map((b) => (
                  <option key={b.docId} value={b.docId}>
                    {b.data.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>New Board</Label>
            <Input value={boardName} onChange={(e) => setBoardName(e.target.value)} placeholder="e.g. Roadmap Sketch" data-testid="board-name-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addBoard} data-testid="add-board-button">
            + Create
          </Button>
          {selected && (
            <Button variant="ghost" onClick={() => removeBoard(selected.docId)} data-testid="delete-board-button">
              🗑️
            </Button>
          )}
        </div>

        {selected ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <Tag active={tool === 'pen'} onClick={() => setTool('pen')}>✏️ Pen</Tag>
              <Tag active={tool === 'sticky'} onClick={() => setTool('sticky')}>🗒️ Sticky</Tag>
              <Tag active={tool === 'erase'} onClick={() => setTool('erase')}>🧽 Eraser</Tag>
              <span style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    data-testid={`color-${c.slice(1)}`}
                    style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </span>
              <Button variant="ghost" onClick={clearBoard} data-testid="clear-button" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}>
                Clear Board
              </Button>
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              data-testid="canvas"
              style={{ width: '100%', maxWidth: CANVAS_W, borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.04))', touchAction: 'none', cursor: tool === 'pen' ? 'crosshair' : 'pointer' }}
            >
              {selected.data.strokes.map((s, i) => (
                <polyline key={i} points={s.points} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" onClick={() => eraseStroke(i)} data-testid={`stroke-${i}`} style={{ cursor: tool === 'erase' ? 'not-allowed' : undefined }} />
              ))}
              {drawing && <polyline points={drawing} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {selected.data.notes.map((n, i) => (
                <g key={i} transform={`translate(${n.x}, ${n.y})`} onClick={() => eraseNote(i)} data-testid={`note-${i}`}>
                  <rect width={130} height={54} rx={6} fill={n.color} opacity={0.92} />
                  <foreignObject width={130} height={54}>
                    <div style={{ fontSize: 10, padding: 6, color: '#1a1a1a', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', height: '100%' }}>{n.text}</div>
                  </foreignObject>
                </g>
              ))}
            </svg>

            {noteDraft && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }} data-testid="note-editor">
                <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Sticky note text…" data-testid="note-text-input" style={{ flex: 1 }} autoFocus />
                <Button variant="primary" onClick={placeNote} data-testid="place-note-button">
                  Place
                </Button>
                <Button variant="ghost" onClick={() => setNoteDraft(null)}>
                  Cancel
                </Button>
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: '8px 0 0' }}>
              Pen: drag to draw · Sticky: click where the note goes · Eraser: click a stroke or note to remove it.
            </p>
          </>
        ) : (
          <EmptyState icon="✏️">No boards — create one above.</EmptyState>
        )}
      </Section>

      <Divider />

      <Section title="Board Stats">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          <StatDisplay value={boards.length} label="Boards saved" />
          <StatDisplay value={<span data-testid="stroke-count">{selected?.data.strokes.length ?? 0}</span>} label="Strokes on this board" />
          <StatDisplay value={<span data-testid="note-count">{selected?.data.notes.length ?? 0}</span>} label="Sticky notes" />
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          Export Board as SVG
        </GatedAction>
      </Section>
    </div>
  );
}
