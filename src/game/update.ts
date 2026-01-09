// Pure game update logic

import { GameState, InputState, JoystickState, IceAgent } from './types';
import { getCombinedDirection } from './input';
import { canPickupForm, isPlayerAtDesk, clampToWalkable, getRoomAtPosition } from './collisions';
import {
  FUNDING_PER_FORM,
  ENROLLMENT_PER_FORM,
  SUSPICION_REDUCTION_PER_FORM,
  CAPACITY_BONUS_REDUCTION,
  PASSIVE_SUSPICION_RATE,
  MAX_SUSPICION,
  LOSE_THRESHOLD,
  CARRY_CAPACITY,
  LEVELS,
  ICE_AGENT,
  SPRINT_SPEED_MULTIPLIER,
} from './config';

// Track time since last ICE spawn
let timeSinceIceSpawn = 0;
let nextIceSpawnTime = ICE_AGENT.spawnInterval + Math.random() * 5; // First spawn at 15-20 seconds

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
    iceAgent: { ...state.iceAgent },
    iceWarning: { ...state.iceWarning },
    upgrades: { ...state.upgrades },
    sprintTimer: state.sprintTimer,
    noIceTimer: state.noIceTimer,
  };
}

/**
 * Check if player is in the hallway (not safe from ICE)
 */
function isPlayerInHallway(state: GameState): boolean {
  const room = getRoomAtPosition(state.player.x, state.player.y, state.building);
  return room?.type === 'hallway';
}

/**
 * Check if ICE agent can see the player
 * ICE can only see in the direction they're facing
 */
function canIceSeePlayer(ice: IceAgent, playerX: number, playerY: number): boolean {
  if (!ice.active) return false;

  // Check if player is roughly at same Y level (in hallway)
  const yDiff = Math.abs(ice.y - playerY);
  if (yDiff > 60) return false; // Too far vertically

  // Check direction
  const xDiff = playerX - ice.x;

  if (ice.direction === 'right' && xDiff > 0 && xDiff < ICE_AGENT.visionDistance) {
    return true;
  }
  if (ice.direction === 'left' && xDiff < 0 && Math.abs(xDiff) < ICE_AGENT.visionDistance) {
    return true;
  }

  return false;
}

/**
 * Spawn ICE agent at edge of hallway
 */
function spawnIceAgent(state: GameState): IceAgent {
  const level = LEVELS[state.level] || LEVELS[0];
  const hallway = level.hallway;

  // Randomly spawn from left or right
  const fromLeft = Math.random() > 0.5;

  return {
    x: fromLeft ? hallway.x - 20 : hallway.x + hallway.width + 20,
    y: hallway.y + hallway.height / 2,
    direction: fromLeft ? 'right' : 'left',
    active: true,
    timer: ICE_AGENT.duration,
    speed: ICE_AGENT.speed,
  };
}

/**
 * Update ICE agent movement and state
 */
