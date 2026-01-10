// Initial state builder

import { GameState, Form, InputState, JoystickState, Building, Room, Door, IceAgent, IceWarning, Upgrades, HallwaySpawnTimer } from './types';
import { LevelSpec, LEVEL_SPECS } from './levelSpec';
import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  CARRY_CAPACITY,
  FORMS_PER_ROOM,
  INSPECTION_TIME,
  COLORS,
  ICE_AGENT,
  INITIAL_SUSPICION,
} from './config';

/**
 * Build the school layout from a LevelSpec
 */
export function createBuildingFromSpec(spec: LevelSpec): Building {
  const rooms: Room[] = [];
  const doors: Door[] = [];

  // Add all hallways
  for (const hallway of spec.hallways) {
    rooms.push({
      id: hallway.id,
      name: 'Hallway',
      bounds: {
        x: hallway.x,
        y: hallway.y,
        width: hallway.width,
        height: hallway.height,
      },
      type: 'hallway',
      color: COLORS.hallwayFloor,
    });
  }

  // Helper to find ALL adjacent hallways for a room (multi-door support)
  const findAllAdjacentHallways = (roomX: number, roomY: number, roomW: number, roomH: number) => {
    const connections: Array<{ hallway: typeof spec.hallways[0]; side: 'above' | 'below' | 'left' | 'right' }> = [];
    const roomLeft = roomX;
    const roomRight = roomX + roomW;
    const roomTop = roomY;
    const roomBottom = roomY + roomH;
    const roomCenterX = roomX + roomW / 2;
    const roomCenterY = roomY + roomH / 2;

    for (const h of spec.hallways) {
      const hLeft = h.x;
      const hRight = h.x + h.width;
      const hTop = h.y;
      const hBottom = h.y + h.height;

      // Check if room is above hallway (horizontal connection)
      if (roomBottom <= hTop + 10 && roomBottom >= hTop - 30) {
        if (roomCenterX >= hLeft && roomCenterX <= hRight) {
          connections.push({ hallway: h, side: 'above' });
        }
      }
      // Check if room is below hallway (horizontal connection)
      if (roomTop >= hBottom - 10 && roomTop <= hBottom + 30) {
        if (roomCenterX >= hLeft && roomCenterX <= hRight) {
          connections.push({ hallway: h, side: 'below' });
        }
      }
      // Check if room is left of hallway (vertical connection)
      if (roomRight <= hLeft + 10 && roomRight >= hLeft - 30) {
        if (roomCenterY >= hTop && roomCenterY <= hBottom) {
          connections.push({ hallway: h, side: 'left' });
        }
      }
      // Check if room is right of hallway (vertical connection)
      if (roomLeft >= hRight - 10 && roomLeft <= hRight + 30) {
        if (roomCenterY >= hTop && roomCenterY <= hBottom) {
          connections.push({ hallway: h, side: 'right' });
        }
      }
    }
    return connections;
  };

  // Helper to create door for a room-hallway connection
  const createDoor = (
    room: { id: string; x: number; y: number; width: number; height: number },
    hallway: typeof spec.hallways[0],
    side: 'above' | 'below' | 'left' | 'right'
  ): Door => {
    const doorWidth = 60;

    if (side === 'above') {
      return {
        x: room.x + room.width / 2 - doorWidth / 2,
        y: room.y + room.height - 20,
        width: doorWidth,
        height: 40,
        connects: [room.id, hallway.id],
      };
    } else if (side === 'below') {
      return {
        x: room.x + room.width / 2 - doorWidth / 2,
        y: hallway.y + hallway.height - 20,
        width: doorWidth,
        height: 40,
        connects: [hallway.id, room.id],
      };
    } else if (side === 'left') {
      return {
        x: room.x + room.width - 20,
        y: room.y + room.height / 2 - doorWidth / 2,
        width: 40,
        height: doorWidth,
        connects: [room.id, hallway.id],
      };
    } else {
      // right - room is to the right of hallway
      return {
        x: room.x - 20,
        y: room.y + room.height / 2 - doorWidth / 2,
        width: 40,
        height: doorWidth,
        connects: [hallway.id, room.id],
      };
    }
  };

  // Add classrooms with doors to ALL adjacent hallways
  for (const classroom of spec.classrooms) {
    rooms.push({
      id: classroom.id,
      name: classroom.name,
      bounds: {
        x: classroom.x,
        y: classroom.y,
        width: classroom.width,
        height: classroom.height,
      },
      type: 'classroom',
      color: COLORS.classroomFloor,
    });

    // Find all adjacent hallways and create doors
    const connections = findAllAdjacentHallways(
      classroom.x,
      classroom.y,
      classroom.width,
      classroom.height
    );
    for (const conn of connections) {
      doors.push(createDoor(classroom, conn.hallway, conn.side));
    }
  }

  // Add office with doors to ALL adjacent hallways
  const office = spec.office;
  rooms.push({
    id: office.id,
    name: office.name,
    bounds: {
      x: office.x,
      y: office.y,
      width: office.width,
      height: office.height,
    },
    type: 'office',
    color: COLORS.officeFloor,
  });

  const officeConnections = findAllAdjacentHallways(
    office.x,
    office.y,
    office.width,
    office.height
  );
  for (const conn of officeConnections) {
    doors.push(createDoor(office, conn.hallway, conn.side));
  }

  return { rooms, walls: [], doors };
}

