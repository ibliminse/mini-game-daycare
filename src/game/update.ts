// Pure game update logic

import { GameState, InputState, JoystickState, IceAgent, Room } from './types';
import { getCombinedDirection } from './input';
import { canPickupForm, isPlayerAtDesk, clampToWalkable, getRoomAtPosition } from './collisions';
import { LEVEL_SPECS } from './levelSpec';
import {
  FUNDING_PER_FORM,
  ENROLLMENT_PER_FORM,
  SUSPICION_REDUCTION_PER_FORM,
  CAPACITY_BONUS_REDUCTION,
  PASSIVE_SUSPICION_RATE,
  MAX_SUSPICION,
  LOSE_THRESHOLD,
  CARRY_CAPACITY,
  ICE_AGENT,
  SPRINT_SPEED_MULTIPLIER,
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
    iceAgents: state.iceAgents.map((a) => ({ ...a, returnPosition: a.returnPosition ? { ...a.returnPosition } : undefined })),
    iceWarnings: state.iceWarnings.map((w) => ({ ...w })),
    hallwaySpawnTimers: state.hallwaySpawnTimers.map((t) => ({ ...t })),
    iceConfig: { ...state.iceConfig },
    upgrades: { ...state.upgrades },
  };
}

/**
 * Check if player is in the hallway (not safe from ICE patrol)
 */
function isPlayerInHallway(state: GameState): boolean {
  const room = getRoomAtPosition(state.player.x, state.player.y, state.building);
  return room?.type === 'hallway';
}

/**
 * Check if player is in a specific room
 */
function isPlayerInRoom(state: GameState, roomId: string): boolean {
  const room = getRoomAtPosition(state.player.x, state.player.y, state.building);
  return room?.id === roomId;
}

/**
 * Get hallway bounds by ID
 */
function getHallwayBounds(state: GameState, hallwayId: string): Room | undefined {
  return state.building.rooms.find((r) => r.id === hallwayId && r.type === 'hallway');
}

/**
 * Check if ICE agent can see the player using vision cone detection
 */
function canIceSeePlayer(ice: IceAgent, playerX: number, playerY: number): boolean {
  if (!ice.active || ice.state !== 'patrolling') return false;

  const dx = playerX - ice.x;
  const dy = playerY - ice.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > ICE_AGENT.visionDistance) return false;

  const angleToPlayer = Math.atan2(dy, dx);

  // Calculate facing angle based on direction
  let facingAngle: number;
  switch (ice.direction) {
    case 'right': facingAngle = 0; break;
    case 'left': facingAngle = Math.PI; break;
    case 'up': facingAngle = -Math.PI / 2; break;
    case 'down': facingAngle = Math.PI / 2; break;
  }

  let angleDiff = angleToPlayer - facingAngle;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  const halfConeAngle = (ICE_AGENT.visionAngle / 2) * (Math.PI / 180);
  return Math.abs(angleDiff) <= halfConeAngle;
}

/**
 * Spawn an ICE agent for a specific hallway
 */
