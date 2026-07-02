import { defineModule } from '@vault/module-sdk';
import { HyperlocalSkillServiceExchange } from './HyperlocalSkillServiceExchange';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'hyperlocal-skill-exchange',
  name: 'Hyperlocal Skill & Service Exchange',
  Component: HyperlocalSkillServiceExchange,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff9f4a' },
});
