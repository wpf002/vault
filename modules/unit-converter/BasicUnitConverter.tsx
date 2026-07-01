import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import { GatedAction, EmptyState, LoadingState } from '@vault/module-ui';
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
    <div className="card" data-testid="unit-converter-root" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['length', 'weight', 'temperature'] as Category[]).map((c) => (
          <button
            key={c}
            className={c === category ? 'primary' : undefined}
            data-testid={`category-${c}`}
            onClick={() => changeCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          data-testid="value-input"
          style={{ width: 100 }}
        />
        <select value={from} onChange={(e) => setFrom(e.target.value)} data-testid="from-select">
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span>→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} data-testid="to-select">
          {units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <strong data-testid="result-value">{result === null ? '—' : result.toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong>
      </div>

      <div>
        <button onClick={saveToHistory} disabled={result === null} data-testid="save-history-button">
          Save to history
        </button>
      </div>

      <div>
        <h4 style={{ marginBottom: 4 }}>History</h4>
        {history.length === 0 ? (
          <EmptyState>No conversions saved yet.</EmptyState>
        ) : (
          <ul data-testid="history-list" style={{ paddingLeft: 16, fontSize: 13, color: 'var(--color-text-dim)' }}>
            {history.map((h, i) => (
              <li key={i} data-testid="history-item">
                {h.value} {h.from} → {h.result.toLocaleString(undefined, { maximumFractionDigits: 4 })} {h.to}
              </li>
            ))}
          </ul>
        )}
        <GatedAction
          mode={mode}
          requestUpgrade={requestUpgrade}
          onAction={exportCsv}
          className="primary"
        >
          Export history as CSV
        </GatedAction>
      </div>
    </div>
  );
}
