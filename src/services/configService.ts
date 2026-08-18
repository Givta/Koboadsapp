import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';
import {
  AGE_RANGES as DEFAULT_AGE_RANGES,
  CATEGORIES as DEFAULT_CATEGORIES,
  COST_PER_REACH_NAIRA as DEFAULT_COST_PER_REACH,
  LOCATIONS as DEFAULT_LOCATIONS,
  PAID_REACH_LEVELS as DEFAULT_PAID_REACH_LEVELS,
  EXCHANGE_REACH_LEVELS as DEFAULT_EXCHANGE_REACH_LEVELS,
  BOOST_REACH_STEPS as DEFAULT_BOOST_REACH_STEPS,
  FREE_CAMPAIGN_MAX_REACH as DEFAULT_FREE_CAMPAIGN_MAX_REACH,
  DAILY_FREE_CAMPAIGN_LIMIT as DEFAULT_DAILY_FREE_CAMPAIGN_LIMIT,
  REWARD_PER_AD_NAIRA as DEFAULT_REWARD_PER_AD,
} from '../data/constants';

export interface AppConfigState {
  categories: string[];
  locations: string[];
  ageRanges: string[];
  reachLevels: number[];
  exchangeReachLevels: number[];
  boostReachSteps: number[];
  freeCampaignMaxReach: number;
  dailyFreeCampaignLimit: number;
  costPerReachNaira: number;
  rewardPerAdNaira: number;
}

const DEFAULTS: AppConfigState = {
  categories: DEFAULT_CATEGORIES,
  locations: DEFAULT_LOCATIONS,
  ageRanges: DEFAULT_AGE_RANGES,
  reachLevels: DEFAULT_PAID_REACH_LEVELS,
  exchangeReachLevels: DEFAULT_EXCHANGE_REACH_LEVELS,
  boostReachSteps: DEFAULT_BOOST_REACH_STEPS,
  freeCampaignMaxReach: DEFAULT_FREE_CAMPAIGN_MAX_REACH,
  dailyFreeCampaignLimit: DEFAULT_DAILY_FREE_CAMPAIGN_LIMIT,
  costPerReachNaira: DEFAULT_COST_PER_REACH,
  rewardPerAdNaira: DEFAULT_REWARD_PER_AD,
};

/**
 * Live-merges the categories / locations / ageRanges / appConfig collections
 * (populated by `npm run seed:firestore`) into one config object. Falls back
 * to the local constants in src/data/constants.ts until the seed data loads
 * (or if it was never seeded), so the app works either way.
 */
export function listenAppConfig(cb: (config: AppConfigState) => void) {
  const state: AppConfigState = { ...DEFAULTS };
  let categoriesLoaded = false;
  let locationsLoaded = false;
  let ageRangesLoaded = false;

  const emit = () => cb({ ...state });

  const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order', 'asc')), (snap) => {
    if (!snap.empty) {
      state.categories = snap.docs.map((d) => d.data().name).filter(Boolean);
      categoriesLoaded = true;
    } else if (!categoriesLoaded) {
      state.categories = DEFAULTS.categories;
    }
    emit();
  });

  const unsubLocations = onSnapshot(query(collection(db, 'locations'), orderBy('order', 'asc')), (snap) => {
    if (!snap.empty) {
      state.locations = snap.docs.map((d) => d.data().name).filter(Boolean);
      locationsLoaded = true;
    } else if (!locationsLoaded) {
      state.locations = DEFAULTS.locations;
    }
    emit();
  });

  const unsubAgeRanges = onSnapshot(query(collection(db, 'ageRanges'), orderBy('order', 'asc')), (snap) => {
    if (!snap.empty) {
      state.ageRanges = snap.docs.map((d) => d.data().label).filter(Boolean);
      ageRangesLoaded = true;
    } else if (!ageRangesLoaded) {
      state.ageRanges = DEFAULTS.ageRanges;
    }
    emit();
  });

  const unsubSettings = onSnapshot(doc(db, 'appConfig', 'settings'), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      state.reachLevels = Array.isArray(data.reachLevels) && data.reachLevels.length ? data.reachLevels : DEFAULTS.reachLevels;
      state.exchangeReachLevels = Array.isArray(data.exchangeReachLevels) && data.exchangeReachLevels.length
        ? data.exchangeReachLevels
        : DEFAULTS.exchangeReachLevels;
      state.boostReachSteps = Array.isArray(data.boostReachSteps) && data.boostReachSteps.length
        ? data.boostReachSteps
        : DEFAULTS.boostReachSteps;
      state.freeCampaignMaxReach = typeof data.freeCampaignMaxReach === 'number' ? data.freeCampaignMaxReach : DEFAULTS.freeCampaignMaxReach;
      state.dailyFreeCampaignLimit = typeof data.dailyFreeCampaignLimit === 'number' ? data.dailyFreeCampaignLimit : DEFAULTS.dailyFreeCampaignLimit;
      state.costPerReachNaira = typeof data.costPerReachNaira === 'number' ? data.costPerReachNaira : DEFAULTS.costPerReachNaira;
      state.rewardPerAdNaira = typeof data.rewardPerAdNaira === 'number' ? data.rewardPerAdNaira : DEFAULTS.rewardPerAdNaira;
    } else {
      state.reachLevels = DEFAULTS.reachLevels;
      state.exchangeReachLevels = DEFAULTS.exchangeReachLevels;
      state.boostReachSteps = DEFAULTS.boostReachSteps;
      state.freeCampaignMaxReach = DEFAULTS.freeCampaignMaxReach;
      state.dailyFreeCampaignLimit = DEFAULTS.dailyFreeCampaignLimit;
      state.costPerReachNaira = DEFAULTS.costPerReachNaira;
      state.rewardPerAdNaira = DEFAULTS.rewardPerAdNaira;
    }
    emit();
  });

  emit(); // deliver defaults immediately so the UI never renders empty

  return () => {
    unsubCategories();
    unsubLocations();
    unsubAgeRanges();
    unsubSettings();
  };
}
