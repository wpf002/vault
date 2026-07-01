import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import {
  Button,
  GatedAction,
  Input,
  Select,
  Label,
  Section,
  Divider,
  SegmentedControl,
  StatDisplay,
  ListRow,
  EmptyState,
  LoadingState,
} from '@vault/module-ui';
import { UNITS, convert, type Category } from './units';

type HistoryEntry = { category: Category; value: number; from: string; to: string; result: number; at: string };

export function BasicUnitConverter({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [category, setCategory] = useState<Category>('length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState(UNITS.length[0]!);
  const [to, setTo] = useState(UNITS.length[1]!);
  const [history, setHistory] = useState<StoreDoc<HistoryEntry>[] | null>(null);

  useEffect(() => {
    store.list<HistoryEntry>('history').then(setHistory);
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
    const doc = await store.create('history', entry);
    setHistory((prev) => [doc, ...(prev ?? [])]);
  }

  async function removeFromHistory(docId: string) {
    await store.remove('history', docId);
    setHistory((prev) => (prev ?? []).filter((d) => d.docId !== docId));
  }

  function exportCsv() {
    const rows = (history ?? []).map((d) => `${d.data.at},${d.data.category},${d.data.value},${d.data.from},${d.data.to},${d.data.result}`);
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
        <div style={{ marginBottom: 16 }}>
          <SegmentedControl
            options={[
              { value: 'length', label: 'Length' },
              { value: 'weight', label: 'Weight' },
              { value: 'temperature', label: 'Temperature' },
            ]}
            value={category}
            onChange={changeCategory}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
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

        <div style={{ marginBottom: 16 }}>
          <StatDisplay
            value={<span data-testid="result-value">{result === null ? '—' : result.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>}
            label={`${value || 0} ${from} = ? ${to}`}
          />
        </div>

        <Button variant="primary" onClick={saveToHistory} disabled={result === null} data-testid="save-history-button">
          💾 Save to History
        </Button>
      </Section>

      <Divider />

      <Section title="History">
        {history.length === 0 ? (
          <EmptyState icon="📐">No conversions saved yet — try one above.</EmptyState>
        ) : (
          <div
            data-testid="history-list"
            style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}
          >
            {history.map((d) => (
              <div key={d.docId} data-testid="history-item">
                <ListRow onRemove={() => removeFromHistory(d.docId)}>
                  {d.data.value} {d.data.from} → {d.data.result.toLocaleString(undefined, { maximumFractionDigits: 4 })} {d.data.to}
                </ListRow>
              </div>
            ))}
          </div>
        )}
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCsv}>
          ⬇️ Export History as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