function updateIceAgent(state: GameState, dt: number): void {
  const ice = state.iceAgent;
  const level = LEVELS[state.level] || LEVELS[0];
  const hallway = level.hallway;

  if (ice.active) {
    // Move in facing direction
    const moveX = ice.direction === 'right' ? ice.speed * dt : -ice.speed * dt;
    ice.x += moveX;

    // Deactivate when ICE reaches the other side of hallway
    const reachedEnd = ice.direction === 'right'
      ? ice.x > hallway.x + hallway.width + 50  // Walked past right edge
      : ice.x < hallway.x - 50;                  // Walked past left edge

    if (reachedEnd) {
      ice.active = false;
      ice.x = -100;
      timeSinceIceSpawn = 0;
      nextIceSpawnTime = ICE_AGENT.spawnInterval + (Math.random() - 0.5) * 5;
    }
  }
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
  const dt = deltaTime / 1000;

  // Get movement direction
  const { dx, dy } = getCombinedDirection(input, joystick);

  // Calculate speed (with sprint bonus if active)
  const speedMultiplier = newState.sprintTimer > 0 ? SPRINT_SPEED_MULTIPLIER : 1;
  const currentSpeed = newState.player.speed * speedMultiplier;

  // Update player position with wall collision
  if (dx !== 0 || dy !== 0) {
    const newX = newState.player.x + dx * currentSpeed * dt;
    const newY = newState.player.y + dy * currentSpeed * dt;

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

  // Update player stress
  const targetStress = Math.min(1, (newState.suspicion / MAX_SUSPICION) * 0.5 + (newState.player.carrying / CARRY_CAPACITY) * 0.5);
  newState.player.stress += (targetStress - newState.player.stress) * dt * 3;

  // Decrement power-up timers
  if (newState.sprintTimer > 0) {
    newState.sprintTimer = Math.max(0, newState.sprintTimer - dt);
  }
  if (newState.noIceTimer > 0) {
    newState.noIceTimer = Math.max(0, newState.noIceTimer - dt);
  }

  // ICE Agent logic with warning system (skip if noIce protection active)
  if (newState.noIceTimer > 0) {
    // Clear any active ICE or warnings during protection
    if (newState.iceAgent.active) {
      newState.iceAgent.active = false;
      newState.iceAgent.x = -100;
    }
    newState.iceWarning.active = false;
    timeSinceIceSpawn = 0;
  } else {
    timeSinceIceSpawn += dt;

    // Warning countdown before ICE spawns
    if (newState.iceWarning.active) {
      newState.iceWarning.countdown -= dt;
      if (newState.iceWarning.countdown <= 0) {
        // Warning over, spawn ICE agent
        newState.iceWarning.active = false;
        newState.iceAgent = spawnIceAgent(newState);
      }
    } else if (!newState.iceAgent.active && timeSinceIceSpawn >= nextIceSpawnTime) {
      // Start warning countdown
      newState.iceWarning.active = true;
      newState.iceWarning.countdown = ICE_AGENT.warningTime;
    }

    if (newState.iceAgent.active) {
      updateIceAgent(newState, dt);

      // Check if ICE sees player in hallway
      if (isPlayerInHallway(newState) && canIceSeePlayer(newState.iceAgent, newState.player.x, newState.player.y)) {
        // Caught! Instant lose - journalist catches you with ICE
        newState.phase = 'lose';
        newState.player.stress = 1;
      }
    }
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
    const capacityBonus = formsDropped >= newState.player.carryCapacity ? CAPACITY_BONUS_REDUCTION : 0;

    newState.enrollments += formsDropped * ENROLLMENT_PER_FORM;
    const earnedFunding = formsDropped * FUNDING_PER_FORM;
    newState.funding += earnedFunding;
    newState.totalFunding += earnedFunding;

    // Reduce suspicion (forms make you look more legit!)
    const suspicionReduction = formsDropped * SUSPICION_REDUCTION_PER_FORM + capacityBonus;
    newState.suspicion = Math.max(0, newState.suspicion - suspicionReduction);
    newState.player.carrying = 0;

    respawnForms(newState);
  }

  // Update timer
  newState.timeRemaining -= dt;

  // Passive suspicion increase (pressure mounts!) - only if not already at max
  if (newState.suspicion < MAX_SUSPICION) {
    newState.suspicion += PASSIVE_SUSPICION_RATE * dt;
  }

  // Clamp suspicion (0 to 100)
  newState.suspicion = Math.min(MAX_SUSPICION, Math.max(0, newState.suspicion));

  // Check win/lose conditions - ONLY when time runs out
  if (newState.timeRemaining <= 0) {
    newState.timeRemaining = 0;
    // Time's up! Check if suspicion is low enough (need to be at or below threshold to win)
    if (newState.suspicion > LOSE_THRESHOLD) {
      // Still too suspicious - journalist catches you
      newState.phase = 'lose';
    } else {
      // Suspicion low enough - you passed!
      newState.phase = 'win';
    }
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
      const room = classrooms[Math.floor(Math.random() * classrooms.length)];
      const margin = 35;

      form.x = room.bounds.x + margin + Math.random() * (room.bounds.width - margin * 2);
      form.y = room.bounds.y + margin + Math.random() * (room.bounds.height - margin * 2);
      form.collected = false;
      form.roomId = room.id;
      form.variant = Math.floor(Math.random() * 5);
    }
  }
}

/**
 * Reset ICE spawn timer (call when starting new game)
 */
export function resetIceTimer(): void {
  timeSinceIceSpawn = 0;
  // Give player 10-20 seconds before first ICE spawn
  nextIceSpawnTime = 10 + Math.random() * 10;
}
