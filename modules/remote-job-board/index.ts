import { defineModule } from '@vault/module-sdk';
import { RemoteJobBoardForASpecificSkillSet } from './RemoteJobBoardForASpecificSkillSet';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'remote-job-board',
  name: 'Remote Job Board for a Specific Skill Set',
  Component: RemoteJobBoardForASpecificSkillSet,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#ff9f4a' },
});