function spawnIceAgentForHallway(agent: IceAgent, state: GameState): void {
  const hallway = getHallwayBounds(state, agent.assignedHallwayId);
  if (!hallway) {
    // Fallback: try to find ANY hallway if the assigned one isn't found
    const anyHallway = state.building.rooms.find(r => r.type === 'hallway');
    if (!anyHallway) {
      console.warn(`ICE agent ${agent.id}: No hallways found in building`);
      return;
    }
    // Use fallback hallway
    const bounds = anyHallway.bounds;
    const isHorizontal = bounds.width > bounds.height;
    if (isHorizontal) {
      const fromLeft = Math.random() > 0.5;
      agent.x = fromLeft ? bounds.x - 20 : bounds.x + bounds.width + 20;
      agent.y = bounds.y + bounds.height / 2;
      agent.direction = fromLeft ? 'right' : 'left';
    } else {
      const fromTop = Math.random() > 0.5;
      agent.x = bounds.x + bounds.width / 2;
      agent.y = fromTop ? bounds.y - 20 : bounds.y + bounds.height + 20;
      agent.direction = fromTop ? 'down' : 'up';
    }
    agent.active = true;
    agent.timer = ICE_AGENT.duration;
    agent.state = 'patrolling';
    agent.targetRoomId = undefined;
    agent.searchTimer = undefined;
    agent.returnPosition = undefined;
    // Update the agent's assigned hallway to the fallback
    agent.assignedHallwayId = anyHallway.id;
    return;
  }

  const bounds = hallway.bounds;
  const isHorizontal = bounds.width > bounds.height;

  if (isHorizontal) {
    // Horizontal hallway - spawn from left or right
    const fromLeft = Math.random() > 0.5;
    agent.x = fromLeft ? bounds.x - 20 : bounds.x + bounds.width + 20;
    agent.y = bounds.y + bounds.height / 2;
    agent.direction = fromLeft ? 'right' : 'left';
  } else {
    // Vertical hallway - spawn from top or bottom
    const fromTop = Math.random() > 0.5;
    agent.x = bounds.x + bounds.width / 2;
    agent.y = fromTop ? bounds.y - 20 : bounds.y + bounds.height + 20;
    agent.direction = fromTop ? 'down' : 'up';
  }

  agent.active = true;
  agent.timer = ICE_AGENT.duration;
  agent.state = 'patrolling';
  agent.targetRoomId = undefined;
  agent.searchTimer = undefined;
  agent.returnPosition = undefined;

  // Debug log spawn info
  if (typeof window !== 'undefined' && (window as unknown as Record<string, boolean>).DEBUG_ICE) {
    console.log(`ICE Agent ${agent.id} spawned: hallway=${hallway.id}, pos=(${agent.x.toFixed(0)}, ${agent.y.toFixed(0)}), dir=${agent.direction}, horizontal=${isHorizontal}`);
  }
}

/**
 * Update a single ICE agent's patrol movement
 */
function updateIceAgentPatrol(agent: IceAgent, state: GameState, dt: number): void {
  let hallway = getHallwayBounds(state, agent.assignedHallwayId);
  if (!hallway) {
    // Fallback: try to find any hallway
    hallway = state.building.rooms.find(r => r.type === 'hallway');
    if (!hallway) {
      // No hallways at all - deactivate agent
      console.warn(`ICE Agent ${agent.id}: No hallways found, deactivating`);
      agent.active = false;
      agent.x = -100;
      agent.y = -100;
      return;
    }
    // Update agent's assigned hallway
    console.warn(`ICE Agent ${agent.id}: Assigned hallway '${agent.assignedHallwayId}' not found, falling back to '${hallway.id}'`);
    agent.assignedHallwayId = hallway.id;
  }

  const bounds = hallway.bounds;
  const isHorizontal = bounds.width > bounds.height;

  // Validate that agent direction matches hallway orientation
  const isValidDirection = isHorizontal
    ? (agent.direction === 'left' || agent.direction === 'right')
    : (agent.direction === 'up' || agent.direction === 'down');

  if (!isValidDirection) {
    // Fix agent direction to match hallway orientation
    console.warn(`ICE Agent ${agent.id}: Invalid direction '${agent.direction}' for ${isHorizontal ? 'horizontal' : 'vertical'} hallway, fixing`);
    if (isHorizontal) {
      agent.direction = agent.x < bounds.x + bounds.width / 2 ? 'right' : 'left';
    } else {
      agent.direction = agent.y < bounds.y + bounds.height / 2 ? 'down' : 'up';
    }
  }

  // Move in facing direction
  const speed = agent.speed * dt;
  switch (agent.direction) {
    case 'right': agent.x += speed; break;
    case 'left': agent.x -= speed; break;
    case 'down': agent.y += speed; break;
    case 'up': agent.y -= speed; break;
  }

  // Constrain agent to hallway center line (perpendicular to movement direction)
  if (isHorizontal) {
    // For horizontal hallways, keep Y centered
    const centerY = bounds.y + bounds.height / 2;
    if (Math.abs(agent.y - centerY) > 5) {
      agent.y = centerY;
    }
  } else {
    // For vertical hallways, keep X centered
    const centerX = bounds.x + bounds.width / 2;
    if (Math.abs(agent.x - centerX) > 5) {
      agent.x = centerX;
    }
  }

  // Check if agent has left the hallway
  let reachedEnd = false;
  if (isHorizontal) {
    reachedEnd = agent.direction === 'right'
      ? agent.x > bounds.x + bounds.width + 50
      : agent.x < bounds.x - 50;
  } else {
    reachedEnd = agent.direction === 'down'
      ? agent.y > bounds.y + bounds.height + 50
      : agent.y < bounds.y - 50;
  }

  if (reachedEnd) {
    agent.active = false;
    agent.x = -100;
    agent.y = -100;
  }
}

