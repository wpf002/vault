import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Remote Job Board for a Specific Skill Set — niche postings with tags and
// featured pins. Board-owner side: you curate postings for your niche;
// featured postings pin to the top. Public applicant-facing pages are
// platform-level work.

type Posting = { title: string; company: string; salary: string; tags: string[]; featured: boolean; status: 'open' | 'filled' };

export function RemoteJobBoardForASpecificSkillSet({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [postings, setPostings] = useState<StoreDoc<Posting>[] | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [salary, setSalary] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    store.list<Posting>('postings').then(setPostings);
  }, [store]);

  const allTags = useMemo(() => Array.from(new Set((postings ?? []).flatMap((p) => p.data.tags))).sort(), [postings]);
  const visible = (postings ?? [])
    .filter((p) => !activeTag || p.data.tags.includes(activeTag))
    .sort((a, b) => Number(b.data.featured) - Number(a.data.featured) || Number(a.data.status === 'filled') - Number(b.data.status === 'filled'));
  const openCount = (postings ?? []).filter((p) => p.data.status === 'open').length;

  async function addPosting() {
    if (!title.trim() || !company.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    const p: Posting = { title: title.trim(), company: company.trim(), salary: salary.trim() || '—', tags, featured: false, status: 'open' };
    const doc = await store.create('postings', p);
    setPostings((prev) => [...(prev ?? []), doc]);
    setTitle('');
    setCompany('');
    setSalary('');
    setTagsInput('');
  }

  async function toggleFeatured(doc: StoreDoc<Posting>) {
    const updated = await store.update('postings', doc.docId, { ...doc.data, featured: !doc.data.featured });
    setPostings((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function toggleFilled(doc: StoreDoc<Posting>) {
    const next: Posting = { ...doc.data, status: doc.data.status === 'open' ? 'filled' : 'open' };
    const updated = await store.update('postings', doc.docId, next);
    setPostings((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function remove(docId: string) {
    await store.remove('postings', docId);
    setPostings((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportBoard() {
    const rows = (postings ?? []).map((p) => `"${p.data.title}","${p.data.company}","${p.data.salary}","${p.data.tags.join(' ')}",${p.data.status}${p.data.featured ? ',featured' : ','}`);
    const csv = ['title,company,salary,tags,status,flags', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'job-board.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (postings === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="remote-job-board-root">
      <Section title={`Postings (${openCount} open)`}>
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={activeTag === null} onClick={() => setActiveTag(null)}>
              All
            </Tag>
            {allTags.map((t) => (
              <Tag key={t} active={activeTag === t} onClick={() => setActiveTag(t)}>
                #{t}
              </Tag>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="💻">No postings {activeTag ? 'match this tag' : 'yet — add the first one below'}.</EmptyState>
        ) : (
          <div data-testid="postings-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((p) => (
              <div
                key={p.docId}
                className="module-list-row"
                data-testid="posting-item"
                style={{
                  alignItems: 'center',
                  opacity: p.data.status === 'filled' ? 0.55 : 1,
                  border: p.data.featured ? '1px solid var(--module-accent)' : undefined,
                }}
              >
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                    {p.data.featured && '📌 '}
                    {p.data.title}
                    {p.data.status === 'filled' && ' (Filled)'}
                  </span>
                  <div style={{ fontSize: 12, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{p.data.company}</span>
                    <span style={{ color: 'var(--module-accent)', fontWeight: 700 }}>{p.data.salary}</span>
                    {p.data.tags.map((t) => (
                      <Tag key={t}>#{t}</Tag>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" onClick={() => toggleFeatured(p)} data-testid={`feature-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {p.data.featured ? 'Unpin' : 'Feature'}
                </Button>
                <Button variant={p.data.status === 'open' ? 'secondary' : 'primary'} onClick={() => toggleFilled(p)} data-testid={`fill-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                  {p.data.status === 'open' ? 'Mark Filled' : 'Reopen'}
                </Button>
                <IconButton label="Remove" onClick={() => remove(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBoard}>
          Export Board as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Post a Job">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Rust Engineer" data-testid="posting-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" data-testid="posting-company-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Salary</Label>
            <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="$150k–$180k" data-testid="posting-salary-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Tags (Comma Separated)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="rust, backend" data-testid="posting-tags-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addPosting} data-testid="add-posting-button">
            + Post
          </Button>
        </div>
      </Section>
    </div>
  );
}
