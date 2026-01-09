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
export const FUNDING_PER_FORM = 1;
export const ENROLLMENT_PER_FORM = 1;
export const SUSPICION_PER_FORM = 1;
export const CAPACITY_BONUS_SUSPICION = 3;

// Suspicion
export const PASSIVE_SUSPICION_RATE = 0.25; // per second (slightly slower for bigger map)
export const MAX_SUSPICION = 100;
export const WARNING_THRESHOLD = 70;

// Timer
export const INSPECTION_TIME = 90; // more time for bigger map

// Preschool Chaos Color Palette
export const COLORS = {
  // Floors
  hallwayFloor: '#f4e4bc',      // Beige linoleum
  classroomFloor: '#a8d5a2',    // Green carpet (like grass)
  officeFloor: '#d4c4a8',       // Tan tile

  // Walls
  wall: '#ff6b6b',              // Bright coral/red walls
  wallTrim: '#ee5a5a',          // Slightly darker trim

  // Player (stressed adult)
  playerShirt: '#4a90d9',       // Blue polo shirt
  playerPants: '#2d2d2d',       // Dark pants
  playerSkin: '#f5d0c5',        // Skin tone
  playerHair: '#4a3728',        // Brown hair
  playerSweat: '#7ec8e3',       // Sweat drops

  // Forms (kid drawings)
  formPaper: '#fff',            // White paper
  formCrayon: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3'], // Crayon colors

  // Desk (messy office)
  desk: '#8b6914',              // Wood desk
  deskTop: '#c49a22',           // Lighter wood top
  deskGlow: 'rgba(46, 213, 115, 0.5)', // Green glow

  // Decorations
  bulletinBoard: '#cd853f',     // Cork board brown
  constructionPaper: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#a55eea'],

  // UI
  uiPaper: '#fffef0',           // Slightly off-white
  uiCrayon: '#2d3436',          // Dark crayon for text
  uiRed: '#ff6b6b',
  uiYellow: '#feca57',
  uiBlue: '#48dbfb',
  uiGreen: '#1dd1a1',
  uiPink: '#ff9ff3',
};

// Building Layout - rooms connect directly to hallway (no gap)
export const BUILDING = {
  hallway: {
    x: 100,
    y: 250,
    width: 800,
    height: 100,
  },
  classrooms: [
    // Top rooms - bottom edge touches hallway top
    { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 180, height: 200 },
    { id: 'room-b', name: 'Room B', x: 320, y: 50, width: 180, height: 200 },
    { id: 'room-c', name: 'Room C', x: 540, y: 50, width: 180, height: 200 },
    // Bottom rooms - top edge touches hallway bottom (y = 250 + 100 = 350)
    { id: 'room-d', name: 'Room D', x: 100, y: 350, width: 180, height: 200 },
    { id: 'room-e', name: 'Room E', x: 320, y: 350, width: 180, height: 200 },
  ],
  office: {
    id: 'office',
    name: 'Office',
    x: 760,
    y: 350,
    width: 180,
    height: 200,
  },
};

// Desk location (inside office)
export const DESK = {
  x: BUILDING.office.x + 40,
  y: BUILDING.office.y + 60,
  width: 100,
  height: 80,
};