/**
 * Check if agent should search a room (random chance)
 */
function shouldSearchRoom(state: GameState): boolean {
  // Per-frame probability based on level config
  const probability = state.iceConfig.roomSearchProbability;
  return Math.random() < probability * 0.02; // ~2% per frame at max probability
}

/**
 * Find a random adjacent classroom to search
 */
function findAdjacentRoom(agent: IceAgent, state: GameState): Room | null {
  const hallway = getHallwayBounds(state, agent.assignedHallwayId);
  if (!hallway) return null;

  // Find classrooms adjacent to this hallway
  const classrooms = state.building.rooms.filter((r) => r.type === 'classroom');
  const adjacentRooms: Room[] = [];

  for (const room of classrooms) {
    // Check if room is adjacent to hallway (within 50px)
    const hBounds = hallway.bounds;
    const rBounds = room.bounds;

    const horizontalOverlap =
      rBounds.x < hBounds.x + hBounds.width + 50 &&
      rBounds.x + rBounds.width > hBounds.x - 50;
    const verticalOverlap =
      rBounds.y < hBounds.y + hBounds.height + 50 &&
      rBounds.y + rBounds.height > hBounds.y - 50;

    if (horizontalOverlap && verticalOverlap) {
      adjacentRooms.push(room);
    }
  }

  if (adjacentRooms.length === 0) return null;
  return adjacentRooms[Math.floor(Math.random() * adjacentRooms.length)];
}

/**
 * Update ICE agent room search behavior
 */
function updateIceAgentSearch(agent: IceAgent, state: GameState, dt: number): void {
  if (!agent.active) return;

  switch (agent.state) {
    case 'patrolling':
      updateIceAgentPatrol(agent, state, dt);

      // Maybe start searching a room
      if (shouldSearchRoom(state)) {
        const room = findAdjacentRoom(agent, state);
        if (room) {
          agent.state = 'entering_room';
          agent.targetRoomId = room.id;
          agent.returnPosition = { x: agent.x, y: agent.y };
        }
      }
      break;

    case 'entering_room':
      if (agent.targetRoomId) {
        const room = state.building.rooms.find((r) => r.id === agent.targetRoomId);
        if (room) {
          // Move toward room center
          const targetX = room.bounds.x + room.bounds.width / 2;
          const targetY = room.bounds.y + room.bounds.height / 2;
          const dx = targetX - agent.x;
          const dy = targetY - agent.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 20) {
            // Reached room, start searching
            agent.state = 'searching';
            agent.searchTimer = state.iceConfig.searchDuration;
          } else {
            // Move toward room
            const speed = agent.speed * dt * 0.8; // Slightly slower when searching
            agent.x += (dx / dist) * speed;
            agent.y += (dy / dist) * speed;
          }
        }
      }
      break;

    case 'searching':
      if (agent.searchTimer !== undefined) {
        agent.searchTimer -= dt;
        if (agent.searchTimer <= 0) {
          agent.state = 'exiting_room';
        }
      }
      break;

    case 'exiting_room':
      if (agent.returnPosition) {
        const dx = agent.returnPosition.x - agent.x;
        const dy = agent.returnPosition.y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
          // Returned to hallway, resume patrol
          agent.state = 'patrolling';
          agent.targetRoomId = undefined;
          // Snap to return position to avoid drift
          agent.x = agent.returnPosition.x;
          agent.y = agent.returnPosition.y;
          agent.returnPosition = undefined;

          // Ensure direction is correct for the hallway
          const hallway = getHallwayBounds(state, agent.assignedHallwayId);
          if (hallway) {
            const bounds = hallway.bounds;
            const isHorizontal = bounds.width > bounds.height;
            // Pick a random direction along the hallway
            if (isHorizontal) {
              agent.direction = Math.random() > 0.5 ? 'right' : 'left';
              agent.y = bounds.y + bounds.height / 2; // Snap to center
            } else {
              agent.direction = Math.random() > 0.5 ? 'down' : 'up';
              agent.x = bounds.x + bounds.width / 2; // Snap to center
            }
          }
        } else {
          const speed = agent.speed * dt * 0.8;
          agent.x += (dx / dist) * speed;
          agent.y += (dy / dist) * speed;
        }
      } else {
        // No return position, just resume
        agent.state = 'patrolling';
      }
      break;
  }
}

