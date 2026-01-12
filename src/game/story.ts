// Story Mode - Dark comedy news headlines

export interface StoryScreen {
  headline: string;
  subheadline?: string;
  source: string;
  details?: string;
}

export interface LevelStory {
  levelIndex: number;
  before: StoryScreen[];  // Shown before level starts
}

export interface Ending {
  id: 'bad' | 'good' | 'best';
  title: string;
  screens: StoryScreen[];
  minScore: number;  // Minimum combo score needed
}

// Opening story - shown before Level 1
export const INTRO_STORY: StoryScreen[] = [
  {
    headline: "FEDERAL AGENCY LAUNCHES 'OPERATION NAPTIME'",
    subheadline: "ICE announces crackdown on 'suspiciously affordable childcare'",
    source: "The National Sentinel",
    details: "\"These daycares are too good to be true,\" says regional director. \"Nobody offers quality childcare at reasonable prices unless they're hiding something.\""
  },
  {
    headline: "YOU HAVE BEEN SELECTED",
    subheadline: "For mandatory volunteer community service",
    source: "DEPT. OF HOMELAND DAYCARE SECURITY - MEMO",
    details: "Your mission: Ensure enrollment paperwork is PERFECT before inspectors arrive. Any irregularities will result in... consequences."
  }
];

// Per-level story content
export const LEVEL_STORIES: LevelStory[] = [
  {
    levelIndex: 0,
    before: [{
      headline: "TINY TOTS ACADEMY UNDER INVESTIGATION",
      subheadline: "Anonymous tip claims children are 'learning shapes in Spanish'",
      source: "Local News 7",
      details: "\"We received reports of bilingual ABCs,\" says ICE spokesperson. \"This is exactly the kind of thing we're looking for.\""
    }]
  },
  {
    levelIndex: 1,
    before: [{
      headline: "LITTLE STARS LEARNING: A DEN OF... SHARING?",
      subheadline: "Investigators allege 'socialist snack distribution'",
      source: "Freedom Eagle News",
      details: "\"Every child gets the same amount of goldfish crackers regardless of merit,\" reports shocked inspector. \"This is un-American.\""
    }]
  },
  {
    levelIndex: 2,
    before: [{
      headline: "RAINBOW KIDS CENTER LINKED TO 'CULTURAL ACTIVITIES'",
      subheadline: "Sources confirm presence of 'ethnic food' at lunch",
      source: "The Daily Patriot",
      details: "\"We found evidence of rice AND beans being served together,\" says lead investigator. \"Sometimes with plantains.\""
    }]
  },
  {
    levelIndex: 3,
    before: [{
      headline: "SUNSHINE DAYCARE: THE PLOT THICKENS",
      subheadline: "Children reportedly 'too happy' according to federal metrics",
      source: "American Truth Network",
      details: "\"Normal American children should be stressed about standardized testing by age 4,\" explains child development expert hired by ICE."
    }]
  },
  {
    levelIndex: 4,
    before: [{
      headline: "BREAKING: HAPPY HEARTS ACADEMY TEACHES 'KINDNESS'",
      subheadline: "Curriculum includes 'being nice to everyone' - a known gateway ideology",
      source: "The National Sentinel",
      details: "\"First they learn to share toys, next thing you know they want healthcare for all,\" warns concerned parent group."
    }]
  },
  {
    levelIndex: 5,
    before: [{
      headline: "BRIGHT FUTURES CENTER EMPLOYEES SPEAK MULTIPLE LANGUAGES",
      subheadline: "ICE director calls it 'deeply concerning'",
      source: "Real American Herald",
      details: "\"How are we supposed to know what they're saying?\" asks official. \"They could be teaching kids anything. Colors. Numbers. Manners.\""
    }]
  },
  {
    levelIndex: 6,
    before: [{
      headline: "GROWING MINDS SCHOOL: THE FINAL STRAW",
      subheadline: "Art class reportedly includes 'flags from other countries'",
      source: "The Homeland Guardian",
      details: "\"There was a world map on the wall,\" recalls traumatized inspector. \"With ALL the countries. Even the ones we don't like.\""
    }]
  },
  {
    levelIndex: 7,
    before: [{
      headline: "COMMUNITY KIDS CAMPUS: THE LAST STAND",
      subheadline: "Operation Naptime reaches its 'final phase'",
      source: "CLASSIFIED INTERNAL MEMO - LEAKED",
      details: "\"If this daycare falls, they all fall. The community has been too organized. Send everyone.\" - [REDACTED]"
    }]
  }
];

