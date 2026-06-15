/**
 * Evolution thresholds: minimum likes required to reach each level.
 * Level 2 = 10 likes, Level 3 = 25 likes, Level 4 = 50 likes.
 */
export const EVOLUTION_THRESHOLDS: Record<number, number> = {
  2: 10,
  3: 25,
  4: 50,
};

export const MAX_LEVEL = 4;

/**
 * Determines the highest level an NFT can reach based on current level and score.
 * Advances through ALL qualifying thresholds, not just the next one.
 * Returns the target level if evolution is possible, or null if already at max for this score.
 */
export function checkEvolution(currentLevel: number, score: number): number | null {
  let targetLevel = currentLevel;

  for (let level = currentLevel + 1; level <= MAX_LEVEL; level++) {
    const threshold = EVOLUTION_THRESHOLDS[level];
    if (threshold && score >= threshold) {
      targetLevel = level;
    } else {
      break;
    }
  }

  return targetLevel > currentLevel ? targetLevel : null;
}
