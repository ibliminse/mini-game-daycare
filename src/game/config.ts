// Game configuration constants

// Map dimensions (larger for building layout)
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 600;

// Player settings
export const PLAYER_RADIUS = 12;
export const PLAYER_SPEED = 180; // pixels per second
export const CARRY_CAPACITY = 3;

// Forms
export const FORMS_PER_ROOM = 3;
export const FORM_RADIUS = 8;
export const PICKUP_DISTANCE = 20;

// Wall settings
export const WALL_THICKNESS = 8;

// Scoring
export const FUNDING_PER_FORM = 5; // money per form for upgrades
export const ENROLLMENT_PER_FORM = 1;
export const SUSPICION_REDUCTION_PER_FORM = 8; // how much suspicion decreases per form
export const CAPACITY_BONUS_REDUCTION = 3; // extra reduction for full stack

// Suspicion (starts at 50, need to get to 30 or below to win)
export const INITIAL_SUSPICION = 50;
export const LOSE_THRESHOLD = 30; // if above this at end, you lose
export const PASSIVE_SUSPICION_RATE = 0.8; // suspicion creeps up per second (faster)
export const MAX_SUSPICION = 100;
export const WARNING_THRESHOLD = 50; // warning when above this

// Upgrades
export const UPGRADE_COSTS = {
  carryCapacity: 10, // cost per extra slot
  sprint: 15, // speed boost
  noIce: 25, // no ICE spawns
};
export const MAX_CARRY_CAPACITY = 10;
export const SPRINT_DURATION = 5; // seconds
export const SPRINT_SPEED_MULTIPLIER = 1.5;
export const NO_ICE_DURATION = 10; // seconds

// Timer
export const INSPECTION_TIME = 45; // 45 seconds per level

// Somali Daycare Color Palette
// Somali flag: Light blue (#4189DD) and white
export const COLORS = {
  // Floors
  hallwayFloor: '#f4e4bc',      // Beige linoleum
  classroomFloor: '#b8d4e8',    // Light blue carpet (Somali theme)
  officeFloor: '#d4c4a8',       // Tan tile

  // Walls
  wall: '#4189DD',              // Somali blue walls
  wallTrim: '#3070b8',          // Darker blue trim

  // Player (stressed Somali adult)
  playerShirt: '#1a5c2e',       // Green shirt
  playerPants: '#2d2d2d',       // Dark pants
  playerSkin: '#8d5524',        // Somali skin tone
  playerHair: '#1a1a1a',        // Black hair
  playerHijab: '#9b59b6',       // Optional hijab color
  playerSweat: '#7ec8e3',       // Sweat drops

  // Forms (kid drawings)
  formPaper: '#fff',            // White paper
  formCrayon: ['#4189DD', '#1dd1a1', '#feca57', '#ff6b6b', '#9b59b6'], // Crayon colors

  // Desk (messy office)
  desk: '#8b6914',              // Wood desk
  deskTop: '#c49a22',           // Lighter wood top
  deskGlow: 'rgba(46, 213, 115, 0.5)', // Green glow

  // Decorations
  bulletinBoard: '#cd853f',     // Cork board brown
  constructionPaper: ['#4189DD', '#feca57', '#1dd1a1', '#ff6b6b', '#9b59b6', '#fff'],

  // ICE Agent
  iceShirt: '#1a3a1a',          // Dark green uniform
  icePants: '#0d1f0d',          // Very dark green
  iceSkin: '#f5d0c5',           // Skin tone
  iceVest: '#2d2d2d',           // Black vest
  iceText: '#ffd700',           // "ICE" text color

  // Posters
  posterRed: '#c0392b',
  posterWhite: '#fff',

  // UI
  uiPaper: '#fffef0',           // Slightly off-white
  uiCrayon: '#2d3436',          // Dark crayon for text
  uiRed: '#c0392b',
  uiYellow: '#feca57',
  uiBlue: '#4189DD',            // Somali blue
  uiGreen: '#1dd1a1',
  uiPink: '#9b59b6',
};

// ICE Agent settings
export const ICE_AGENT = {
  speed: 120, // pixels per second
  duration: 12, // seconds active (longer patrol)
  spawnInterval: 20, // seconds between spawns
  warningTime: 3, // seconds warning before ICE appears
  visionDistance: 200, // how far they can see (wider)
  visionAngle: 60, // degrees field of view (30 each side)
};