// Multiple endings based on performance
export const ENDINGS: Ending[] = [
  {
    id: 'bad',
    title: 'OPERATION NAPTIME: MISSION ACCOMPLISHED',
    minScore: 0,
    screens: [
      {
        headline: "SEVERAL DAYCARES SHUTTERED IN FEDERAL SWEEP",
        subheadline: "Officials celebrate 'protecting children from affordable education'",
        source: "The National Sentinel",
        details: "\"Today we made America safer from people who care for children while their parents work,\" announces proud director."
      },
      {
        headline: "COMMUNITY VOWS TO REBUILD",
        subheadline: "\"They can close buildings, but they can't close hearts,\" says local organizer",
        source: "Community Voice Newsletter",
        details: "The fight continues. There's always next time."
      }
    ]
  },
  {
    id: 'good',
    title: 'A SMALL VICTORY',
    minScore: 5000,
    screens: [
      {
        headline: "OPERATION NAPTIME 'INCONCLUSIVE', ADMITS ICE",
        subheadline: "Paperwork 'frustratingly in order' at most locations",
        source: "The Daily Tribune",
        details: "\"We found nothing actionable,\" grumbles spokesperson. \"These people are annoyingly organized.\""
      },
      {
        headline: "DAYCARES CELEBRATE QUIET VICTORY",
        subheadline: "Children continue learning, playing, and being suspiciously happy",
        source: "Community Voice Newsletter",
        details: "For now, the doors stay open. But everyone knows they'll be back."
      }
    ]
  },
  {
    id: 'best',
    title: 'THEY REALLY DID IT',
    minScore: 12000,
    screens: [
      {
        headline: "OPERATION NAPTIME CANCELLED AFTER 'SPECTACULAR FAILURE'",
        subheadline: "Director reassigned to 'reviewing parking violations in Alaska'",
        source: "The Washington Herald",
        details: "\"In retrospect, targeting daycares made us look like villains,\" admits internal review. \"Who could have predicted that?\""
      },
      {
        headline: "COMMUNITY THROWS MASSIVE BLOCK PARTY",
        subheadline: "Children, parents, and workers celebrate together",
        source: "Community Voice Newsletter",
        details: "\"Nabad iyo caano,\" cheers echo through the streets. Peace and prosperity. They said it couldn't be done."
      },
      {
        headline: "YOU DID IT",
        subheadline: "Every form filed. Every child safe. Every family together.",
        source: "Thank You",
        details: "The paperwork never stops. But today? Today was a good day."
      }
    ]
  }
];

// Calculate ending based on performance across all levels
export interface FinalStats {
  totalFunding: number;
  totalEnrollments: number;
  averageTimeRemaining: number;
  difficulty: 'easy' | 'normal' | 'hard';
  levelsCompleted: number;
}

export function calculateEndingScore(stats: FinalStats): number {
  let score = 0;

  // Base score from funding
  score += stats.totalFunding * 2;

  // Enrollment bonus
  score += stats.totalEnrollments * 50;

  // Time bonus (average seconds remaining * 100)
  score += Math.floor(stats.averageTimeRemaining * 100);

  // Difficulty multiplier
  const diffMultiplier = stats.difficulty === 'hard' ? 2 : stats.difficulty === 'normal' ? 1.5 : 1;
  score = Math.floor(score * diffMultiplier);

  // Completion bonus
  if (stats.levelsCompleted >= 8) {
    score += 2000;
  }

  return score;
}

export function getEnding(score: number): Ending {
  // Sort by minScore descending and find first one where score qualifies
  const sorted = [...ENDINGS].sort((a, b) => b.minScore - a.minScore);
  for (const ending of sorted) {
    if (score >= ending.minScore) {
      return ending;
    }
  }
  return ENDINGS[0]; // Default to bad ending
}

// Get story for a specific level
export function getLevelStory(levelIndex: number): StoryScreen[] | null {
  const story = LEVEL_STORIES.find(s => s.levelIndex === levelIndex);
  return story?.before || null;
}
