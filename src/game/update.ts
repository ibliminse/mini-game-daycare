// Pure game update logic

import { GameState, InputState, JoystickState } from './types';
import { getCombinedDirection } from './input';
import { canPickupForm, isPlayerAtDesk, clampToWalkable } from './collisions';
import {
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
    building: {
      ...state.building,
      rooms: state.building.rooms.map((r) => ({ ...r, bounds: { ...r.bounds } })),
      doors: state.building.doors.map((d) => ({ ...d, connects: [...d.connects] as [string, string] })),
    },
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

  // Update player position with wall collision
  if (dx !== 0 || dy !== 0) {
    const newX = newState.player.x + dx * newState.player.speed * dt;
    const newY = newState.player.y + dy * newState.player.speed * dt;

    const clamped = clampToWalkable(
      newX,
      newY,
      newState.player.x,
      newState.player.y,
      newState.player.radius,
      newState.building
    );

    newState.player.x = clamped.x;
    newState.player.y = clamped.y;
  }

  // Update player stress based on suspicion and carrying
  const targetStress = Math.min(1, (newState.suspicion / MAX_SUSPICION) * 0.5 + (newState.player.carrying / CARRY_CAPACITY) * 0.5);
  newState.player.stress += (targetStress - newState.player.stress) * dt * 3;

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

    // Respawn collected forms in classrooms
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
 * Respawn collected forms in classrooms
 */
function respawnForms(state: GameState): void {
  const classrooms = state.building.rooms.filter((r) => r.type === 'classroom');

  for (const form of state.forms) {
    if (form.collected) {
      // Pick a random classroom
      const room = classrooms[Math.floor(Math.random() * classrooms.length)];
      const margin = 30;

      form.x = room.bounds.x + margin + Math.random() * (room.bounds.width - margin * 2);
      form.y = room.bounds.y + margin + Math.random() * (room.bounds.height - margin * 2);
      form.collected = false;
      form.roomId = room.id;
      form.variant = Math.floor(Math.random() * 5);
    }
  }
}
