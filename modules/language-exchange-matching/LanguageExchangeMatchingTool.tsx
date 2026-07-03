import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Language Exchange Matching Tool — rank your partner pool by swap
// quality against your own speaks/learning pair (perfect swap = they
// speak what you're learning AND learn what you speak), and log practice
// sessions per partner. Scope note: discovering strangers to pair with
// is a cross-account matchmaking network — you manage the partner pool,
// the matching logic ranks it.

type Profile = { speaks: string; learning: string };
type Partner = { name: string; speaks: string; learning: string; timezone: string; minutes: number };
type Session = { partner: string; language: string; minutes: number; note: string };

type MatchQuality = 'perfect' | 'half' | 'none';

function matchQuality(you: Profile, p: Partner): MatchQuality {
  const theyTeachYou = p.speaks.toLowerCase() === you.learning.toLowerCase();
  const youTeachThem = p.learning.toLowerCase() === you.speaks.toLowerCase();
  if (theyTeachYou && youTeachThem) return 'perfect';
  if (theyTeachYou || youTeachThem) return 'half';
  return 'none';
}

const QUALITY_ORDER: Record<MatchQuality, number> = { perfect: 0, half: 1, none: 2 };
const QUALITY_LABELS: Record<MatchQuality, string> = { perfect: '🤝 Perfect Swap', half: '↪️ One-Way Match', none: 'No Overlap' };

