import { defineModule } from '@vault/module-sdk';
import { SkillsAssessmentBuilder } from './SkillsAssessmentBuilder';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'skills-assessment-builder',
  name: 'Skills Assessment Builder',
  Component: SkillsAssessmentBuilder,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
