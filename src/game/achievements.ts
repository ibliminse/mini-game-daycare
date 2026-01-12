// Achievements and Leaderboard system

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameEndStats) => boolean;
}

export interface GameEndStats {
  won: boolean;
  timeRemaining: number;
  totalTime: number;
  enrollments: number;
  funding: number;
  level: number;
  difficulty: string;
  iceEncounters: number; // Times player was in same room/hallway as active ICE
  formsCollected: number;
  maxCombo: number; // Max consecutive full-stack drops
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number; // timestamp
}

export interface LeaderboardEntry {
  initials: string;
  score: number;
  level: number;
  difficulty: string;
  date: number; // timestamp
}

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Win with 20+ seconds remaining',
    icon: '⚡',
    condition: (stats) => stats.won && stats.timeRemaining >= 20,
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Win without any ICE encounters',
    icon: '👻',
    condition: (stats) => stats.won && stats.iceEncounters === 0,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Collect all forms in a level',
    icon: '✨',
    condition: (stats) => stats.won && stats.formsCollected >= 9, // 3 rooms * 3 forms minimum
  },
  {
    id: 'hard_mode_hero',
    name: 'Hard Mode Hero',
    description: 'Win on Hard difficulty',
    icon: '🏆',
    condition: (stats) => stats.won && stats.difficulty === 'hard',
  },
  {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Get a 3x combo (3 consecutive full-stack drops)',
    icon: '🔥',
    condition: (stats) => stats.maxCombo >= 3,
  },
  {
    id: 'graduate',
    name: 'Graduate',
    description: 'Complete all 8 levels',
    icon: '🎓',
    condition: (stats) => stats.won && stats.level >= 7,
  },
];

// Local storage keys
const ACHIEVEMENTS_KEY = 'learing_achievements';
const LEADERBOARD_KEY = 'learing_leaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;

// Load unlocked achievements from localStorage
export function loadAchievements(): UnlockedAchievement[] {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save achievements to localStorage
export function saveAchievements(achievements: UnlockedAchievement[]): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch {
    // Ignore storage errors
  }
}

// Check and unlock new achievements based on game stats
export function checkAchievements(stats: GameEndStats): Achievement[] {
  const unlocked = loadAchievements();
  const unlockedIds = new Set(unlocked.map(a => a.id));
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.has(achievement.id) && achievement.condition(stats)) {
      newlyUnlocked.push(achievement);
      unlocked.push({
        id: achievement.id,
        unlockedAt: Date.now(),
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievements(unlocked);
  }

  return newlyUnlocked;
}

// Get all achievements with unlock status
export function getAchievementsWithStatus(): Array<Achievement & { unlocked: boolean }> {
  const unlocked = loadAchievements();
  const unlockedIds = new Set(unlocked.map(a => a.id));

  return ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.has(achievement.id),
  }));
}

// Calculate score for leaderboard
export function calculateScore(stats: GameEndStats): number {
  let score = 0;

  // Base points for enrollments
  score += stats.enrollments * 100;

  // Bonus for time remaining
  score += Math.floor(stats.timeRemaining * 10);

  // Level multiplier
  score *= (1 + stats.level * 0.2);

  // Difficulty multiplier
  const diffMultiplier = stats.difficulty === 'hard' ? 2 : stats.difficulty === 'normal' ? 1.5 : 1;
  score *= diffMultiplier;

  // Combo bonus
  score += stats.maxCombo * 50;

  // Untouchable bonus
  if (stats.iceEncounters === 0) {
    score *= 1.25;
  }

  return Math.floor(score);
}

// Load leaderboard from localStorage
export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const saved = localStorage.getItem(LEADERBOARD_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save leaderboard to localStorage
export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors
  }
}

// Add entry to leaderboard (returns position, or -1 if not high enough)
export function addToLeaderboard(entry: Omit<LeaderboardEntry, 'date'>): number {
  const leaderboard = loadLeaderboard();

  const newEntry: LeaderboardEntry = {
    ...entry,
    date: Date.now(),
  };

  // Find position
  let position = leaderboard.findIndex(e => entry.score > e.score);
  if (position === -1) {
    position = leaderboard.length;
  }

  // Only add if makes top 10
  if (position >= MAX_LEADERBOARD_ENTRIES) {
    return -1;
  }

  // Insert at position
  leaderboard.splice(position, 0, newEntry);

  // Trim to max entries
  const trimmed = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
  saveLeaderboard(trimmed);

  return position;
}

// Check if score qualifies for leaderboard
export function isHighScore(score: number): boolean {
  const leaderboard = loadLeaderboard();
  if (leaderboard.length < MAX_LEADERBOARD_ENTRIES) {
    return true;
  }
  return score > leaderboard[leaderboard.length - 1].score;
}

// Reset all achievements and leaderboard (for testing)
export function resetAll(): void {
  localStorage.removeItem(ACHIEVEMENTS_KEY);
  localStorage.removeItem(LEADERBOARD_KEY);
}
