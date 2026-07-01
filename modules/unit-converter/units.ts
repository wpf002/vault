export type Category = 'length' | 'weight' | 'temperature';

const LENGTH_TO_METERS: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const WEIGHT_TO_KG: Record<string, number> = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.0283495,
  lb: 0.45359237,
};

export const UNITS: Record<Category, string[]> = {
  length: Object.keys(LENGTH_TO_METERS),
  weight: Object.keys(WEIGHT_TO_KG),
  temperature: ['C', 'F', 'K'],
};

export function convert(category: Category, value: number, from: string, to: string): number {
  if (category === 'temperature') return convertTemperature(value, from, to);
  const table = category === 'length' ? LENGTH_TO_METERS : WEIGHT_TO_KG;
  const fromFactor = table[from];
  const toFactor = table[to];
  if (fromFactor === undefined || toFactor === undefined) throw new Error(`Unknown unit: ${from} -> ${to}`);
  return (value * fromFactor) / toFactor;
}

function convertTemperature(value: number, from: string, to: string): number {
  const celsius = from === 'C' ? value : from === 'F' ? ((value - 32) * 5) / 9 : value - 273.15;
  if (to === 'C') return celsius;
  if (to === 'F') return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}
