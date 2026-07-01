import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import { Button, GatedAction, Input, Select, Label, Section, Divider, StatDisplay, EmptyState, LoadingState } from '@vault/module-ui';
import { UNITS, convert, type Category } from './units';

type HistoryEntry = { category: Category; value: number; from: string; to: string; result: number; at: string };

export function BasicUnitConverter({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [category, setCategory] = useState<Category>('length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState(UNITS.length[0]!);
  const [to, setTo] = useState(UNITS.length[1]!);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    store.list<HistoryEntry>('history').then((docs) => setHistory(docs.map((d) => d.data)));
  }, [store]);

  const units = UNITS[category];
  const parsed = Number(value);
  const result = Number.isFinite(parsed) ? convert(category, parsed, from, to) : null;

  function changeCategory(next: Category) {
    setCategory(next);
    setFrom(UNITS[next][0]!);
    setTo(UNITS[next][1]!);
  }

  async function saveToHistory() {
    if (result === null) return;
    const entry: HistoryEntry = { category, value: parsed, from, to, result, at: new Date().toISOString() };
    await store.create('history', entry);
    setHistory((prev) => [entry, ...(prev ?? [])]);
  }

  function exportCsv() {
    const rows = (history ?? []).map((h) => `${h.at},${h.category},${h.value},${h.from},${h.to},${h.result}`);
    const csv = ['date,category,value,from,to,result', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unit-conversion-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (history === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="unit-converter-root">
      <Section title="Convert">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['length', 'weight', 'temperature'] as Category[]).map((c) => (
            <Button
              key={c}
              variant="secondary"
              className={c === category ? 'active' : undefined}
              data-testid={`category-${c}`}
              onClick={() => changeCategory(c)}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              data-testid="value-input"
              style={{ width: 120 }}
            />
          </div>
          <div>
            <Label>From</Label>
            <Select value={from} onChange={(e) => setFrom(e.target.value)} data-testid="from-select">
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <span style={{ color: 'var(--color-text-dim)', paddingBottom: 10 }}>→</span>
          <div>
            <Label>To</Label>
            <Select value={to} onChange={(e) => setTo(e.target.value)} data-testid="to-select">
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <StatDisplay
          value={<span data-testid="result-value">{result === null ? '—' : result.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>}
          label={`${value || 0} ${from} = ? ${to}`}
        />

        <Button variant="primary" onClick={saveToHistory} disabled={result === null} data-testid="save-history-button">
          Save to History
        </Button>
      </Section>

      <Divider />

      <Section title="History">
        {history.length === 0 ? (
          <EmptyState icon="📐">No conversions saved yet — try one above.</EmptyState>
        ) : (
          <ul
            data-testid="history-list"
            style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {history.map((h, i) => (
              <li
                key={i}
                data-testid="history-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: 'var(--color-text-dim)',
                  padding: '8px 10px',
                  background: 'var(--color-bg)',
                  borderRadius: 8,
                }}
              >
                <span>
                  {h.value} {h.from} → {h.result.toLocaleString(undefined, { maximumFractionDigits: 4 })} {h.to}
                </span>
              </li>
            ))}
          </ul>
        )}
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCsv}>
          Export History as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
