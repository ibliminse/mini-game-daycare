// Initial state builder

import { GameState, Form, InputState, JoystickState } from './types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  CARRY_CAPACITY,
  FORM_COUNT,
  DESK,
  INSPECTION_TIME,
} from './config';

/**
 * Generate spawn positions for forms, avoiding desk area
 */
function generateFormPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const margin = 40;
  const deskPadding = 50;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      y = margin + Math.random() * (MAP_HEIGHT - margin * 2);
      attempts++;
    } while (
      attempts < 100 &&
      x > DESK.x - deskPadding &&
      x < DESK.x + DESK.width + deskPadding &&
      y > DESK.y - deskPadding &&
      y < DESK.y + DESK.height + deskPadding
    );

    positions.push({ x, y });
  }

  return positions;
}

/**
 * Create the initial game state
 */
export function createInitialState(): GameState {
  const formPositions = generateFormPositions(FORM_COUNT);

  const forms: Form[] = formPositions.map((pos, i) => ({
    id: `form-${i}`,
    x: pos.x,
    y: pos.y,
    collected: false,
  }));

  return {
    phase: 'menu',
    player: {
      x: MAP_WIDTH / 4,
      y: MAP_HEIGHT / 2,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      carrying: 0,
      carryCapacity: CARRY_CAPACITY,
    },
    forms,
    desk: { ...DESK },
    enrollments: 0,
    funding: 0,
    suspicion: 0,
    timeRemaining: INSPECTION_TIME,
  };
}

/**
 * Create fresh input state
 */
export function createInputState(): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

/**
 * Create fresh joystick state
 */
export function createJoystickState(): JoystickState {
  return {
    active: false,
    dx: 0,
    dy: 0,
  };
}
