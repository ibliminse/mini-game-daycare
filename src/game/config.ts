// Game configuration constants

// Map dimensions
export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 540;

// Player settings
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 220; // pixels per second
export const CARRY_CAPACITY = 3;

// Forms
export const FORM_COUNT = 12;
export const FORM_RADIUS = 10;
export const PICKUP_DISTANCE = 22;

// Desk (drop-off zone)
export const DESK = {
  x: 650,
  y: 380,
  width: 200,
  height: 120,
};

// Scoring
export const FUNDING_PER_FORM = 1;
export const ENROLLMENT_PER_FORM = 1;
export const SUSPICION_PER_FORM = 1;
export const CAPACITY_BONUS_SUSPICION = 3; // bonus when dropping full capacity

// Suspicion
export const PASSIVE_SUSPICION_RATE = 0.3; // per second
export const MAX_SUSPICION = 100;
export const WARNING_THRESHOLD = 70; // show warning banner

// Timer
export const INSPECTION_TIME = 75; // seconds

// Colors
export const COLORS = {
  floor: '#f5f0e6',
  wall: '#8b7355',
  player: '#4a90d9',
  playerOutline: '#2d5a87',
  form: '#ffd700',
  formOutline: '#b8860b',
  desk: '#4a5568',
  deskTop: '#718096',
  deskGlow: 'rgba(74, 222, 128, 0.4)',
  formStack: '#ffec8b',
};
