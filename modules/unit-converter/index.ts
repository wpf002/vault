import { defineModule } from '@vault/module-sdk';
import { BasicUnitConverter } from './BasicUnitConverter';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'unit-converter',
  name: 'Basic Unit Converter',
  Component: BasicUnitConverter,
  seedPreview,
  // Overrides the 'utilities' category default (slate) — orange reads as
  // "calculator/tool" (same instinct behind Apple Calculator's accent).
  theme: { accent: '#ff9f0a' },
});
