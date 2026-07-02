import { defineModule } from '@vault/module-sdk';
import { DiyProjectsSkillSharingNetwork } from './DIYProjectsSkillSharingNetwork';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'diy-skill-sharing',
  name: 'DIY Projects & Skill-Sharing Network',
  Component: DiyProjectsSkillSharingNetwork,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff6b9d' },
});
