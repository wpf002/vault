import type { ModuleManifest } from '@vault/module-sdk';

/**
 * slug -> dynamic import of modules/<slug>, imported by its workspace
 * package name (@vault/mod-<slug>), NOT a relative path — a bare relative
 * import can't resolve `react` or `@vault/*` since modules/<slug> has no
 * node_modules of its own. Next.js code-splits each entry, so the bundle
 * never balloons no matter how many of the 120 are live. Phase 5's
 * generator adds an entry here (and to next.config.mjs's transpilePackages)
 * for every module it scaffolds. Empty until then — the shell falls back
 * to a "not available yet" state for any slug with no entry.
 */
export const MODULE_REGISTRY: Record<string, () => Promise<{ default: ModuleManifest }>> = {
  'budget-to-actual': () => import('@vault/mod-budget-to-actual'),
  'shared-expense-tracker': () => import('@vault/mod-shared-expense-tracker'),
  'freelancer-cash-flow': () => import('@vault/mod-freelancer-cash-flow'),
  'skincare-app': () => import('@vault/mod-skincare-app'),
  'supplement-tracking': () => import('@vault/mod-supplement-tracking'),
  'recovery-tracker': () => import('@vault/mod-recovery-tracker'),
  'mental-health-checkin-teams': () => import('@vault/mod-mental-health-checkin-teams'),
  'sleep-quality-journal': () => import('@vault/mod-sleep-quality-journal'),
  'workout-programming-builder': () => import('@vault/mod-workout-programming-builder'),
  'nutrition-log': () => import('@vault/mod-nutrition-log'),
  'news-aggregator': () => import('@vault/mod-news-aggregator'),
  'recipe-sharing': () => import('@vault/mod-recipe-sharing'),
  'diy-skill-sharing': () => import('@vault/mod-diy-skill-sharing'),
  'creative-collaboration-hub': () => import('@vault/mod-creative-collaboration-hub'),
  'branching-storytelling': () => import('@vault/mod-branching-storytelling'),
  'influencer-campaign-manager': () => import('@vault/mod-influencer-campaign-manager'),
  'affiliate-dashboard': () => import('@vault/mod-affiliate-dashboard'),
  'content-calendar-approval': () => import('@vault/mod-content-calendar-approval'),
  'portfolio-case-study-builder': () => import('@vault/mod-portfolio-case-study-builder'),
  'course-completion-tracker': () => import('@vault/mod-course-completion-tracker'),
  'community-membership-portal': () => import('@vault/mod-community-membership-portal'),
  'digital-product-storefront': () => import('@vault/mod-digital-product-storefront'),
  'newsletter-monetization': () => import('@vault/mod-newsletter-monetization'),
  'hyperlocal-skill-exchange': () => import('@vault/mod-hyperlocal-skill-exchange'),
  'sustainable-goods-repair': () => import('@vault/mod-sustainable-goods-repair'),
  'tutor-search': () => import('@vault/mod-tutor-search'),
  'remote-job-board': () => import('@vault/mod-remote-job-board'),
  'mentor-marketplace': () => import('@vault/mod-mentor-marketplace'),
  'pet-service-locator': () => import('@vault/mod-pet-service-locator'),
  'event-venue-finder': () => import('@vault/mod-event-venue-finder'),
  'specialty-product-aggregator': () => import('@vault/mod-specialty-product-aggregator'),
  'local-service-comparison': () => import('@vault/mod-local-service-comparison'),
  'freelancer-directory': () => import('@vault/mod-freelancer-directory'),
  'restaurant-reservation': () => import('@vault/mod-restaurant-reservation'),
  'online-booking-scheduling': () => import('@vault/mod-online-booking-scheduling'),
  'subscription-box-management': () => import('@vault/mod-subscription-box-management'),
  'referral-tracking': () => import('@vault/mod-referral-tracking'),
  'staff-scheduling': () => import('@vault/mod-staff-scheduling'),
  'review-collection': () => import('@vault/mod-review-collection'),
  'service-agreement-generator': () => import('@vault/mod-service-agreement-generator'),
  'client-progress-tracker': () => import('@vault/mod-client-progress-tracker'),
  'quote-invoice-builder': () => import('@vault/mod-quote-invoice-builder'),
  'appointment-booking': () => import('@vault/mod-appointment-booking'),
  'task-scheduling-motivation': () => import('@vault/mod-task-scheduling-motivation'),
  'digital-decluttering': () => import('@vault/mod-digital-decluttering'),
  'form-builder': () => import('@vault/mod-form-builder'),
  'personal-dashboard': () => import('@vault/mod-personal-dashboard'),
  'recurring-task-manager': () => import('@vault/mod-recurring-task-manager'),
  'employee-onboarding-checklist': () => import('@vault/mod-employee-onboarding-checklist'),
  'proposal-generator': () => import('@vault/mod-proposal-generator'),
  'contract-status-tracker': () => import('@vault/mod-contract-status-tracker'),
  'internal-knowledge-base': () => import('@vault/mod-internal-knowledge-base'),
  'custom-client-portal': () => import('@vault/mod-custom-client-portal'),
  'flashcard-spaced-repetition': () => import('@vault/mod-flashcard-spaced-repetition'),
  'habit-tracker': () => import('@vault/mod-habit-tracker'),
  'minimalist-timer': () => import('@vault/mod-minimalist-timer'),
  'quick-note-taker': () => import('@vault/mod-quick-note-taker'),
  'unit-converter': () => import('@vault/mod-unit-converter'),
};