/**
 * Spawn forms in classrooms
 */
function spawnForms(building: Building): Form[] {
  const forms: Form[] = [];
  let formId = 0;

  const classrooms = building.rooms.filter((r) => r.type === 'classroom');

  for (const room of classrooms) {
    for (let i = 0; i < FORMS_PER_ROOM; i++) {
      const margin = 35;
      const x = room.bounds.x + margin + Math.random() * (room.bounds.width - margin * 2);
      const y = room.bounds.y + margin + Math.random() * (room.bounds.height - margin * 2);

      forms.push({
        id: `form-${formId++}`,
        x,
        y,
        collected: false,
        roomId: room.id,
        variant: Math.floor(Math.random() * 5),
      });
    }
  }

  return forms;
}

/**
 * Create initial ICE agents (one per hallway, up to agentCount)
 */
function createIceAgents(spec: LevelSpec): IceAgent[] {
  const agents: IceAgent[] = [];
  const agentCount = Math.min(spec.iceConfig.agentCount, spec.hallways.length);

  for (let i = 0; i < agentCount; i++) {
    const hallway = spec.hallways[i];
    agents.push({
      id: `ice-${i}`,
      x: -100, // Off screen
      y: 0,
      direction: 'right',
      active: false,
      timer: 0,
      speed: spec.iceConfig.patrolSpeed || ICE_AGENT.speed,
      assignedHallwayId: hallway.id,
      state: 'patrolling',
    });
  }

  return agents;
}

/**
 * Create per-hallway ICE warnings
 */
function createIceWarnings(spec: LevelSpec): IceWarning[] {
  const warnings: IceWarning[] = [];
  const agentCount = Math.min(spec.iceConfig.agentCount, spec.hallways.length);

  for (let i = 0; i < agentCount; i++) {
    warnings.push({
      active: false,
      countdown: 0,
    });
  }

  return warnings;
}

/**
 * Create per-hallway spawn timers with staggered start times
 */
function createHallwaySpawnTimers(spec: LevelSpec): HallwaySpawnTimer[] {
  const timers: HallwaySpawnTimer[] = [];
  const agentCount = Math.min(spec.iceConfig.agentCount, spec.hallways.length);

  for (let i = 0; i < agentCount; i++) {
    const hallway = spec.hallways[i];
    // Stagger spawn times so agents don't all spawn at once
    const staggerOffset = i * 5; // 5 seconds between each agent's first spawn
    timers.push({
      hallwayId: hallway.id,
      timeSinceSpawn: 0,
      nextSpawnTime: ICE_AGENT.spawnInterval + staggerOffset + Math.random() * 5,
    });
  }

  return timers;
}

