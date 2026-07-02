import { defineModule } from '@vault/module-sdk';
import { EmployeeOnboardingChecklist } from './EmployeeOnboardingChecklist';
import { seedPreview } from './seedPreview';

export default defineModule({
  slug: 'employee-onboarding-checklist',
  name: 'Employee Onboarding Checklist',
  Component: EmployeeOnboardingChecklist,
  seedPreview,
  // Defaulted from the catalog category — override with something more
  // specific to what this app actually does if the category color doesn't fit.
  theme: { accent: '#2dd4bf' },
});