export function LanguageExchangeMatchingTool({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [profile, setProfile] = useState<StoreDoc<Profile> | null | undefined>(undefined);
  const [partners, setPartners] = useState<StoreDoc<Partner>[] | null>(null);
  const [sessions, setSessions] = useState<StoreDoc<Session>[] | null>(null);
  const [speaks, setSpeaks] = useState('');
  const [learning, setLearning] = useState('');
  const [pName, setPName] = useState('');
  const [pSpeaks, setPSpeaks] = useState('');
  const [pLearning, setPLearning] = useState('');
  const [pTimezone, setPTimezone] = useState('');
  const [logMinutes, setLogMinutes] = useState<Record<string, string>>({});

  useEffect(() => {
    store.list<Profile>('profile').then((docs) => setProfile(docs[0] ?? null));
    store.list<Partner>('partners').then(setPartners);
    store.list<Session>('sessions').then(setSessions);
  }, [store]);

  const you = profile?.data ?? { speaks: '', learning: '' };
  const ranked = [...(partners ?? [])].sort((a, b) => QUALITY_ORDER[matchQuality(you, a.data)] - QUALITY_ORDER[matchQuality(you, b.data)] || b.data.minutes - a.data.minutes);
  const perfectCount = ranked.filter((p) => matchQuality(you, p.data) === 'perfect').length;
  const totalMinutes = (sessions ?? []).reduce((s, x) => s + x.data.minutes, 0);

  async function saveProfile() {
    if (!speaks.trim() || !learning.trim()) return;
    const data = { speaks: speaks.trim(), learning: learning.trim() };
    if (profile) {
      const updated = await store.update('profile', profile.docId, data);
      setProfile(updated);
    } else {
      const doc = await store.create('profile', data);
      setProfile(doc);
    }
    setSpeaks('');
    setLearning('');
  }

  async function addPartner() {
    if (!pName.trim() || !pSpeaks.trim()) return;
    const p: Partner = { name: pName.trim(), speaks: pSpeaks.trim(), learning: pLearning.trim() || '—', timezone: pTimezone.trim() || 'GMT', minutes: 0 };
    const doc = await store.create('partners', p);
    setPartners((prev) => [...(prev ?? []), doc]);
    setPName('');
    setPSpeaks('');
    setPLearning('');
    setPTimezone('');
  }

  async function removePartner(docId: string) {
    await store.remove('partners', docId);
    setPartners((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  async function logSession(doc: StoreDoc<Partner>) {
    const minutes = Math.round(Number(logMinutes[doc.docId]) || 0);
    if (minutes <= 0) return;
    const s = await store.create('sessions', { partner: doc.data.name, language: you.learning || doc.data.speaks, minutes, note: 'Conversation practice' });
    setSessions((prev) => [s, ...(prev ?? [])]);
    const updated = await store.update('partners', doc.docId, { ...doc.data, minutes: doc.data.minutes + minutes });
    setPartners((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
    setLogMinutes((prev) => ({ ...prev, [doc.docId]: '' }));
  }

  function exportLog() {
    const rows = (sessions ?? []).map((s) => `"${s.data.partner}",${s.data.language},${s.data.minutes},"${s.data.note}"`);
    const csv = ['partner,language,minutes,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'practice-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profile === undefined || partners === null || sessions === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="language-exchange-matching-root">
      <Section title="Your Exchange">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {profile ? (
            <Tag active data-testid="profile-tag">
              🗣️ You Speak {profile.data.speaks} · Learning {profile.data.learning}
            </Tag>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Set your languages so partners can be ranked:</span>
          )}
          <Input value={speaks} onChange={(e) => setSpeaks(e.target.value)} placeholder="You speak…" data-testid="speaks-input" style={{ width: 130 }} />
          <Input value={learning} onChange={(e) => setLearning(e.target.value)} placeholder="Learning…" data-testid="learning-input" style={{ width: 130 }} />
          <Button variant="secondary" onClick={saveProfile} data-testid="save-profile-button" style={{ padding: '6px 12px', fontSize: 12 }}>
            Save
          </Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={ranked.length} label="Partners in your pool" />
          <StatDisplay value={<span data-testid="perfect-count">{perfectCount}</span>} label="Perfect swaps" />
          <StatDisplay value={`${totalMinutes} min`} label="Practice logged" />
        </div>
      </Section>

      <Divider />

      <Section title="Ranked Matches">
        {ranked.length === 0 ? (
          <EmptyState icon="🌐">No partners yet — add people you've met below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="partners-list">
            {ranked.map((p) => {
              const q = matchQuality(you, p.data);
              return (
                <div key={p.docId} className="module-list-row" data-testid="partner-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        Speaks {p.data.speaks} · learning {p.data.learning} · {p.data.timezone}
                      </div>
                    </div>
                    <Tag active={q === 'perfect'} data-testid={`quality-${p.data.name}`}>
                      {QUALITY_LABELS[q]}
                    </Tag>
                    {p.data.minutes > 0 && <Tag>⏱️ {p.data.minutes} min</Tag>}
                    <IconButton label="Remove" onClick={() => removePartner(p.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                      type="number"
                      value={logMinutes[p.docId] ?? ''}
                      onChange={(e) => setLogMinutes((prev) => ({ ...prev, [p.docId]: e.target.value }))}
                      placeholder="Minutes"
                      data-testid={`minutes-input-${p.data.name}`}
                      style={{ width: 100 }}
                    />
                    <Button variant="secondary" onClick={() => logSession(p)} data-testid={`log-session-${p.data.name}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      ⏱️ Log Session
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 130 }}>
            <Label>Name</Label>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Sofia" data-testid="partner-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Speaks</Label>
            <Input value={pSpeaks} onChange={(e) => setPSpeaks(e.target.value)} placeholder="Spanish" data-testid="partner-speaks-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 120 }}>
            <Label>Learning</Label>
            <Input value={pLearning} onChange={(e) => setPLearning(e.target.value)} placeholder="English" data-testid="partner-learning-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Timezone</Label>
            <Input value={pTimezone} onChange={(e) => setPTimezone(e.target.value)} placeholder="GMT-3" data-testid="partner-timezone-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addPartner} data-testid="add-partner-button">
            + Add Partner
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Practice Log">
        {sessions.length === 0 ? (
          <EmptyState icon="⏱️">No sessions logged yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="sessions-list">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="session-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.partner}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{s.data.note}</span>
                </div>
                <Tag>{s.data.language}</Tag>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }}>{s.data.minutes} min</span>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          ⬇️ Export Practice Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