/**
 * Create default upgrades
 */
function createDefaultUpgrades(): Upgrades {
  return {
    carryCapacity: 0,
  };
}

/**
 * Get desk position for a level spec
 */
function getDeskForSpec(spec: LevelSpec) {
  return {
    x: spec.office.x + 40,
    y: spec.office.y + 60,
    width: 100,
    height: 80,
  };
}

/**
 * Create the initial game state
 * @param levelIndex - which level to load (0-7)
 * @param persistedUpgrades - upgrades to carry over from previous games
 * @param persistedFunding - total funding accumulated
 */
export function createInitialState(
  levelIndex: number = 0,
  persistedUpgrades?: Upgrades,
  persistedFunding: number = 0
): GameState {
  // Clamp level index to valid range
  const validLevelIndex = Math.max(0, Math.min(levelIndex, LEVEL_SPECS.length - 1));
  const spec = LEVEL_SPECS[validLevelIndex];

  const building = createBuildingFromSpec(spec);
  const forms = spawnForms(building);
  const upgrades = persistedUpgrades || createDefaultUpgrades();

  // Start player in the first hallway
  const startHallway = spec.hallways[0];
  const startX = startHallway.x + 50;
  const startY = startHallway.y + startHallway.height / 2;

  return {
    phase: 'menu',
    player: {
      x: startX,
      y: startY,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      carrying: 0,
      carryCapacity: CARRY_CAPACITY + upgrades.carryCapacity,
      stress: 0,
    },
    forms,
    building,
    desk: getDeskForSpec(spec),

    // Multi-ICE agent system
    iceAgents: createIceAgents(spec),
    iceWarnings: createIceWarnings(spec),
    hallwaySpawnTimers: createHallwaySpawnTimers(spec),

    // Level ICE configuration
    iceConfig: {
      agentCount: spec.iceConfig.agentCount,
      roomSearchProbability: spec.iceConfig.roomSearchProbability,
      searchDuration: spec.iceConfig.searchDuration,
    },

    enrollments: 0,
    funding: 0,
    totalFunding: persistedFunding,
    suspicion: INITIAL_SUSPICION,
    timeRemaining: INSPECTION_TIME,
    level: validLevelIndex,
    upgrades,
    sprintTimer: 0,
    noIceTimer: 0,
  };
}

/**
 * Create initial state from a custom LevelSpec (for editor/custom levels)
 */
export function createInitialStateFromSpec(
  spec: LevelSpec,
  persistedUpgrades?: Upgrades,
  persistedFunding: number = 0
): GameState {
  const building = createBuildingFromSpec(spec);
  const forms = spawnForms(building);
  const upgrades = persistedUpgrades || createDefaultUpgrades();

  // Start player in the first hallway
  const startHallway = spec.hallways[0];
  const startX = startHallway.x + 50;
  const startY = startHallway.y + startHallway.height / 2;

  return {
    phase: 'menu',
    player: {
      x: startX,
      y: startY,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      carrying: 0,
      carryCapacity: CARRY_CAPACITY + upgrades.carryCapacity,
      stress: 0,
    },
    forms,
    building,
    desk: getDeskForSpec(spec),

    // Multi-ICE agent system
    iceAgents: createIceAgents(spec),
    iceWarnings: createIceWarnings(spec),
    hallwaySpawnTimers: createHallwaySpawnTimers(spec),

    // Level ICE configuration
    iceConfig: {
      agentCount: spec.iceConfig.agentCount,
      roomSearchProbability: spec.iceConfig.roomSearchProbability,
      searchDuration: spec.iceConfig.searchDuration,
    },

    enrollments: 0,
    funding: 0,
    totalFunding: persistedFunding,
    suspicion: INITIAL_SUSPICION,
    timeRemaining: INSPECTION_TIME,
    level: spec.difficulty - 1, // Convert 1-based difficulty to 0-based level index
    upgrades,
    sprintTimer: 0,
    noIceTimer: 0,
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
