import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Study Group Organizer — run several focused groups at once (vs. the
// single-group calendar in study-group-coordination): each group has a
// subject, cadence, optional mentor from your mentor directory, and a
// per-group discussion board. Scope note: live chat and mentor discovery
// are cross-account/realtime infra — the board is your group's message
// log, and mentors are people you already know.

type Group = { name: string; subject: string; cadence: string; mentor: string; focus: string };
type Mentor = { name: string; expertise: string; contact: string };
type Post = { group: string; author: string; message: string };

export function StudyGroupOrganizer({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [groups, setGroups] = useState<StoreDoc<Group>[] | null>(null);
  const [mentors, setMentors] = useState<StoreDoc<Mentor>[] | null>(null);
  const [posts, setPosts] = useState<StoreDoc<Post>[] | null>(null);
  const [activeGroup, setActiveGroup] = useState('');
  const [gName, setGName] = useState('');
  const [gSubject, setGSubject] = useState('');
  const [gCadence, setGCadence] = useState('');
  const [gFocus, setGFocus] = useState('');
  const [mName, setMName] = useState('');
  const [mExpertise, setMExpertise] = useState('');
  const [mContact, setMContact] = useState('');
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('You');

  useEffect(() => {
    store.list<Group>('groups').then((docs) => {
      setGroups(docs);
      if (docs[0]) setActiveGroup(docs[0].data.name);
    });
    store.list<Mentor>('mentors').then(setMentors);
    store.list<Post>('posts').then(setPosts);
  }, [store]);

  const groupList = groups ?? [];
  const mentorList = mentors ?? [];
  const activePosts = (posts ?? []).filter((p) => p.data.group === activeGroup);

  async function addGroup() {
    if (!gName.trim()) return;
    const g: Group = { name: gName.trim(), subject: gSubject.trim() || 'General', cadence: gCadence.trim() || 'Weekly', mentor: '', focus: gFocus.trim() };
    const doc = await store.create('groups', g);
    setGroups((prev) => [...(prev ?? []), doc]);
    if (!activeGroup) setActiveGroup(g.name);
    setGName('');
    setGSubject('');
    setGCadence('');
    setGFocus('');
  }

  async function assignMentor(doc: StoreDoc<Group>, mentor: string) {
    const updated = await store.update('groups', doc.docId, { ...doc.data, mentor });
    setGroups((prev) => (prev ?? []).map((g) => (g.docId === doc.docId ? updated : g)));
  }

  async function removeGroup(doc: StoreDoc<Group>) {
    await store.remove('groups', doc.docId);
    setGroups((prev) => {
      const next = (prev ?? []).filter((g) => g.docId !== doc.docId);
      if (activeGroup === doc.data.name) setActiveGroup(next[0]?.data.name ?? '');
      return next;
    });
  }

  async function addMentor() {
    if (!mName.trim()) return;
    const doc = await store.create('mentors', { name: mName.trim(), expertise: mExpertise.trim() || '—', contact: mContact.trim() || '—' });
    setMentors((prev) => [...(prev ?? []), doc]);
    setMName('');
    setMExpertise('');
    setMContact('');
  }

  async function removeMentor(docId: string) {
    await store.remove('mentors', docId);
    setMentors((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  async function postMessage() {
    if (!message.trim() || !activeGroup) return;
    const doc = await store.create('posts', { group: activeGroup, author: author.trim() || 'You', message: message.trim() });
    setPosts((prev) => [...(prev ?? []), doc]);
    setMessage('');
  }

  async function removePost(docId: string) {
    await store.remove('posts', docId);
    setPosts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportBoard() {
    const lines = groupList.map((g) => {
      const groupPosts = (posts ?? []).filter((p) => p.data.group === g.data.name);
      return [`## ${g.data.name} (${g.data.subject} · ${g.data.cadence})`, g.data.mentor ? `Mentor: ${g.data.mentor}` : '', '', ...groupPosts.map((p) => `- **${p.data.author}:** ${p.data.message}`)].filter(Boolean).join('\n');
    });
    const md = ['# Study Groups', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-groups.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (groups === null || mentors === null || posts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="study-group-organizer-root">
      <Section title="Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={groupList.length} label="Active groups" />
          <StatDisplay value={mentorList.length} label="Mentors on call" />
          <StatDisplay value={<span data-testid="post-count">{(posts ?? []).length}</span>} label="Board messages" />
        </div>
      </Section>

      <Divider />

      <Section title="Groups">
        {groupList.length === 0 ? (
          <EmptyState icon="🧑‍🤝‍🧑">No groups yet — organize your first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="groups-list">
            {groupList.map((g) => (
              <div key={g.docId} className="module-list-row" data-testid="group-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{g.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {g.data.subject} · {g.data.cadence}
                    {g.data.focus ? ` · ${g.data.focus}` : ''}
                  </div>
                </div>
                <Select
                  value={g.data.mentor}
                  onChange={(e) => assignMentor(g, e.target.value)}
                  data-testid={`mentor-select-${g.docId}`}
                  style={{ fontSize: 12, padding: '4px 24px 4px 8px', maxWidth: 160 }}
                >
                  <option value="">No Mentor</option>
                  {mentorList.map((m) => (
                    <option key={m.docId} value={m.data.name}>
                      {m.data.name}
                    </option>
                  ))}
                </Select>
                <IconButton label="Remove" onClick={() => removeGroup(g)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Group Name</Label>
            <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="e.g. Physics Finals Sprint" data-testid="group-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Subject</Label>
            <Input value={gSubject} onChange={(e) => setGSubject(e.target.value)} placeholder="Physics" data-testid="group-subject-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Cadence</Label>
            <Input value={gCadence} onChange={(e) => setGCadence(e.target.value)} placeholder="Wednesdays 6pm" data-testid="group-cadence-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Focus</Label>
            <Input value={gFocus} onChange={(e) => setGFocus(e.target.value)} placeholder="What this group is for" data-testid="group-focus-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addGroup} data-testid="add-group-button">
            + Organize
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Discussion Board">
        {groupList.length === 0 ? (
          <EmptyState icon="💬">Create a group to open its board.</EmptyState>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {groupList.map((g) => (
                <Tag key={g.docId} active={activeGroup === g.data.name} onClick={() => setActiveGroup(g.data.name)}>
                  {g.data.name}
                </Tag>
              ))}
            </div>
            {activePosts.length === 0 ? (
              <EmptyState icon="💬">No messages on this board yet.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} data-testid="board-posts">
                {activePosts.map((p) => (
                  <div key={p.docId} className="module-list-row" data-testid="post-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--module-accent)', fontWeight: 700, fontSize: 12 }}>{p.data.author}</span>
                      <div style={{ fontSize: 13, marginTop: 2, color: 'var(--color-text)' }}>{p.data.message}</div>
                    </div>
                    <IconButton label="Remove" onClick={() => removePost(p.docId)}>
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ width: 110 }}>
                <Label>From</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} data-testid="author-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Label>Message</Label>
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Post to the board…" data-testid="message-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={postMessage} data-testid="post-button">
                Post
              </Button>
            </div>
          </>
        )}
      </Section>

      <Divider />

      <Section title="Mentor Directory">
        {mentorList.length === 0 ? (
          <EmptyState icon="🧑‍🏫">No mentors yet — add people who can help.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="mentors-list">
            {mentorList.map((m) => (
              <div key={m.docId} className="module-list-row" data-testid="mentor-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{m.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{m.data.expertise}</span>
                </div>
                <Tag>📫 {m.data.contact}</Tag>
                <IconButton label="Remove" onClick={() => removeMentor(m.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 130 }}>
            <Label>Name</Label>
            <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. Dr. Chen" data-testid="mentor-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Expertise</Label>
            <Input value={mExpertise} onChange={(e) => setMExpertise(e.target.value)} placeholder="e.g. Linear Algebra TA" data-testid="mentor-expertise-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 160 }}>
            <Label>Contact</Label>
            <Input value={mContact} onChange={(e) => setMContact(e.target.value)} placeholder="e.g. office hours Fri" data-testid="mentor-contact-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addMentor} data-testid="add-mentor-button">
            + Add Mentor
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          Export Groups & Boards as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
