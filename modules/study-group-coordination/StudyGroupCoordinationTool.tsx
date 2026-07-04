import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Study Group Coordination Tool — the group's session calendar, member
// roster with study focus, RSVP toggles per session, and a shared
// resource list. Scope note: a true multi-account shared calendar needs
// cross-account infra the platform's per-user store doesn't have — this
// is the coordinator's copy: you keep the roster, schedule, and RSVPs.

type Member = { name: string; focus: string };
type Session = { topic: string; date: string; time: string; location: string; attending: string[] };
type Resource = { title: string; kind: string; sharedBy: string };

function daysUntil(date: string): number {
  return Math.ceil((Date.parse(date) - Date.now()) / 86400000);
}

export function StudyGroupCoordinationTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [members, setMembers] = useState<StoreDoc<Member>[] | null>(null);
  const [sessions, setSessions] = useState<StoreDoc<Session>[] | null>(null);
  const [resources, setResources] = useState<StoreDoc<Resource>[] | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberFocus, setMemberFocus] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resKind, setResKind] = useState('Link');
  const [resBy, setResBy] = useState('');

  useEffect(() => {
    store.list<Member>('members').then(setMembers);
    store.list<Session>('sessions').then(setSessions);
    store.list<Resource>('resources').then(setResources);
  }, [store]);

  const memberList = members ?? [];
  const sessionList = [...(sessions ?? [])].sort((a, b) => a.data.date.localeCompare(b.data.date));
  const upcoming = sessionList.filter((s) => daysUntil(s.data.date) >= 0);
  const nextSession = upcoming[0];

  async function addMember() {
    if (!memberName.trim()) return;
    const doc = await store.create('members', { name: memberName.trim(), focus: memberFocus.trim() || 'General review' });
    setMembers((prev) => [...(prev ?? []), doc]);
    setMemberName('');
    setMemberFocus('');
  }

  async function removeMember(docId: string) {
    await store.remove('members', docId);
    setMembers((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  async function addSession() {
    if (!topic.trim() || !date) return;
    const s: Session = { topic: topic.trim(), date, time: time || '18:00', location: location.trim() || 'TBD', attending: [] };
    const doc = await store.create('sessions', s);
    setSessions((prev) => [...(prev ?? []), doc]);
    setTopic('');
    setDate('');
    setTime('');
    setLocation('');
  }

  async function toggleRsvp(doc: StoreDoc<Session>, name: string) {
    const attending = doc.data.attending.includes(name) ? doc.data.attending.filter((n) => n !== name) : [...doc.data.attending, name];
    const updated = await store.update('sessions', doc.docId, { ...doc.data, attending });
    setSessions((prev) => (prev ?? []).map((s) => (s.docId === doc.docId ? updated : s)));
  }

  async function removeSession(docId: string) {
    await store.remove('sessions', docId);
    setSessions((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  async function addResource() {
    if (!resTitle.trim()) return;
    const doc = await store.create('resources', { title: resTitle.trim(), kind: resKind, sharedBy: resBy.trim() || 'You' });
    setResources((prev) => [...(prev ?? []), doc]);
    setResTitle('');
    setResBy('');
  }

  async function removeResource(docId: string) {
    await store.remove('resources', docId);
    setResources((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  function exportSchedule() {
    const lines = sessionList.map((s) => `- ${s.data.date} ${s.data.time} · ${s.data.topic} @ ${s.data.location} (${s.data.attending.length} attending: ${s.data.attending.join(', ') || 'no RSVPs yet'})`);
    const md = ['# Study Group Schedule', '', ...lines, '', '## Resources', ...(resources ?? []).map((r) => `- [${r.data.kind}] ${r.data.title} — shared by ${r.data.sharedBy}`)].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-group-schedule.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (members === null || sessions === null || resources === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="study-group-coordination-root">
      <Section title="Group Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={memberList.length} label="Members in the group" />
          <StatDisplay value={<span data-testid="upcoming-count">{upcoming.length}</span>} label="Upcoming sessions" />
          <StatDisplay value={nextSession ? `${daysUntil(nextSession.data.date)} days` : '—'} label="Until next session" />
        </div>
      </Section>

      <Divider />

      <Section title="Session Calendar">
        {sessionList.length === 0 ? (
          <EmptyState icon="📅">No sessions scheduled — plan one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="sessions-list">
            {sessionList.map((s) => {
              const d = daysUntil(s.data.date);
              return (
                <div key={s.docId} className="module-list-row" data-testid="session-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.topic}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        {s.data.date} at {s.data.time} · {s.data.location}
                      </div>
                    </div>
                    {d >= 0 ? <Tag active={d <= 3}>{d === 0 ? '📌 Today' : `In ${d} days`}</Tag> : <Tag>Past</Tag>}
                    <IconButton label="Remove" onClick={() => removeSession(s.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  {memberList.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>RSVP:</span>
                      {memberList.map((m) => (
                        <Tag key={m.docId} active={s.data.attending.includes(m.data.name)} onClick={() => toggleRsvp(s, m.data.name)}>
                          {s.data.attending.includes(m.data.name) ? '✓ ' : ''}
                          {m.data.name}
                        </Tag>
                      ))}
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)', marginLeft: 'auto' }} data-testid={`attending-${s.docId}`}>
                        {s.data.attending.length} attending
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Chapter 12 Problem Set" data-testid="topic-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="date-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="time-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Library 204" data-testid="location-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addSession} data-testid="add-session-button">
            + Schedule
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Members">
        {memberList.length === 0 ? (
          <EmptyState icon="👥">No members yet — add your group below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="members-list">
            {memberList.map((m) => (
              <div key={m.docId} className="module-list-row" data-testid="member-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{m.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{m.data.focus}</span>
                </div>
                <IconButton label="Remove" onClick={() => removeMember(m.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 150 }}>
            <Label>Name</Label>
            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. Sam" data-testid="member-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Study Focus</Label>
            <Input value={memberFocus} onChange={(e) => setMemberFocus(e.target.value)} placeholder="e.g. Proof techniques" data-testid="member-focus-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMember} data-testid="add-member-button">
            + Add Member
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Shared Resources">
        {resources.length === 0 ? (
          <EmptyState icon="📚">No resources shared yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="resources-list">
            {resources.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="resource-item" style={{ alignItems: 'center' }}>
                <Tag>{r.data.kind}</Tag>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.title}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>shared by {r.data.sharedBy}</span>
                </div>
                <IconButton label="Remove" onClick={() => removeResource(r.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Resource</Label>
            <Input value={resTitle} onChange={(e) => setResTitle(e.target.value)} placeholder="e.g. Chapter summaries doc" data-testid="resource-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Type</Label>
            <Select value={resKind} onChange={(e) => setResKind(e.target.value)} data-testid="resource-kind-select" style={{ width: '100%' }}>
              <option value="Link">Link</option>
              <option value="PDF">PDF</option>
              <option value="Doc">Doc</option>
              <option value="Video">Video</option>
            </Select>
          </div>
          <div style={{ width: 130 }}>
            <Label>Shared By</Label>
            <Input value={resBy} onChange={(e) => setResBy(e.target.value)} placeholder="You" data-testid="resource-by-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addResource} data-testid="add-resource-button">
            + Share
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSchedule}>
          Export Schedule as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
