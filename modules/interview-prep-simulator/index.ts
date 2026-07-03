import { defineModule } from '@vault/module-sdk';
import { InterviewPrepSimulatorForASpecificRole } from './InterviewPrepSimulatorForASpecificRole';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'interview-prep-simulator',
  name: 'Interview Prep Simulator for a Specific Role',
  Component: InterviewPrepSimulatorForASpecificRole,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#e85d9e' },
});
