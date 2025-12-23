export const GAME_CONFIG = {
  // Study
  STUDY_COOLDOWN_MS: 3000,
  STUDY_SUBJECT_XP_MIN: 10,
  STUDY_SUBJECT_XP_MAX: 25,
  STUDY_SUBJECTS_AFFECTED_MIN: 1,
  STUDY_SUBJECTS_AFFECTED_MAX: 3,
  STUDY_CHARACTER_XP_MIN: 3,
  STUDY_CHARACTER_XP_MAX: 8,
  STUDY_CASH_CHANCE: 0.15,
  STUDY_CASH_MIN: 1,
  STUDY_CASH_MAX: 5,
  STUDY_CLICKS_PER_GRADE: 10,
  STUDY_MATERIAL_DROP_CHANCE: 0.08,
  STUDY_ITEM_DROP_CHANCE: 0.02, // 2% chance per study click

  // XP Curves
  CHARACTER_XP_BASE: 100,
  CHARACTER_XP_EXPONENT: 1.5,
  SUBJECT_XP_BASE: 50,
  SUBJECT_XP_EXPONENT: 1.8,

  // Grades
  GRADE_BASE_MIN: 30,
  GRADE_BASE_MAX: 85,
  GRADE_LEVEL_BONUS_PER_LEVEL: 0.3,
  GRADES_TO_COMPLETE_CLASS: 15,

  // Energy - Quest
  QUEST_ENERGY_MAX: 100,
  QUEST_ENERGY_REGEN_MINUTES: 3,

  // Energy - Olympiad
  OLYMPIAD_ENERGY_MAX: 50,
  OLYMPIAD_ENERGY_REGEN_MINUTES: 10,

  // Market
  MARKET_FEE_PERCENT: 5,
  MARKET_LISTING_DAYS: 7,

  // NPC Prices
  NPC_PRICES: {
    common: { sell: 10, buy: 25 },
    uncommon: { sell: 35, buy: 80 },
    rare: { sell: 150, buy: 350 },
    epic: { sell: 750, buy: 1500 },
    legendary: { sell: 3500, buy: 8000 },
    mythic: { sell: 15000, buy: null },
  },

  // Drop Rates
  RARITY_WEIGHTS: {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 0.9,
    mythic: 0.1,
  },

  // Daily Rewards
  DAILY_REWARDS: [
    { day: 1, cash: 50 },
    { day: 2, cash: 100 },
    { day: 3, cash: 0, item_rarity: 'common' },
    { day: 4, cash: 150 },
    { day: 5, cash: 200, quest_energy: 10 },
    { day: 6, cash: 0, item_rarity: 'uncommon' },
    { day: 7, cash: 500, item_rarity: 'rare' },
  ],
} as const;

export type GameConfig = typeof GAME_CONFIG;
