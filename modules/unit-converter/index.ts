import { defineModule } from '@vault/module-sdk';
import { BasicUnitConverter } from './BasicUnitConverter';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'unit-converter',
  name: 'Basic Unit Converter',
  Component: BasicUnitConverter,
  seedPreview,
});
