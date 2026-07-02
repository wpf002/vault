/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@vault/mod-subscription-box-management',
    '@vault/mod-referral-tracking',
    '@vault/mod-staff-scheduling',
    '@vault/mod-review-collection',
    '@vault/mod-service-agreement-generator',
    '@vault/mod-client-progress-tracker',
    '@vault/mod-quote-invoice-builder',
    '@vault/mod-appointment-booking',
    '@vault/mod-task-scheduling-motivation',
    '@vault/mod-digital-decluttering',
    '@vault/mod-form-builder',
    '@vault/mod-personal-dashboard',
    '@vault/mod-recurring-task-manager',
    '@vault/mod-employee-onboarding-checklist',
    '@vault/mod-proposal-generator',
    '@vault/mod-contract-status-tracker',
    '@vault/mod-internal-knowledge-base',
    '@vault/mod-custom-client-portal',
    '@vault/mod-flashcard-spaced-repetition',
    '@vault/mod-habit-tracker',
    '@vault/mod-minimalist-timer',
    '@vault/mod-quick-note-taker','@vault/mod-unit-converter'],
};
export default nextConfig;
