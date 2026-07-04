import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Hybrid Event Planning & Execution Platform — one run-of-show where
// every session is tagged in-person / virtual / hybrid (with both seat
// pools), plus a production checklist split across the venue track and
// the broadcast track — the two workstreams a hybrid event actually
// has. Scope note: streaming/registration are third-party platforms;
// the dual-track planning surface is the substance.

type EventInfo = { name: string; date: string; venue: string; virtualLink: string };
type SessionItem = { title: string; time: string; format: 'in_person' | 'virtual' | 'hybrid'; speaker: string; inPersonSeats: number; virtualSeats: number };
type Task = { task: string; track: 'venue' | 'broadcast' | 'both'; done: boolean };

const FORMAT_META: Record<SessionItem['format'], { icon: string; label: string }> = {
  in_person: { icon: '🏟️', label: 'In-Person' },
  virtual: { icon: '📡', label: 'Virtual' },
  hybrid: { icon: '🎭', label: 'Hybrid' },
};

const TRACK_META: Record<Task['track'], { icon: string; label: string }> = {
  venue: { icon: '🏟️', label: 'Venue Track' },
  broadcast: { icon: '📡', label: 'Broadcast Track' },
  both: { icon: '🎭', label: 'Both Tracks' },
};

function daysUntil(date: string): number {
  return Math.ceil((Date.parse(date) - Date.now()) / 86400000);
}

