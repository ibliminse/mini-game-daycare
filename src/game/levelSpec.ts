// Level specification types for the new level system

/**
 * Specification for a hallway in a level
 */
export interface HallwaySpec {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Specification for a room (classroom or office)
 */
export interface RoomSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * ICE agent configuration for a level
 */
export interface IceConfig {
  agentCount: number;           // Number of ICE agents (1-3)
  roomSearchProbability: number; // 0-1, chance to search rooms
  searchDuration: number;        // Seconds spent searching a room
  patrolSpeed?: number;          // Override default patrol speed
}

/**
 * Complete level specification
 */
export interface LevelSpec {
  id: string;
  name: string;
  difficulty: number;           // 1-8
  isCustom: boolean;
  createdAt?: number;

  hallways: HallwaySpec[];
  classrooms: RoomSpec[];
  office: RoomSpec;

  iceConfig: IceConfig;
}

/**
 * Predefined level configurations with balanced difficulty
 *
 * Design principles:
 * - ICE agents capped at 3 (more is overwhelming)
 * - More rooms = more hiding spots = strategic gameplay
 * - Hallways add routing complexity, not more agents
 * - Room search gradually increases (0% to 30%)
 */
export const LEVEL_SPECS: LevelSpec[] = [
  // Level 1: Tutorial - Simple layout, no room search
  {
    id: 'level-1',
    name: 'Tiny Tots Academy',
    difficulty: 1,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 800, height: 80 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 700, y: 50, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 700, y: 350, width: 200, height: 200 },
    iceConfig: { agentCount: 1, roomSearchProbability: 0, searchDuration: 3 },
  },

  // Level 2: Introduce room search
  {
    id: 'level-2',
    name: 'Little Stars Learning',
    difficulty: 2,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 800, height: 80 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 100, y: 350, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 300, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 700, y: 350, width: 200, height: 200 },
    iceConfig: { agentCount: 1, roomSearchProbability: 0.05, searchDuration: 3 },
  },

  // Level 3: Add second hallway, second agent
  {
    id: 'level-3',
    name: 'Rainbow Kids Center',
    difficulty: 3,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 600, height: 80 },
      { id: 'hallway-2', x: 620, y: 260, width: 80, height: 290 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 100, y: 350, width: 180, height: 200 },
      { id: 'room-e', name: 'Room E', x: 300, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 710, y: 350, width: 180, height: 200 },
    iceConfig: { agentCount: 2, roomSearchProbability: 0.10, searchDuration: 3 },
  },

  // Level 4: More strategic routing
  {
    id: 'level-4',
    name: 'Sunshine Daycare',
    difficulty: 4,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 800, height: 80 },
      { id: 'hallway-2', x: 400, y: 50, width: 80, height: 290 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 500, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 700, y: 50, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 100, y: 350, width: 180, height: 200 },
      { id: 'room-e', name: 'Room E', x: 300, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 700, y: 350, width: 180, height: 200 },
    iceConfig: { agentCount: 2, roomSearchProbability: 0.15, searchDuration: 3.5 },
  },

  // Level 5: Complex 3-hallway layout
  {
    id: 'level-5',
    name: 'Happy Hearts Academy',
    difficulty: 5,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 500, height: 80 },
      { id: 'hallway-2', x: 520, y: 100, width: 80, height: 240 },
      { id: 'hallway-3', x: 520, y: 260, width: 380, height: 80 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 610, y: 50, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 100, y: 350, width: 180, height: 200 },
      { id: 'room-e', name: 'Room E', x: 300, y: 350, width: 180, height: 200 },
      { id: 'room-f', name: 'Room F', x: 610, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 800, y: 50, width: 150, height: 200 },
    iceConfig: { agentCount: 2, roomSearchProbability: 0.15, searchDuration: 3.5 },
  },

  // Level 6: Third agent introduced
  {
    id: 'level-6',
    name: 'Bright Futures Center',
    difficulty: 6,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 50, y: 260, width: 900, height: 80 },
      { id: 'hallway-2', x: 50, y: 50, width: 80, height: 290 },
      { id: 'hallway-3', x: 800, y: 50, width: 80, height: 290 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 140, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 340, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 540, y: 50, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 140, y: 350, width: 180, height: 200 },
      { id: 'room-e', name: 'Room E', x: 340, y: 350, width: 180, height: 200 },
      { id: 'room-f', name: 'Room F', x: 540, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 800, y: 350, width: 150, height: 200 },
    iceConfig: { agentCount: 3, roomSearchProbability: 0.20, searchDuration: 4 },
  },

  // Level 7: Maze-like 4-hallway layout
  {
    id: 'level-7',
    name: 'Growing Minds School',
    difficulty: 7,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 50, y: 50, width: 80, height: 500 },
      { id: 'hallway-2', x: 50, y: 50, width: 900, height: 80 },  // Extended to reach office
      { id: 'hallway-3', x: 50, y: 260, width: 500, height: 80 },
      { id: 'hallway-4', x: 50, y: 470, width: 700, height: 80 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 140, y: 140, width: 160, height: 110 },
      { id: 'room-b', name: 'Room B', x: 320, y: 140, width: 160, height: 110 },
      { id: 'room-c', name: 'Room C', x: 500, y: 140, width: 160, height: 110 },
      { id: 'room-d', name: 'Room D', x: 140, y: 350, width: 160, height: 110 },
      { id: 'room-e', name: 'Room E', x: 320, y: 350, width: 160, height: 110 },
    ],
    office: { id: 'office', name: 'Office', x: 800, y: 140, width: 150, height: 150 },  // Moved below hallway
    iceConfig: { agentCount: 3, roomSearchProbability: 0.25, searchDuration: 4 },
  },

  // Level 8: Final challenge
  {
    id: 'level-8',
    name: 'Community Kids Campus',
    difficulty: 8,
    isCustom: false,
    hallways: [
      { id: 'hallway-1', x: 50, y: 260, width: 900, height: 80 },
      { id: 'hallway-2', x: 50, y: 50, width: 80, height: 290 },
      { id: 'hallway-3', x: 420, y: 50, width: 80, height: 290 },
      { id: 'hallway-4', x: 800, y: 50, width: 80, height: 290 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 140, y: 50, width: 180, height: 200 },
      { id: 'room-b', name: 'Room B', x: 510, y: 50, width: 180, height: 200 },
      { id: 'room-c', name: 'Room C', x: 140, y: 350, width: 180, height: 200 },
      { id: 'room-d', name: 'Room D', x: 510, y: 350, width: 180, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 800, y: 350, width: 150, height: 200 },
    iceConfig: { agentCount: 3, roomSearchProbability: 0.30, searchDuration: 4.5 },
  },
];

/**
 * Get a level spec by index (0-7 for predefined levels)
 */
export function getLevelSpec(index: number): LevelSpec {
  const validIndex = Math.max(0, Math.min(index, LEVEL_SPECS.length - 1));
  return LEVEL_SPECS[validIndex];
}

/**
 * Create a blank level spec for the editor
 */
export function createBlankLevelSpec(name: string = 'New Level'): LevelSpec {
  return {
    id: `custom-${Date.now()}`,
    name,
    difficulty: 1,
    isCustom: true,
    createdAt: Date.now(),
    hallways: [
      { id: 'hallway-1', x: 100, y: 260, width: 600, height: 80 },
    ],
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 200, height: 200 },
    ],
    office: { id: 'office', name: 'Office', x: 500, y: 350, width: 200, height: 200 },
    iceConfig: { agentCount: 1, roomSearchProbability: 0, searchDuration: 3 },
  };
}