// Level Layouts - All fit within 1000x600 canvas
// Each room must be adjacent to a hallway (within 30px gap)
export const LEVELS = [
  // Level 1: Simple straight hallway - 2 classrooms (tutorial)
  {
    name: 'Tiny Tots Academy',
    hallway: { x: 100, y: 260, width: 600, height: 80 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 250, height: 210 },
      { id: 'room-b', name: 'Room B', x: 400, y: 50, width: 250, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 400, y: 340, width: 250, height: 210 },
  },
  // Level 2: Longer hallway - 3 classrooms
  {
    name: 'Little Stars Learning',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 220, height: 210 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 220, height: 210 },
      { id: 'room-c', name: 'Room C', x: 50, y: 340, width: 220, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 730, y: 340, width: 220, height: 210 },
  },
  // Level 3: L-shaped hallway - 4 classrooms
  {
    name: 'Rainbow Kids Center',
    hallway: { x: 50, y: 260, width: 700, height: 80 },
    hallway2: { x: 670, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 510, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 50, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 300, y: 340, width: 200, height: 210 },
  },
  // Level 4: T-shaped - 4 classrooms
  {
    name: 'Sunshine Daycare',
    hallway: { x: 50, y: 260, width: 900, height: 80 },      // Main horizontal
    hallway2: { x: 420, y: 50, width: 80, height: 290 },     // Vertical up (overlaps at y=260-340)
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 180, height: 210 },
      { id: 'room-b', name: 'Room B', x: 240, y: 50, width: 180, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 210 },
      { id: 'room-d', name: 'Room D', x: 690, y: 50, width: 180, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 750, y: 340, width: 200, height: 210 },
  },
  // Level 5: 5 classrooms
  {
    name: 'Happy Hearts Academy',
    hallway: { x: 50, y: 260, width: 600, height: 80 },
    hallway2: { x: 570, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 510, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 50, y: 340, width: 200, height: 210 },
      { id: 'room-e', name: 'Room E', x: 280, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 650, y: 340, width: 200, height: 210 },
  },
  // Level 6: H-shaped - 6 classrooms
  {
    name: 'Bright Futures Center',
    hallway: { x: 50, y: 260, width: 900, height: 80 },      // Main horizontal
    hallway2: { x: 50, y: 50, width: 80, height: 290 },      // Left vertical
    hallway3: { x: 800, y: 50, width: 80, height: 290 },     // Right vertical
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 130, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 350, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 570, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 130, y: 340, width: 200, height: 210 },
      { id: 'room-e', name: 'Room E', x: 350, y: 340, width: 200, height: 210 },
      { id: 'room-f', name: 'Room F', x: 570, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 880, y: 50, width: 70, height: 210 },
  },
  // Level 7: E-shaped - 6 classrooms
  {
    name: 'Growing Minds School',
    hallway: { x: 50, y: 50, width: 80, height: 500 },       // Main vertical on left
    hallway2: { x: 50, y: 50, width: 400, height: 80 },      // Top horizontal
    hallway3: { x: 50, y: 260, width: 400, height: 80 },     // Middle horizontal
    hallway4: { x: 50, y: 470, width: 400, height: 80 },     // Bottom horizontal
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 130, y: 130, width: 180, height: 130 },
      { id: 'room-b', name: 'Room B', x: 330, y: 130, width: 180, height: 130 },
      { id: 'room-c', name: 'Room C', x: 530, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 530, y: 260, width: 200, height: 130 },
      { id: 'room-e', name: 'Room E', x: 130, y: 340, width: 180, height: 130 },
      { id: 'room-f', name: 'Room F', x: 330, y: 340, width: 180, height: 130 },
    ],
    office: { id: 'office', name: 'Office', x: 530, y: 390, width: 200, height: 160 },
  },
  // Level 8: Maze layout - 8 classrooms (hardest)
  {
    name: 'Community Kids Campus',
    hallway: { x: 50, y: 260, width: 900, height: 80 },      // Main horizontal
    hallway2: { x: 50, y: 50, width: 80, height: 290 },      // Left vertical
    hallway3: { x: 420, y: 50, width: 80, height: 290 },     // Center vertical
    hallway4: { x: 800, y: 50, width: 80, height: 290 },     // Right vertical
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 130, y: 50, width: 150, height: 210 },
      { id: 'room-b', name: 'Room B', x: 290, y: 50, width: 130, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 150, height: 210 },
      { id: 'room-d', name: 'Room D', x: 660, y: 50, width: 130, height: 210 },
      { id: 'room-e', name: 'Room E', x: 130, y: 340, width: 150, height: 210 },
      { id: 'room-f', name: 'Room F', x: 290, y: 340, width: 130, height: 210 },
      { id: 'room-g', name: 'Room G', x: 500, y: 340, width: 150, height: 210 },
      { id: 'room-h', name: 'Room H', x: 660, y: 340, width: 130, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 880, y: 50, width: 70, height: 210 },
  },
];

// Current level (for backwards compatibility)
export const BUILDING = LEVELS[0];

// Desk location (inside office) - calculated dynamically per level
export const DESK = {
  x: BUILDING.office.x + 40,
  y: BUILDING.office.y + 60,
  width: 100,
  height: 80,
};