export function HybridEventPlanningExecutionPlatform({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [event, setEvent] = useState<StoreDoc<EventInfo> | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StoreDoc<SessionItem>[] | null>(null);
  const [tasks, setTasks] = useState<StoreDoc<Task>[] | null>(null);
  const [eventDraft, setEventDraft] = useState<EventInfo>({ name: '', date: '', venue: '', virtualLink: '' });
  const [editingEvent, setEditingEvent] = useState(false);
  const [sTitle, setSTitle] = useState('');
  const [sTime, setSTime] = useState('');
  const [sFormat, setSFormat] = useState<SessionItem['format']>('hybrid');
  const [sSpeaker, setSSpeaker] = useState('');
  const [tTask, setTTask] = useState('');
  const [tTrack, setTTrack] = useState<Task['track']>('venue');

  useEffect(() => {
    store.list<EventInfo>('event').then((docs) => setEvent(docs[0] ?? null));
    store.list<SessionItem>('sessions').then(setSessions);
    store.list<Task>('tasks').then(setTasks);
  }, [store]);

  const sessionList = [...(sessions ?? [])].sort((a, b) => a.data.time.localeCompare(b.data.time));
  const taskList = tasks ?? [];
  const doneCount = taskList.filter((t) => t.data.done).length;
  const hybridCount = sessionList.filter((s) => s.data.format === 'hybrid').length;

  async function saveEvent() {
    if (!eventDraft.name.trim()) return;
    if (event) {
      const updated = await store.update('event', event.docId, eventDraft);
      setEvent(updated);
    } else {
      const doc = await store.create('event', eventDraft);
      setEvent(doc);
    }
    setEditingEvent(false);
  }

  async function addSession() {
    if (!sTitle.trim() || !sTime) return;
    const s: SessionItem = {
      title: sTitle.trim(),
      time: sTime,
      format: sFormat,
      speaker: sSpeaker.trim() || 'TBD',
      inPersonSeats: sFormat === 'virtual' ? 0 : 100,
      virtualSeats: sFormat === 'in_person' ? 0 : 1000,
    };
    const doc = await store.create('sessions', s);
    setSessions((prev) => [...(prev ?? []), doc]);
    setSTitle('');
    setSTime('');
    setSSpeaker('');
  }

  async function removeSession(docId: string) {
    await store.remove('sessions', docId);
    setSessions((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  async function addTask() {
    if (!tTask.trim()) return;
    const doc = await store.create('tasks', { task: tTask.trim(), track: tTrack, done: false });
    setTasks((prev) => [...(prev ?? []), doc]);
    setTTask('');
  }

  async function toggleTask(doc: StoreDoc<Task>) {
    const updated = await store.update('tasks', doc.docId, { ...doc.data, done: !doc.data.done });
    setTasks((prev) => (prev ?? []).map((t) => (t.docId === doc.docId ? updated : t)));
  }

  async function removeTask(docId: string) {
    await store.remove('tasks', docId);
    setTasks((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportRunOfShow() {
    if (!event) return;
    const sessionLines = sessionList.map((s) => `| ${s.data.time} | ${s.data.title} | ${FORMAT_META[s.data.format].label} | ${s.data.speaker} |`);
    const taskLines = taskList.map((t) => `- [${t.data.done ? 'x' : ' '}] ${TRACK_META[t.data.track].icon} ${t.data.task}`);
    const md = [
      `# ${event.data.name} — Run of Show`,
      '',
      `**${event.data.date}** · ${event.data.venue} · 📡 ${event.data.virtualLink}`,
      '',
      '| Time | Session | Format | Speaker |',
      '| --- | --- | --- | --- |',
      ...sessionLines,
      '',
      '## Production Checklist',
      ...taskLines,
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'run-of-show.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (event === undefined || sessions === null || tasks === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="hybrid-event-planning-root">
      <Section title="The Event">
        {event && !editingEvent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }} data-testid="event-header">
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{event.data.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                {event.data.date} · 🏟️ {event.data.venue} · 📡 {event.data.virtualLink}
              </div>
            </div>
            <Tag active>⏳ {daysUntil(event.data.date)} days out</Tag>
            <Button variant="ghost" onClick={() => { setEventDraft(event.data); setEditingEvent(true); }} data-testid="edit-event-button" style={{ padding: '5px 10px', fontSize: 12 }}>
              Edit
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }} data-testid="event-editor">
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Event</Label>
              <Input value={eventDraft.name} onChange={(e) => setEventDraft({ ...eventDraft, name: e.target.value })} placeholder="e.g. Customer Summit" data-testid="event-name-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 140 }}>
              <Label>Date</Label>
              <Input type="date" value={eventDraft.date} onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })} data-testid="event-date-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 150 }}>
              <Label>Venue</Label>
              <Input value={eventDraft.venue} onChange={(e) => setEventDraft({ ...eventDraft, venue: e.target.value })} placeholder="Physical venue" data-testid="event-venue-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 180 }}>
              <Label>Stream Link</Label>
              <Input value={eventDraft.virtualLink} onChange={(e) => setEventDraft({ ...eventDraft, virtualLink: e.target.value })} placeholder="stream URL" data-testid="event-link-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={saveEvent} data-testid="save-event-button">
              Save
            </Button>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={sessionList.length} label={`Sessions · ${hybridCount} hybrid`} />
          <StatDisplay value={<span data-testid="checklist-progress">{`${doneCount} / ${taskList.length}`}</span>} label="Production tasks done" />
          <StatDisplay value={event ? `${daysUntil(event.data.date)}` : '—'} label="Days to showtime" />
        </div>
      </Section>

      <Divider />

      <Section title="Run of Show">
        {sessionList.length === 0 ? (
          <EmptyState icon="🎭">No sessions — build the agenda below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="sessions-list">
            {sessionList.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="session-item" style={{ alignItems: 'center' }}>
                <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 48 }}>{s.data.time}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {s.data.speaker}
                    {s.data.inPersonSeats > 0 && ` · 🏟️ ${s.data.inPersonSeats} seats`}
                    {s.data.virtualSeats > 0 && ` · 📡 ${s.data.virtualSeats} stream cap`}
                  </div>
                </div>
                <Tag active={s.data.format === 'hybrid'} data-testid={`format-${s.docId}`}>
                  {FORMAT_META[s.data.format].icon} {FORMAT_META[s.data.format].label}
                </Tag>
                <IconButton label="Remove" onClick={() => removeSession(s.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Session</Label>
            <Input value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="e.g. Closing Panel" data-testid="session-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Time</Label>
            <Input type="time" value={sTime} onChange={(e) => setSTime(e.target.value)} data-testid="session-time-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Format</Label>
            <Select value={sFormat} onChange={(e) => setSFormat(e.target.value as SessionItem['format'])} data-testid="format-select" style={{ width: '100%' }}>
              <option value="hybrid">Hybrid</option>
              <option value="in_person">In-Person</option>
              <option value="virtual">Virtual</option>
            </Select>
          </div>
          <div style={{ width: 150 }}>
            <Label>Speaker</Label>
            <Input value={sSpeaker} onChange={(e) => setSSpeaker(e.target.value)} placeholder="Who's on" data-testid="session-speaker-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addSession} data-testid="add-session-button">
            + Add Session
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Production Checklist">
        {taskList.length === 0 ? (
          <EmptyState icon="✅">No tasks — split the work below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }} data-testid="tasks-board">
            {(Object.keys(TRACK_META) as Task['track'][]).map((track) => {
              const trackTasks = taskList.filter((t) => t.data.track === track);
              if (trackTasks.length === 0) return null;
              return (
                <div key={track} data-testid={`track-${track}`}>
                  <Label>
                    {TRACK_META[track].icon} {TRACK_META[track].label} ({trackTasks.filter((t) => t.data.done).length}/{trackTasks.length})
                  </Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {trackTasks.map((t) => (
                      <div key={t.docId} className="module-list-row" data-testid="task-item" style={{ alignItems: 'center', opacity: t.data.done ? 0.6 : 1 }}>
                        <Tag active={t.data.done} onClick={() => toggleTask(t)} data-testid={`toggle-${t.docId}`}>
                          {t.data.done ? '✓' : '○'}
                        </Tag>
                        <div className="module-list-row-content" style={{ flex: 1 }}>
                          <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: t.data.done ? 'line-through' : 'none' }}>{t.data.task}</span>
                        </div>
                        <IconButton label="Remove" onClick={() => removeTask(t.docId)}>
                          ✕
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Label>Task</Label>
            <Input value={tTask} onChange={(e) => setTTask(e.target.value)} placeholder="e.g. Mic check both rooms" data-testid="task-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Track</Label>
            <Select value={tTrack} onChange={(e) => setTTrack(e.target.value as Task['track'])} data-testid="track-select" style={{ width: '100%' }}>
              <option value="venue">Venue</option>
              <option value="broadcast">Broadcast</option>
              <option value="both">Both</option>
            </Select>
          </div>
          <Button variant="primary" onClick={addTask} data-testid="add-task-button">
            + Add Task
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportRunOfShow}>
          Export Run of Show as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
