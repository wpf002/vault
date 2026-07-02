import { defineModule } from '@vault/module-sdk';
import { MinimalistTimerStopwatch } from './MinimalistTimerStopwatch';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'minimalist-timer',
  name: 'Minimalist Timer / Stopwatch',
  Component: MinimalistTimerStopwatch,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#9aa5b1' },
});
