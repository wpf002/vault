import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, EmptyState, LoadingState } from '@vault/module-ui';

// Staff Scheduling Tool — Weekly shift grid with swap-request flags.
// Scope note: swap "notifications" to other staff need cross-account
// messaging infra; the swap-request flag renders prominently on the grid,
// which is what the schedule owner acts on.

const SLOTS = ['morning', 'evening'] as const;
type Slot = (typeof SLOTS)[number];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Shift = { person: string; date: string; slot: Slot; swapRequested: boolean };

function mondayOf(offsetWeeks: number): Date {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offsetWeeks * 7);
  return monday;
}

function dateOf(monday: Date, dayIndex: number): string {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

export function StaffSchedulingTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [shifts, setShifts] = useState<StoreDoc<Shift>[] | null>(null);
  const [week, setWeek] = useState(0);
  const [person, setPerson] = useState('');
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<Slot>('morning');

  useEffect(() => {
    store.list<Shift>('shifts').then(setShifts);
  }, [store]);

  const monday = mondayOf(week);

  async function addShift() {
    if (!person.trim()) return;
    const shift: Shift = { person: person.trim(), date: dateOf(monday, day), slot, swapRequested: false };
    const doc = await store.create('shifts', shift);
    setShifts((prev) => [...(prev ?? []), doc]);
    setPerson('');
  }

  async function toggleSwap(doc: StoreDoc<Shift>) {
    const updated = await store.update('shifts', doc.docId, { ...doc.data, swapRequested: !doc.data.swapRequested });
    setShifts((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function remove(docId: string) {
    await store.remove('shifts', docId);
    setShifts((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportWeek() {
    const weekShifts = (shifts ?? []).filter((s) => {
      const start = dateOf(monday, 0);
      const end = dateOf(monday, 6);
      return s.data.date >= start && s.data.date <= end;
    });
    const rows = weekShifts.map((s) => `${s.data.date},${s.data.slot},${s.data.person},${s.data.swapRequested ? 'swap requested' : ''}`);
    const csv = ['date,slot,person,flags', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-week-of-${dateOf(monday, 0)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (shifts === null) return <LoadingState />;

  const swapCount = shifts.filter((s) => s.data.swapRequested).length;

  return (
    <div className="module-card" data-testid="staff-scheduling-root">
      <Section title="Add a Shift">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Person</Label>
            <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Staff name" data-testid="shift-person-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Day</Label>
            <Select value={String(day)} onChange={(e) => setDay(Number(e.target.value))} data-testid="shift-day-select">
              {DAY_LABELS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Slot</Label>
            <Select value={slot} onChange={(e) => setSlot(e.target.value as Slot)} data-testid="shift-slot-select">
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={addShift} data-testid="add-shift-button">
            + Add Shift
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title={`Week of ${dateOf(monday, 0)}${swapCount ? ` · ${swapCount} swap request${swapCount > 1 ? 's' : ''}` : ''}`}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button variant="secondary" onClick={() => setWeek((w) => w - 1)} data-testid="prev-week-button" style={{ padding: '5px 12px', fontSize: 12 }}>
            ← Previous
          </Button>
          <Button variant="ghost" onClick={() => setWeek(0)} style={{ padding: '5px 12px', fontSize: 12 }}>
            This Week
          </Button>
          <Button variant="secondary" onClick={() => setWeek((w) => w + 1)} data-testid="next-week-button" style={{ padding: '5px 12px', fontSize: 12 }}>
            Next →
          </Button>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7, minmax(90px, 1fr))', gap: 4, minWidth: 720 }} data-testid="shift-grid">
            <div />
            {DAY_LABELS.map((d, i) => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', textAlign: 'center', padding: 4 }}>
                {d}
                <div style={{ fontWeight: 400 }}>{dateOf(monday, i).slice(5)}</div>
              </div>
            ))}
            {SLOTS.map((s) => (
              <>
                <div key={`label-${s}`} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center' }}>
                  {s === 'morning' ? '🌅' : '🌙'} {s}
                </div>
                {DAY_LABELS.map((_, dayIdx) => {
                  const cellDate = dateOf(monday, dayIdx);
                  const cellShifts = shifts.filter((sh) => sh.data.date === cellDate && sh.data.slot === s);
                  return (
                    <div
                      key={`${s}-${dayIdx}`}
                      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, minHeight: 44, padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}
                      data-testid={`cell-${dayIdx}-${s}`}
                    >
                      {cellShifts.map((sh) => (
                        <div
                          key={sh.docId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 6px',
                            borderRadius: 5,
                            background: sh.data.swapRequested ? 'rgba(255, 159, 10, 0.2)' : 'color-mix(in srgb, var(--module-accent) 18%, transparent)',
                            color: sh.data.swapRequested ? '#ff9f0a' : 'var(--module-accent)',
                          }}
                          data-testid="shift-chip"
                        >
                          <button onClick={() => toggleSwap(sh)} style={{ all: 'unset', cursor: 'pointer', flex: 1 }} title={sh.data.swapRequested ? 'Swap requested — click to clear' : 'Click to request swap'}>
                            {sh.data.swapRequested && '🔁 '}
                            {sh.data.person}
                          </button>
                          <button onClick={() => remove(sh.docId)} style={{ all: 'unset', cursor: 'pointer', opacity: 0.6 }} aria-label="Remove shift">
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>

        {shifts.length === 0 && <EmptyState icon="🗓️">No shifts scheduled — add the first one above.</EmptyState>}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportWeek}>
          Export This Week as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
