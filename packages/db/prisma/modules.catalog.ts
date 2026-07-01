// The full catalog, transcribed from the master list (document order).
// Confirmed 120 distinct apps — the "121" in early drafts was a miscount.
// slug = kebab-case (stable, used in URLs + module-sdk). number = list position.
// icon = one emoji per app, unique across the whole catalog — this is what
// renders on catalog cards and the module detail header instead of a
// generic folder. Category alone isn't enough signal once a category has
// more than one or two apps in it.
import type { ModuleCategory } from '../src';

type CatalogEntry = {
  number: number;
  slug: string;
  name: string;
  description: string;
  category: ModuleCategory;
  icon: string;
  requiresAi?: boolean;
};

export const CATALOG: CatalogEntry[] = [
  // ---- Productivity & Workflow (1-13) ----
  { number: 1, slug: 'custom-client-portal', name: 'Custom Client Portal', description: 'Branded hub for files, updates, and messages between service businesses and clients.', category: 'productivity', icon: '🚪' },
  { number: 2, slug: 'internal-knowledge-base', name: 'Internal Knowledge Base / Team Wiki', description: 'Searchable wiki for small teams with rich text editor and permissions.', category: 'productivity', icon: '📚' },
  { number: 3, slug: 'meeting-follow-up-automator', name: 'Meeting Follow-Up Automator', description: 'Auto-generates action items from pasted meeting notes.', category: 'productivity', icon: '🗣️', requiresAi: true },
  { number: 4, slug: 'contract-status-tracker', name: 'Contract Status Tracker', description: 'Visual Kanban pipeline for client agreements.', category: 'productivity', icon: '📋' },
  { number: 5, slug: 'proposal-generator', name: 'Proposal Generator', description: 'Template library with variable fields and PDF export.', category: 'productivity', icon: '📄' },
  { number: 6, slug: 'employee-onboarding-checklist', name: 'Employee Onboarding Checklist', description: 'Step-by-step onboarding with assignees, due dates, and tracking.', category: 'productivity', icon: '📑' },
  { number: 7, slug: 'recurring-task-manager', name: 'Recurring Task Manager with Client Visibility', description: 'Task list with recurring schedules and shared client view.', category: 'productivity', icon: '🔁' },
  { number: 8, slug: 'personal-dashboard', name: 'Customizable Personal Dashboard', description: 'Widgets for weather, news, calendar, to-do lists, and shortcuts.', category: 'productivity', icon: '🧭' },
  { number: 9, slug: 'form-builder', name: 'Drag-and-Drop Form Builder', description: 'Visual form builder with validation and backend integration.', category: 'productivity', icon: '🧩' },
  { number: 10, slug: 'digital-decluttering', name: 'Digital Decluttering & Data Organizer', description: 'Organizes files, photos, emails, and subscriptions.', category: 'productivity', icon: '🧹' },
  { number: 11, slug: 'task-scheduling-motivation', name: 'Task Scheduling & Motivation App', description: 'Schedule daily tasks with reminders and motivational prompts.', category: 'productivity', icon: '📅' },
  { number: 12, slug: 'quick-note-taker', name: 'Quick Note Taker with Tags', description: 'Rapidly jot and organize text notes using tags.', category: 'productivity', icon: '🗒️' },
  { number: 13, slug: 'minimalist-timer', name: 'Minimalist Timer / Stopwatch', description: 'Clean timing app with customizable alarms.', category: 'utilities', icon: '⏱️' },

  // ---- Service Business Operations (14-23) ----
  { number: 14, slug: 'appointment-booking', name: 'Appointment Booking with Intake Forms', description: 'Scheduling calendar with conditional intake forms.', category: 'service_ops', icon: '📆' },
  { number: 15, slug: 'quote-invoice-builder', name: 'Quote and Invoice Builder', description: 'Custom quoting with line items, tax, and Stripe payment.', category: 'service_ops', icon: '💳' },
  { number: 16, slug: 'client-progress-tracker', name: 'Client Progress Tracker', description: 'Timeline with milestone markers and file attachments.', category: 'service_ops', icon: '📈' },
  { number: 17, slug: 'service-agreement-generator', name: 'Service Agreement Generator', description: 'Branded contracts created and e-signed in one flow.', category: 'service_ops', icon: '✍️' },
  { number: 18, slug: 'review-collection', name: 'Review Collection and Showcase Tool', description: 'Request testimonials and display them publicly.', category: 'service_ops', icon: '⭐' },
  { number: 19, slug: 'staff-scheduling', name: 'Staff Scheduling Tool', description: 'Weekly shift grid with swap-request notifications.', category: 'service_ops', icon: '🗓️' },
  { number: 20, slug: 'referral-tracking', name: 'Referral Tracking Dashboard', description: 'Logs referrals, revenue, and top referrer leaderboard.', category: 'service_ops', icon: '🔗' },
  { number: 21, slug: 'subscription-box-management', name: 'Subscription Box Management Platform', description: 'Recurring billing, inventory, customer data, and shipping.', category: 'service_ops', icon: '📦' },
  { number: 22, slug: 'online-booking-scheduling', name: 'Online Booking & Scheduling for Service Providers', description: 'Appointment booking with payments and reminders.', category: 'service_ops', icon: '🕑' },
  { number: 23, slug: 'restaurant-reservation', name: 'Restaurant Reservation App', description: 'Book tables, check availability, view menus, and get deals.', category: 'service_ops', icon: '🍽️' },

  // ---- Niche Marketplaces & Directories (24-33) ----
  { number: 24, slug: 'freelancer-directory', name: 'Freelancer Directory for a Specific Trade', description: 'Vetted profiles with verification badges.', category: 'marketplace', icon: '🧑‍💻' },
  { number: 25, slug: 'local-service-comparison', name: 'Local Service Comparison Tool', description: 'Side-by-side quotes for roofing, landscaping, or cleaning.', category: 'marketplace', icon: '⚖️' },
  { number: 26, slug: 'specialty-product-aggregator', name: 'Specialty Product Aggregator', description: 'Price comparison for niche verticals with spec tables.', category: 'marketplace', icon: '🏷️' },
  { number: 27, slug: 'event-venue-finder', name: 'Event Venue Finder with Real Availability', description: 'Calendar-synced venue listings.', category: 'marketplace', icon: '🎪' },
  { number: 28, slug: 'pet-service-locator', name: 'Pet Service Locator', description: 'Map-based directory of groomers, trainers, and sitters.', category: 'marketplace', icon: '🐾' },
  { number: 29, slug: 'mentor-marketplace', name: 'Professional Mentor Marketplace', description: 'Book calls with experienced practitioners.', category: 'marketplace', icon: '🧑‍💼' },
  { number: 30, slug: 'remote-job-board', name: 'Remote Job Board for a Specific Skill Set', description: 'Niche remote job board with tags and featured posts.', category: 'marketplace', icon: '💻' },
  { number: 31, slug: 'tutor-search', name: 'Tutor Searching App', description: 'Match students to tutors by subject, fees, and location.', category: 'marketplace', icon: '📖' },
  { number: 32, slug: 'sustainable-goods-repair', name: 'Sustainable Goods & Repair Marketplace', description: 'Second-hand, upcycled products and repair services.', category: 'marketplace', icon: '♻️' },
  { number: 33, slug: 'hyperlocal-skill-exchange', name: 'Hyperlocal Skill & Service Exchange', description: 'Neighbors post needs and offer skills informally.', category: 'marketplace', icon: '🤝' },

  // ---- Content & Community (34-47) ----
  { number: 34, slug: 'newsletter-monetization', name: 'Newsletter Monetization Dashboard', description: 'Tracks subscribers, revenue, and growth trends.', category: 'content_community', icon: '📰' },
  { number: 35, slug: 'digital-product-storefront', name: 'Digital Product Storefront', description: 'Sell templates and files with Stripe integration.', category: 'content_community', icon: '🏬' },
  { number: 36, slug: 'community-membership-portal', name: 'Community Membership Portal', description: 'Gated content with login wall, tiers, and forums.', category: 'content_community', icon: '🔐' },
  { number: 37, slug: 'course-completion-tracker', name: 'Course Completion Tracker', description: 'Learner progress with creator analytics and drop-off points.', category: 'content_community', icon: '🎯' },
  { number: 38, slug: 'portfolio-case-study-builder', name: 'Portfolio Site with Case Study Builder', description: 'Structured editor that turns notes into case studies.', category: 'content_community', icon: '🖼️' },
  { number: 39, slug: 'content-calendar-approval', name: 'Content Calendar with Client Approval', description: 'Calendar with draft, preview, and approve/reject flow.', category: 'content_community', icon: '📝' },
  { number: 40, slug: 'affiliate-dashboard', name: 'Affiliate Dashboard', description: 'Tracks clicks, conversions, and payouts across affiliate programs.', category: 'content_community', icon: '💹' },
  { number: 41, slug: 'influencer-campaign-manager', name: 'Influencer Marketing Campaign Manager', description: 'Find influencers, manage campaigns, track performance.', category: 'content_community', icon: '📢' },
  { number: 42, slug: 'branching-storytelling', name: 'Interactive Branching Storytelling Platform', description: 'Create and play choose-your-own-adventure stories.', category: 'content_community', icon: '🌳' },
  { number: 43, slug: 'creative-collaboration-hub', name: 'Creative Collaboration Hub for Artists', description: 'Artists share work and collaborate across disciplines.', category: 'content_community', icon: '🎨' },
  { number: 44, slug: 'diy-skill-sharing', name: 'DIY Projects & Skill-Sharing Network', description: 'Community step-by-step guides for DIY and crafts.', category: 'content_community', icon: '🔨' },
  { number: 45, slug: 'recipe-sharing', name: 'Recipe Sharing App', description: 'Community recipe discovery with ratings and ingredient search.', category: 'food_lifestyle', icon: '🍳' },
  { number: 46, slug: 'news-aggregator', name: 'News Aggregator', description: 'Personalized feed from multiple sources with filters and save-for-later.', category: 'content_community', icon: '🗞️' },
  { number: 47, slug: 'podcast-audio-curator', name: 'Personalized Podcast & Audio Content Curator', description: 'Learns habits to suggest podcasts and audio content.', category: 'content_community', icon: '🎧', requiresAi: true },

  // ---- Health & Wellness (48-59) ----
  { number: 48, slug: 'habit-tracker', name: 'Habit Tracker with Accountability Partners', description: 'Pairs users who check in on each other daily.', category: 'health_wellness', icon: '🔥' },
  { number: 49, slug: 'nutrition-log', name: 'Nutrition Log for Specific Dietary Protocols', description: 'Custom macros for keto, carnivore, or elimination diets.', category: 'health_wellness', icon: '🥗' },
  { number: 50, slug: 'workout-programming-builder', name: 'Workout Programming Builder', description: 'Drag-and-drop exercise library with weekly planner.', category: 'health_wellness', icon: '🏋️' },
  { number: 51, slug: 'sleep-quality-journal', name: 'Sleep Quality Journal with Pattern Analysis', description: 'Nightly entry form with trend charts.', category: 'health_wellness', icon: '😴' },
  { number: 52, slug: 'mental-health-checkin-teams', name: 'Mental Health Check-In Tool for Teams', description: 'Weekly mood pulse for remote teams.', category: 'health_wellness', icon: '🙂' },
  { number: 53, slug: 'recovery-tracker', name: 'Recovery Tracker for Athletes', description: 'Tracks soreness and readiness with daily score.', category: 'health_wellness', icon: '🩹' },
  { number: 54, slug: 'supplement-tracking', name: 'Supplement Tracking Tool', description: 'Logs timing, dosage, and effects with dosing schedule.', category: 'health_wellness', icon: '💊' },
  { number: 55, slug: 'ai-health-coach', name: 'AI Health & Wellness Coach', description: 'Customized fitness routines and nutrition plans.', category: 'health_wellness', icon: '🏃', requiresAi: true },
  { number: 56, slug: 'mental-health-journal', name: 'Mental Health Journal', description: 'AI-enhanced journaling with mood analysis and prompts.', category: 'health_wellness', icon: '📔', requiresAi: true },
  { number: 57, slug: 'ai-mental-health-companion', name: 'AI Mental Health Companion', description: 'Always-on emotional support with guided exercises.', category: 'health_wellness', icon: '🫂', requiresAi: true },
  { number: 58, slug: 'fitness-tracking-platform', name: 'Fitness Tracking Platform', description: 'Comprehensive dashboard with community and AI tips.', category: 'health_wellness', icon: '⌚', requiresAi: true },
  { number: 59, slug: 'skincare-app', name: 'Skincare App', description: 'Personalized skincare routines and ingredient analysis.', category: 'health_wellness', icon: '🧴' },

  // ---- Finance & Money Management (60-74) ----
  { number: 60, slug: 'freelancer-cash-flow', name: 'Freelancer Cash Flow Dashboard', description: 'Income runway from current contracts with balance chart.', category: 'finance', icon: '💵' },
  { number: 61, slug: 'shared-expense-tracker', name: 'Shared Expense Tracker for Small Teams', description: 'Shared ledger with receipt uploads and balances.', category: 'finance', icon: '🧾' },
  { number: 62, slug: 'budget-to-actual', name: 'Budget-to-Actual Comparison Tool', description: 'Projected vs. real spend with variance chart.', category: 'finance', icon: '📉' },
  { number: 63, slug: 'invoice-aging-report', name: 'Invoice Aging Report', description: 'Flags outstanding payments with automated follow-up reminders.', category: 'finance', icon: '⏳' },
  { number: 64, slug: 'subscription-audit', name: 'Business Subscription Audit Tool', description: 'Imports recurring charges grouped by vendor.', category: 'finance', icon: '🔍' },
  { number: 65, slug: 'tax-estimate-calculator', name: 'Tax Estimate Calculator for Contractors', description: 'Quarterly estimates with state tax-rate selector.', category: 'finance', icon: '🧮' },
  { number: 66, slug: 'gamified-budgeting', name: 'Gamified Budgeting & Savings App', description: 'Personal finance with challenges, rewards, and goals.', category: 'finance', icon: '🎮' },
  { number: 67, slug: 'micro-investing', name: 'Micro-Investing Platform for Beginners', description: 'Auto-invest small amounts into themed portfolios.', category: 'finance', icon: '🌱' },
  { number: 68, slug: 'sustainable-finance-tracker', name: 'Sustainable Finance & Spending Tracker', description: 'Analyzes carbon footprint of purchases.', category: 'finance', icon: '🌍' },
  { number: 69, slug: 'fractional-asset-ownership', name: 'Fractional Real Estate & Asset Ownership App', description: 'Invest in fractional shares of real estate or art.', category: 'finance', icon: '🧱' },
  { number: 70, slug: 'wealth-asset-management', name: 'Wealth & Asset Management App', description: 'Real-time market data with portfolio analysis.', category: 'finance', icon: '💎' },
  { number: 71, slug: 'e-wallet', name: 'E-Wallet', description: 'Digital wallet with transaction tracking and cashback features.', category: 'finance', icon: '👛' },
  { number: 72, slug: 'financial-dashboard', name: 'Financial Dashboard (Small Business/Personal)', description: 'Budget tracking with AI revenue forecasts.', category: 'finance', icon: '🏦', requiresAi: true },
  { number: 73, slug: 'vehicle-insurance', name: 'Vehicle Insurance App', description: 'Compare plans, track policy, manage renewals, and file claims.', category: 'finance', icon: '🚗' },
  { number: 74, slug: 'decentralized-identity-wallet', name: 'Decentralized Identity & Credential Wallet', description: 'Manage and verify digital identities.', category: 'finance', icon: '🪪' },

  // ---- Education & Skills (75-84) ----
  { number: 75, slug: 'flashcard-spaced-repetition', name: 'Flashcard Builder with Spaced Repetition', description: 'Custom decks for certifications with SR algorithm.', category: 'education', icon: '🧠' },
  { number: 76, slug: 'study-group-coordination', name: 'Study Group Coordination Tool', description: 'Shared calendar and resources for exam prep groups.', category: 'education', icon: '👥' },
  { number: 77, slug: 'interview-prep-simulator', name: 'Interview Prep Simulator for a Specific Role', description: 'Role-specific question bank with self-evaluation.', category: 'education', icon: '🎤' },
  { number: 78, slug: 'language-exchange-matching', name: 'Language Exchange Matching Tool', description: 'Pairs native speakers for conversation practice.', category: 'education', icon: '🌐' },
  { number: 79, slug: 'skills-assessment-builder', name: 'Skills Assessment Builder', description: 'Create competency evaluations with scoring rubric and dashboard.', category: 'education', icon: '🧪' },
  { number: 80, slug: 'ai-learning-companion', name: 'AI Learning Companion', description: 'Adapts lessons and pacing to each student learning style.', category: 'education', icon: '🧑‍🏫', requiresAi: true },
  { number: 81, slug: 'online-course-platform', name: 'Online Course Platform with Interactive Lessons', description: 'Multimedia e-learning with quizzes and tracking.', category: 'education', icon: '🎓' },
  { number: 82, slug: 'language-learning-game', name: 'Language Learning Game', description: 'Gamified language learning with cultural context.', category: 'education', icon: '🕹️' },
  { number: 83, slug: 'study-group-organizer', name: 'Study Group Organizer', description: 'Focused study groups with scheduler, chat, and mentor connections.', category: 'education', icon: '🧑‍🤝‍🧑' },
  { number: 84, slug: 'educational-minigame-arcade', name: 'Educational Mini-Game Arcade', description: 'Short games teaching academic concepts.', category: 'education', icon: '🎰' },

  // ---- Local & Hyperlocal (85-91) ----
  { number: 85, slug: 'local-event-aggregator', name: 'Local Event Aggregator', description: 'One calendar for city events with submission form and email digest.', category: 'local', icon: '🎫' },
  { number: 86, slug: 'neighborhood-services-exchange', name: 'Neighborhood Services Exchange', description: 'Residents post needs and offer skills with messaging.', category: 'local', icon: '🏘️' },
  { number: 87, slug: 'loyalty-program-builder', name: 'Local Business Loyalty Program Builder', description: 'Custom digital punch cards without platform lock-in.', category: 'local', icon: '🪙' },
  { number: 88, slug: 'emergency-resource-map', name: 'Community Emergency Resource Map', description: 'Real-time map of shelters and services during disasters.', category: 'local', icon: '🆘' },
  { number: 89, slug: 'local-discovery-platform', name: 'Community-Powered Local Discovery Platform', description: 'Share hidden gems, local events, and small businesses.', category: 'local', icon: '🗺️' },
  { number: 90, slug: 'complaint-registering', name: 'Complaint Registering App', description: 'Submit complaints directly to a government body.', category: 'local', icon: '📮' },
  { number: 91, slug: 'disaster-management', name: 'Disaster Management App', description: 'Warns of disasters, helps locate stranded people, aids rescue teams.', category: 'local', icon: '🌪️' },

  // ---- AI-Powered Tools (92-101) ----
  { number: 92, slug: 'smart-content-generator', name: 'Smart Content Generator & Summarizer', description: 'Summarizes texts and generates content outlines.', category: 'ai_tools', icon: '🤖', requiresAi: true },
  { number: 93, slug: 'ai-shopping-recommendation', name: 'AI Shopping & Recommendation Engine', description: 'Learns taste to recommend products and deals.', category: 'ai_tools', icon: '🛍️', requiresAi: true },
  { number: 94, slug: 'feedback-analyzer', name: 'AI-Powered Customer Feedback Analyzer', description: 'Processes reviews to identify sentiment patterns.', category: 'ai_tools', icon: '💬', requiresAi: true },
  { number: 95, slug: 'home-maintenance-predictor', name: 'AI Home Maintenance Predictor', description: 'Predicts appliance failures and schedules servicing.', category: 'ai_tools', icon: '🏠', requiresAi: true },
  { number: 96, slug: 'itinerary-generator', name: 'AI-Powered Itinerary Generator & Optimizer', description: 'Personalized travel plans by budget and preferences.', category: 'ai_tools', icon: '🧳', requiresAi: true },
  { number: 97, slug: 'hrms-chatbot', name: 'AI Chatbot for HRMS', description: 'Automates routine HR tasks via chatbot.', category: 'ai_tools', icon: '🗂️', requiresAi: true },
  { number: 98, slug: 'ecommerce-ai-agent', name: 'E-Commerce AI Agent', description: 'Dynamic pricing, support, cart recovery, and personalization.', category: 'ai_tools', icon: '🛒', requiresAi: true },
  { number: 99, slug: 'smart-interior-planner', name: 'Smart Interior Planner with AI', description: 'Snap a room photo, get AI decor and layout suggestions.', category: 'ai_tools', icon: '🛋️', requiresAi: true },
  { number: 100, slug: 'random-idea-generator', name: 'Random Idea Generator', description: 'Prompts for creative writing, drawing, or brainstorming.', category: 'ai_tools', icon: '💡' },
  { number: 101, slug: 'browser-cookie-manager', name: 'AI Browser Cookie Manager', description: 'Intelligently tracks and manages web cookies.', category: 'ai_tools', icon: '🍪', requiresAi: true },

  // ---- Data & Dashboards (102-104) ----
  { number: 102, slug: 'data-visualization-dashboard', name: 'Interactive Data Visualization Dashboard', description: 'Transforms datasets into interactive charts.', category: 'data_dashboards', icon: '📊' },
  { number: 103, slug: 'collaborative-whiteboard', name: 'Real-Time Collaborative Whiteboard', description: 'Multi-user whiteboard for drawing and brainstorming.', category: 'data_dashboards', icon: '✏️' },
  { number: 104, slug: 'inventory-supply-chain-tracker', name: 'Real-Time Inventory & Supply Chain Tracker', description: 'Instant inventory and supply chain visibility.', category: 'data_dashboards', icon: '🚚' },

  // ---- Travel & Exploration (105-108) ----
  { number: 105, slug: 'local-culture-travel-guide', name: 'Immersive Local Culture & Travel Guide', description: 'Multimedia interactive local history and culture.', category: 'travel', icon: '🏛️' },
  { number: 106, slug: 'sustainable-travel-tracker', name: 'Sustainable Travel Impact Tracker', description: 'Monitors environmental footprint with eco suggestions.', category: 'travel', icon: '🌿' },
  { number: 107, slug: 'foodie-tour-planner', name: 'Local Foodie Tour Planner', description: 'Curated culinary tours by dietary needs.', category: 'travel', icon: '🍜' },
  { number: 108, slug: 'multilingual-travel-companion', name: 'Multilingual Travel Companion & Phrasebook', description: 'Real-time translation and cultural etiquette tips.', category: 'travel', icon: '🎙️', requiresAi: true },

  // ---- Business & SaaS (109-114) ----
  { number: 109, slug: 'niche-crm', name: 'Specialized Niche CRM', description: 'CRM for specific industries with tailored workflows.', category: 'business_saas', icon: '🗃️' },
  { number: 110, slug: 'small-business-crm', name: 'Small Business CRM with Marketing Automation', description: 'Lead tracking with automated email campaigns.', category: 'business_saas', icon: '📇' },
  { number: 111, slug: 'skill-matching-allocation', name: 'Employee Skill Matching & Project Allocation', description: 'Matches skills and availability to open projects.', category: 'business_saas', icon: '⚙️' },
  { number: 112, slug: 'virtual-event-booth', name: 'Virtual Event Booth & Networking Platform', description: 'Interactive booths for virtual trade shows.', category: 'business_saas', icon: '🖥️' },
  { number: 113, slug: 'social-media-curator', name: 'Automated Social Media Content Curator', description: 'AI generates ideas and automates post scheduling.', category: 'business_saas', icon: '📱', requiresAi: true },
  { number: 114, slug: 'hybrid-event-planning', name: 'Hybrid Event Planning & Execution Platform', description: 'Manages in-person and virtual events.', category: 'business_saas', icon: '🎭' },

  // ---- Food & Lifestyle (115-117) ----
  { number: 115, slug: 'recipe-planner-pantry', name: 'Smart Recipe Planner & Pantry Manager', description: 'Generates meal plans from ingredients on hand.', category: 'food_lifestyle', icon: '🥘', requiresAi: true },
  { number: 116, slug: 'diet-planning-assistant', name: 'Diet Planning Assistant', description: 'AI nutrition analysis with recipe generator and rewards.', category: 'food_lifestyle', icon: '🥑', requiresAi: true },
  { number: 117, slug: 'social-food-delivery', name: 'Social Food Delivery App', description: 'Discover restaurants, share recommendations, and get deals.', category: 'food_lifestyle', icon: '🚴' },

  // ---- Utilities & Miscellaneous (118-120) ----
  { number: 118, slug: 'dice-roller-coin-flipper', name: 'Digital Dice Roller / Coin Flipper', description: 'Random outcome generator for games and decisions.', category: 'utilities', icon: '🎲' },
  { number: 119, slug: 'unit-converter', name: 'Basic Unit Converter', description: 'Convert length, weight, and temperature units.', category: 'utilities', icon: '📐' },
  { number: 120, slug: 'fuel-delivery', name: 'On-Demand Fuel Delivery App', description: 'GPS-tracked fuel delivery to your location.', category: 'utilities', icon: '⛽' },
];