/**
 * Update all ICE agents
 */
function updateAllIceAgents(state: GameState, dt: number): boolean {
  let playerCaught = false;

  // Skip if noIce protection is active
  if (state.noIceTimer > 0) {
    // Clear all agents and warnings
    for (const agent of state.iceAgents) {
      if (agent.active) {
        agent.active = false;
        agent.x = -100;
        agent.y = -100;
      }
    }
    for (const warning of state.iceWarnings) {
      warning.active = false;
    }
    for (const timer of state.hallwaySpawnTimers) {
      timer.timeSinceSpawn = 0;
    }
    return false;
  }

  // Update spawn timers and warnings for each agent
  for (let i = 0; i < state.iceAgents.length; i++) {
    const agent = state.iceAgents[i];
    const warning = state.iceWarnings[i];
    const timer = state.hallwaySpawnTimers[i];

    if (!agent.active) {
      timer.timeSinceSpawn += dt;

      // Warning countdown
      if (warning.active) {
        warning.countdown -= dt;
        if (warning.countdown <= 0) {
          warning.active = false;
          spawnIceAgentForHallway(agent, state);
        }
      } else if (timer.timeSinceSpawn >= timer.nextSpawnTime) {
        // Start warning
        warning.active = true;
        warning.countdown = ICE_AGENT.warningTime;
      }
    } else {
      // Update active agent
      const wasActive = agent.active;

      if (state.iceConfig.roomSearchProbability > 0) {
        updateIceAgentSearch(agent, state, dt);
      } else {
        updateIceAgentPatrol(agent, state, dt);
      }

      // Reset spawn timer if agent just became inactive
      if (wasActive && !agent.active) {
        timer.timeSinceSpawn = 0;
        timer.nextSpawnTime = ICE_AGENT.spawnInterval + (Math.random() - 0.5) * 5;
      }

      // Check for player detection
      if (agent.active) {
        // Patrolling in hallway - check if player is in hallway
        if (agent.state === 'patrolling' && isPlayerInHallway(state)) {
          if (canIceSeePlayer(agent, state.player.x, state.player.y)) {
            playerCaught = true;
          }
        }
        // Searching room - check if player is in same room
        if (agent.state === 'searching' && agent.targetRoomId) {
          if (isPlayerInRoom(state, agent.targetRoomId)) {
            playerCaught = true;
          }
        }
      }
    }
  }

  return playerCaught;
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

  // Update all ICE agents
  const playerCaught = updateAllIceAgents(newState, dt);
  if (playerCaught) {
    newState.phase = 'lose';
    newState.player.stress = 1;
    return newState;
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

  // Passive suspicion increase (pressure mounts!)
  if (newState.suspicion < MAX_SUSPICION) {
    newState.suspicion += PASSIVE_SUSPICION_RATE * dt;
  }

  // Clamp suspicion (0 to 100)
  newState.suspicion = Math.min(MAX_SUSPICION, Math.max(0, newState.suspicion));

  // Check win/lose conditions when time runs out
  if (newState.timeRemaining <= 0) {
    newState.timeRemaining = 0;
    if (newState.suspicion > LOSE_THRESHOLD) {
      newState.phase = 'lose';
    } else {
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
 * Reset ICE spawn timer (kept for backwards compatibility)
 */
export function resetIceTimer(): void {
  // No-op: ICE timing is now per-hallway in GameState
}
