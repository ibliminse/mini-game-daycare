// Daily Challenges System

export interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  reward: number; // funding reward
  statKey: keyof DailyStats;
}

export interface DailyStats {
  formsCollected: number;
  gamesWon: number;
  fundingEarned: number;
  levelsCompleted: number;
  perfectRuns: number; // wins with 0 ICE encounters
  hardModeWins: number;
}

export interface DailyProgress {
  date: string; // YYYY-MM-DD format
  stats: DailyStats;
  completedChallenges: string[]; // challenge IDs
  claimedRewards: string[]; // challenge IDs that had rewards claimed
}

// Challenge pool - 3 random ones are selected each day
const CHALLENGE_POOL: DailyChallenge[] = [
  {
    id: 'forms_25',
    name: 'Paper Pusher',
    description: 'Collect 25 forms today',
    icon: '📋',
    target: 25,
    reward: 50,
    statKey: 'formsCollected',
  },
  {
    id: 'forms_50',
    name: 'Enrollment Expert',
    description: 'Collect 50 forms today',
    icon: '📚',
    target: 50,
    reward: 100,
    statKey: 'formsCollected',
  },
  {
    id: 'wins_3',
    name: 'Triple Threat',
    description: 'Win 3 games today',
    icon: '🏆',
    target: 3,
    reward: 75,
    statKey: 'gamesWon',
  },
  {
    id: 'wins_5',
    name: 'Unstoppable',
    description: 'Win 5 games today',
    icon: '⭐',
    target: 5,
    reward: 125,
    statKey: 'gamesWon',
  },
  {
    id: 'funding_100',
    name: 'Money Maker',
    description: 'Earn $100 in funding today',
    icon: '💰',
    target: 100,
    reward: 50,
    statKey: 'fundingEarned',
  },
  {
    id: 'funding_250',
    name: 'Big Spender',
    description: 'Earn $250 in funding today',
    icon: '💎',
    target: 250,
    reward: 100,
    statKey: 'fundingEarned',
  },
  {
    id: 'levels_3',
    name: 'Level Crusher',
    description: 'Complete 3 different levels today',
    icon: '🎯',
    target: 3,
    reward: 75,
    statKey: 'levelsCompleted',
  },
  {
    id: 'perfect_1',
    name: 'Ghost Mode',
    description: 'Win without any ICE encounters',
    icon: '👻',
    target: 1,
    reward: 100,
    statKey: 'perfectRuns',
  },
  {
    id: 'hard_1',
    name: 'Hardcore',
    description: 'Win on Hard difficulty',
    icon: '🔥',
    target: 1,
    reward: 75,
    statKey: 'hardModeWins',
  },
  {
    id: 'hard_3',
    name: 'Hard Grinder',
    description: 'Win 3 games on Hard difficulty',
    icon: '💪',
    target: 3,
    reward: 150,
    statKey: 'hardModeWins',
  },
];

const DAILY_PROGRESS_KEY = 'learing_daily_progress';
const CHALLENGES_PER_DAY = 3;

// Get today's date string in YYYY-MM-DD format
function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Seed random number generator based on date for consistent daily challenges
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Get challenges for a specific date
export function getDailyChallenges(dateString?: string): DailyChallenge[] {
  const date = dateString || getTodayString();
  // Create seed from date
  const seed = date.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0) * 1000;
  const random = seededRandom(seed);

  // Shuffle and pick challenges
  const shuffled = [...CHALLENGE_POOL].sort(() => random() - 0.5);
  return shuffled.slice(0, CHALLENGES_PER_DAY);
}

// Load daily progress from localStorage
export function loadDailyProgress(): DailyProgress {
  const today = getTodayString();

  try {
    const saved = localStorage.getItem(DAILY_PROGRESS_KEY);
    if (saved) {
      const progress: DailyProgress = JSON.parse(saved);
      // Check if it's still today's progress
      if (progress.date === today) {
        return progress;
      }
    }
  } catch {
    // Ignore errors
  }

  // Return fresh progress for today
  return {
    date: today,
    stats: {
      formsCollected: 0,
      gamesWon: 0,
      fundingEarned: 0,
      levelsCompleted: 0,
      perfectRuns: 0,
      hardModeWins: 0,
    },
    completedChallenges: [],
    claimedRewards: [],
  };
}

// Save daily progress to localStorage
export function saveDailyProgress(progress: DailyProgress): void {
  try {
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore errors
  }
}

// Update stats after a game ends
export function updateDailyStats(
  formsCollected: number,
  won: boolean,
  fundingEarned: number,
  level: number,
  iceEncounters: number,
  difficulty: string
): { progress: DailyProgress; newlyCompleted: DailyChallenge[] } {
  const progress = loadDailyProgress();
  const challenges = getDailyChallenges(progress.date);

  // Update stats
  progress.stats.formsCollected += formsCollected;
  progress.stats.fundingEarned += fundingEarned;

  if (won) {
    progress.stats.gamesWon += 1;

    // Track unique levels completed (using a simple approach)
    // We increment but cap at the number of levels
    progress.stats.levelsCompleted = Math.min(8, progress.stats.levelsCompleted + 1);

    if (iceEncounters === 0) {
      progress.stats.perfectRuns += 1;
    }

    if (difficulty === 'hard') {
      progress.stats.hardModeWins += 1;
    }
  }

  // Check for newly completed challenges
  const newlyCompleted: DailyChallenge[] = [];
  for (const challenge of challenges) {
    if (!progress.completedChallenges.includes(challenge.id)) {
      const currentValue = progress.stats[challenge.statKey];
      if (currentValue >= challenge.target) {
        progress.completedChallenges.push(challenge.id);
        newlyCompleted.push(challenge);
      }
    }
  }

  saveDailyProgress(progress);

  return { progress, newlyCompleted };
}

// Claim reward for a completed challenge
export function claimChallengeReward(challengeId: string): number {
  const progress = loadDailyProgress();
  const challenges = getDailyChallenges(progress.date);

  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) return 0;

  // Check if completed but not claimed
  if (
    progress.completedChallenges.includes(challengeId) &&
    !progress.claimedRewards.includes(challengeId)
  ) {
    progress.claimedRewards.push(challengeId);
    saveDailyProgress(progress);
    return challenge.reward;
  }

  return 0;
}

// Get challenge status for display
export interface ChallengeStatus {
  challenge: DailyChallenge;
  current: number;
  completed: boolean;
  claimed: boolean;
}

export function getChallengeStatuses(): ChallengeStatus[] {
  const progress = loadDailyProgress();
  const challenges = getDailyChallenges(progress.date);

  return challenges.map(challenge => ({
    challenge,
    current: Math.min(progress.stats[challenge.statKey], challenge.target),
    completed: progress.completedChallenges.includes(challenge.id),
    claimed: progress.claimedRewards.includes(challenge.id),
  }));
}

// Get time until daily reset (midnight)
export function getTimeUntilReset(): { hours: number; minutes: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}
