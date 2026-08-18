export const CATEGORIES = ['Fashion', 'Food & Restaurant', 'Retail', 'Beauty', 'Electronics', 'Services', 'Real Estate', 'Other'];
export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+', 'All ages'];
export const GENDERS = ['Male', 'Female', 'All'];
export const LOCATIONS = ['Ibadan', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Enugu', 'All Nigeria'];
export const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

// Reach choices shown when creating a PAID campaign from scratch.
export const PAID_REACH_LEVELS = [500, 1000, 2500, 5000, 10000];
// Reach choices shown for a FREE/exchange campaign — capped at 1,000, per the
// KoboAds agreement: "Each advertisement can target/distribute to up to
// 1,000 different eligible users" for the free/exchange tier.
export const EXCHANGE_REACH_LEVELS = [200, 500, 1000];
// Kept for anything that still wants "the full picker" regardless of type.
export const REACH_LEVELS = PAID_REACH_LEVELS;
// Hard ceiling enforced server-side too (functions/src/index.ts) — a free
// campaign can never target more than this many people without a paid boost.
export const FREE_CAMPAIGN_MAX_REACH = 1000;
// How many free/exchange campaigns one advertiser can SEND per day. This is
// separate from DAILY_AD_LIMIT below, which caps how many ads a user can
// RECEIVE per day — the two are different sides of the same agreement:
//   "Each participating user can send up to 2 advertisements per day."
export const DAILY_FREE_CAMPAIGN_LIMIT = 2;
// Additional-reach increments offered when boosting an existing campaign
// with money (works for a free campaign that used up its 1,000 free reach or
// its 2 free sends for the day, or for topping up a paid campaign further).
export const BOOST_REACH_STEPS = [200, 500, 1000, 2000, 5000];

// Naira cost per delivered impression for paid campaigns AND paid boosts.
export const COST_PER_REACH_NAIRA = 0.8;
// Naira reward credited to a user's earnings balance for each ad they watch.
export const REWARD_PER_AD_NAIRA = 40;
// Max advertisements a user can RECEIVE/watch per rolling day (the other
// side of the agreement — see DAILY_FREE_CAMPAIGN_LIMIT above).
export const DAILY_AD_LIMIT = 2;
export const DAILY_EARN_LIMIT = 10;

// App host (used for referral web links). Change to your production domain.
export const WEB_HOST = 'https://koboads.vercel.app';
// Deep link scheme for mobile apps.
export const DEEP_LINK_SCHEME = 'koboads://';
