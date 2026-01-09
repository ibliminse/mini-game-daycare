// Pure game update logic

import { GameState, InputState, JoystickState } from './types';
import { getCombinedDirection } from './input';
import { canPickupForm, isPlayerAtDesk, clampToMap } from './collisions';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  FUNDING_PER_FORM,
  ENROLLMENT_PER_FORM,
  SUSPICION_PER_FORM,
  CAPACITY_BONUS_SUSPICION,
  PASSIVE_SUSPICION_RATE,
  MAX_SUSPICION,
  CARRY_CAPACITY,
} from './config';

/**
 * Deep clone game state
 */
function cloneState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    forms: state.forms.map((f) => ({ ...f })),
    desk: { ...state.desk },
  };
}

/**
 * Update game state by one frame
 */
export function updateGame(
  state: GameState,
  input: InputState,
  joystick: JoystickState,
  deltaTime: number
): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const newState = cloneState(state);
  const dt = deltaTime / 1000; // convert to seconds

  // Get movement direction
  const { dx, dy } = getCombinedDirection(input, joystick);

  // Update player position
  if (dx !== 0 || dy !== 0) {
    const newX = newState.player.x + dx * newState.player.speed * dt;
    const newY = newState.player.y + dy * newState.player.speed * dt;

    const clamped = clampToMap(newX, newY, newState.player.radius, MAP_WIDTH, MAP_HEIGHT);
    newState.player.x = clamped.x;
    newState.player.y = clamped.y;
  }

  // Check form pickups
  if (newState.player.carrying < newState.player.carryCapacity) {
    for (const form of newState.forms) {
      if (canPickupForm(newState.player, form)) {
        form.collected = true;
        newState.player.carrying++;

        if (newState.player.carrying >= newState.player.carryCapacity) {
          break;
        }
      }
    }
  }

  // Check desk drop-off (auto-drop)
  if (isPlayerAtDesk(newState.player, newState.desk) && newState.player.carrying > 0) {
    const formsDropped = newState.player.carrying;

    // Calculate suspicion bonus for dropping full capacity
    const capacityBonus =
      formsDropped >= CARRY_CAPACITY ? CAPACITY_BONUS_SUSPICION : 0;

    newState.enrollments += formsDropped * ENROLLMENT_PER_FORM;
    newState.funding += formsDropped * FUNDING_PER_FORM;
    newState.suspicion += formsDropped * SUSPICION_PER_FORM + capacityBonus;
    newState.player.carrying = 0;

    // Respawn collected forms at new positions
    respawnForms(newState);
  }

  // Update timer
  newState.timeRemaining -= dt;

  // Passive suspicion increase
  newState.suspicion += PASSIVE_SUSPICION_RATE * dt;

  // Clamp suspicion
  newState.suspicion = Math.min(MAX_SUSPICION, newState.suspicion);

  // Check win/lose conditions
  if (newState.suspicion >= MAX_SUSPICION) {
    newState.phase = 'lose';
  } else if (newState.timeRemaining <= 0) {
    newState.timeRemaining = 0;
    newState.phase = 'win';
  }

  return newState;
}

/**
 * Respawn collected forms at new random positions
 */
function respawnForms(state: GameState): void {
  const margin = 40;
  const deskPadding = 50;

  for (const form of state.forms) {
    if (form.collected) {
      let x: number, y: number;
      let attempts = 0;

      do {
        x = margin + Math.random() * (MAP_WIDTH - margin * 2);
        y = margin + Math.random() * (MAP_HEIGHT - margin * 2);
        attempts++;
      } while (
        attempts < 100 &&
        x > state.desk.x - deskPadding &&
        x < state.desk.x + state.desk.width + deskPadding &&
        y > state.desk.y - deskPadding &&
        y < state.desk.y + state.desk.height + deskPadding
      );

      form.x = x;
      form.y = y;
      form.collected = false;
    }
  }
}
