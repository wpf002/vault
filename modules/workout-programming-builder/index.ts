import { defineModule } from '@vault/module-sdk';
import { WorkoutProgrammingBuilder } from './WorkoutProgrammingBuilder';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'workout-programming-builder',
  name: 'Workout Programming Builder',
  Component: WorkoutProgrammingBuilder,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#34d399' },
});
