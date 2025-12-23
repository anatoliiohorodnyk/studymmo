import { GAME_CONFIG } from '../../config/game.config';

export function calculateXpToNextLevel(currentLevel: number): number {
  return Math.floor(
    GAME_CONFIG.CHARACTER_XP_BASE *
      Math.pow(currentLevel, GAME_CONFIG.CHARACTER_XP_EXPONENT),
  );
}

export function calculateSubjectXpToNextLevel(currentLevel: number): number {
  return Math.floor(
    GAME_CONFIG.SUBJECT_XP_BASE *
      Math.pow(currentLevel, GAME_CONFIG.SUBJECT_XP_EXPONENT),
  );
}

export function generateGrade(
  subjectLevel: number,
  equipmentBonus: number = 0,
): number {
  const baseScore = randomInt(GAME_CONFIG.GRADE_BASE_MIN, GAME_CONFIG.GRADE_BASE_MAX);
  const levelBonus = subjectLevel * GAME_CONFIG.GRADE_LEVEL_BONUS_PER_LEVEL;
  const finalScore = Math.min(100, baseScore + levelBonus + equipmentBonus);
  return Math.round(finalScore);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function pickWeightedRandom<T extends string>(
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}

export function calculateEnergyRegen(
  lastRegen: Date,
  currentEnergy: number,
  maxEnergy: number,
  regenMinutes: number,
): { energy: number; lastRegen: Date } {
  const now = new Date();
  const elapsedMs = now.getTime() - lastRegen.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const energyToAdd = Math.floor(elapsedMinutes / regenMinutes);

  if (energyToAdd <= 0) {
    return { energy: currentEnergy, lastRegen };
  }

  const newEnergy = Math.min(maxEnergy, currentEnergy + energyToAdd);
  const usedMinutes = energyToAdd * regenMinutes;
  const newLastRegen = new Date(lastRegen.getTime() + usedMinutes * 60 * 1000);

  return { energy: newEnergy, lastRegen: newLastRegen };
}
