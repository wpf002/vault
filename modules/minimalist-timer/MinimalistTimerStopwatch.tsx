import { useEffect, useRef, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, Input, Label, Section, Divider, SegmentedControl, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

type Preset = { name: string; seconds: number };
type Mode = 'timer' | 'stopwatch';

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60)
    .toString()
    .padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

// A short beep on completion — no external asset, just a Web Audio oscillator.
function beep() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  osc.frequency.value = 880;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
  osc.onended = () => ctx.close();
}

export function MinimalistTimerStopwatch({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [tab, setTab] = useState<Mode>('timer');
  const [presets, setPresets] = useState<StoreDoc<Preset>[] | null>(null);
  const [presetName, setPresetName] = useState('');

  // Pure client state — the running timer/stopwatch never touches the
  // store at all (this is the flagship that proves the pipeline handles a
  // no-persistence module); only saved presets go through the store.
  const [durationInput, setDurationInput] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    store.list<Preset>('presets').then(setPresets);
  }, [store]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      if (tab === 'timer') {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            setFinished(true);
            beep();
            return 0;
          }
          return r - 1;
        });
      } else {
        setElapsed((e) => e + 1);
      }
    }, 1000);
    return () => clearInterval(tickRef.current!);
  }, [running, tab]);

  function start() {
    setFinished(false);
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setFinished(false);
    setRemaining(durationInput * 60);
    setElapsed(0);
  }

  function loadPreset(seconds: number) {
    setRunning(false);
    setFinished(false);
    setDurationInput(Math.round(seconds / 60));
    setRemaining(seconds);
  }

  async function savePreset() {
    if (!presetName.trim()) return;
    const preset: Preset = { name: presetName.trim(), seconds: durationInput * 60 };
    const doc = await store.create('presets', preset);
    setPresets((prev) => [...(prev ?? []), doc]);
    setPresetName('');
  }

  async function removePreset(docId: string) {
    await store.remove('presets', docId);
    setPresets((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportPresets() {
    const json = JSON.stringify((presets ?? []).map((p) => p.data), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timer-presets.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (presets === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="minimalist-timer-root">
      <Section title={tab === 'timer' ? 'Timer' : 'Stopwatch'}>
        <div style={{ marginBottom: 16 }}>
          <SegmentedControl
            options={[
              { value: 'timer', label: 'Timer' },
              { value: 'stopwatch', label: 'Stopwatch' },
            ]}
            value={tab}
            onChange={(v) => {
              setTab(v);
              setRunning(false);
              setFinished(false);
            }}
          />
        </div>

        {tab === 'timer' && (
          <div style={{ marginBottom: 16 }}>
            <Label>Minutes</Label>
            <Input
              type="number"
              min={1}
              value={durationInput}
              disabled={running}
              onChange={(e) => {
                const mins = Number(e.target.value) || 1;
                setDurationInput(mins);
                setRemaining(mins * 60);
              }}
              data-testid="duration-input"
              style={{ width: 90 }}
            />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <StatDisplay
            value={<span data-testid="clock-value">{formatTime(tab === 'timer' ? remaining : elapsed)}</span>}
            label={finished ? "Time's up!" : running ? 'Running…' : 'Paused'}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {running ? (
            <Button variant="secondary" onClick={pause} data-testid="pause-button">
              Pause
            </Button>
          ) : (
            <Button variant="primary" onClick={start} data-testid="start-button">
              Start
            </Button>
          )}
          <Button variant="ghost" onClick={reset} data-testid="reset-button">
            ↺ Reset
          </Button>
        </div>
      </Section>

      {tab === 'timer' && (
        <>
          <Divider />
          <Section title="Presets">
            {presets.length === 0 ? (
              <EmptyState icon="⏱️">No saved presets yet.</EmptyState>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }} data-testid="presets-list">
                {presets.map((p) => (
                  <Tag key={p.docId} onClick={() => loadPreset(p.data.seconds)}>
                    {p.data.name} · {formatTime(p.data.seconds)}
                  </Tag>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <Label>Save Current Duration As</Label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g. Deep Work"
                  data-testid="preset-name-input"
                  style={{ width: '100%' }}
                />
              </div>
              <Button variant="primary" onClick={savePreset} data-testid="save-preset-button">
                Save
              </Button>
            </div>

            {presets.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {presets.map((p) => (
                  <Button key={p.docId} variant="ghost" onClick={() => removePreset(p.docId)}>
                    ✕ {p.data.name}
                  </Button>
                ))}
              </div>
            )}

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPresets}>
              Export Presets as JSON
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
