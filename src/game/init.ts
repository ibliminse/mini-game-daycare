// Initial state builder

import { GameState, Form, InputState, JoystickState, Building, Room, Door, IceAgent, IceWarning, Upgrades } from './types';
import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  CARRY_CAPACITY,
  FORMS_PER_ROOM,
  INSPECTION_TIME,
  LEVELS,
  COLORS,
  ICE_AGENT,
  INITIAL_SUSPICION,
} from './config';

/**
 * Build the school layout for a specific level
 */
function createBuilding(levelIndex: number): Building {
  const level = LEVELS[levelIndex] || LEVELS[0];
  const rooms: Room[] = [];
  const doors: Door[] = [];

  const hallway = level.hallway;
  const hallwayTop = hallway.y;
  const hallwayBottom = hallway.y + hallway.height;

  // Add main hallway
  rooms.push({
    id: 'hallway',
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

  // Add second hallway if exists (for L-shaped, T-shaped layouts)
  if ('hallway2' in level && level.hallway2) {
    const h2 = level.hallway2 as { x: number; y: number; width: number; height: number };
    rooms.push({
      id: 'hallway2',
      name: 'Hallway',
      bounds: {
        x: h2.x,
        y: h2.y,
        width: h2.width,
        height: h2.height,
      },
      type: 'hallway',
      color: COLORS.hallwayFloor,
    });
  }

  // Add third hallway if exists (for H-shaped layouts)
  if ('hallway3' in level && level.hallway3) {
    const h3 = level.hallway3 as { x: number; y: number; width: number; height: number };
    rooms.push({
      id: 'hallway3',
      name: 'Hallway',
      bounds: {
        x: h3.x,
        y: h3.y,
        width: h3.width,
        height: h3.height,
      },
      type: 'hallway',
      color: COLORS.hallwayFloor,
    });
  }

  // Add fourth hallway if exists (for E-shaped layouts)
  if ('hallway4' in level && level.hallway4) {
    const h4 = level.hallway4 as { x: number; y: number; width: number; height: number };
    rooms.push({
      id: 'hallway4',
      name: 'Hallway',
      bounds: {
        x: h4.x,
        y: h4.y,
        width: h4.width,
        height: h4.height,
      },
      type: 'hallway',
      color: COLORS.hallwayFloor,
    });
  }

  // Add fifth hallway if exists (for maze layouts)
  if ('hallway5' in level && level.hallway5) {
    const h5 = level.hallway5 as { x: number; y: number; width: number; height: number };
    rooms.push({
      id: 'hallway5',
      name: 'Hallway',
      bounds: {
        x: h5.x,
        y: h5.y,
        width: h5.width,
        height: h5.height,
      },
      type: 'hallway',
      color: COLORS.hallwayFloor,
    });
  }

  // Build list of all hallways for door connections
  const hallways: Array<{ id: string; x: number; y: number; width: number; height: number }> = [
    { id: 'hallway', ...hallway },
  ];
  if ('hallway2' in level && level.hallway2) {
    const h2 = level.hallway2 as { x: number; y: number; width: number; height: number };
    hallways.push({ id: 'hallway2', ...h2 });
  }
  if ('hallway3' in level && level.hallway3) {
    const h3 = level.hallway3 as { x: number; y: number; width: number; height: number };
    hallways.push({ id: 'hallway3', ...h3 });
  }
  if ('hallway4' in level && level.hallway4) {
    const h4 = level.hallway4 as { x: number; y: number; width: number; height: number };
    hallways.push({ id: 'hallway4', ...h4 });
  }
  if ('hallway5' in level && level.hallway5) {
    const h5 = level.hallway5 as { x: number; y: number; width: number; height: number };
    hallways.push({ id: 'hallway5', ...h5 });
  }

  // Helper to find adjacent hallway for a room
  const findAdjacentHallway = (roomX: number, roomY: number, roomW: number, roomH: number) => {
    const roomLeft = roomX;
    const roomRight = roomX + roomW;
    const roomTop = roomY;
    const roomBottom = roomY + roomH;
    const roomCenterX = roomX + roomW / 2;

    for (const h of hallways) {
      const hLeft = h.x;
      const hRight = h.x + h.width;
      const hTop = h.y;
      const hBottom = h.y + h.height;

      // Check if room is above hallway (horizontal connection)
      if (roomBottom <= hTop + 10 && roomBottom >= hTop - 30) {
        if (roomCenterX >= hLeft && roomCenterX <= hRight) {
          return { hallway: h, side: 'above' as const };
        }
      }
      // Check if room is below hallway (horizontal connection)
      if (roomTop >= hBottom - 10 && roomTop <= hBottom + 30) {
        if (roomCenterX >= hLeft && roomCenterX <= hRight) {
          return { hallway: h, side: 'below' as const };
        }
      }
      // Check if room is left of hallway (vertical connection)
      if (roomRight <= hLeft + 10 && roomRight >= hLeft - 30) {
        const roomCenterY = roomY + roomH / 2;
        if (roomCenterY >= hTop && roomCenterY <= hBottom) {
          return { hallway: h, side: 'left' as const };
        }
      }
      // Check if room is right of hallway (vertical connection)
      if (roomLeft >= hRight - 10 && roomLeft <= hRight + 30) {
        const roomCenterY = roomY + roomH / 2;
        if (roomCenterY >= hTop && roomCenterY <= hBottom) {
          return { hallway: h, side: 'right' as const };
        }
      }
    }
    return null;
  };

  // Add classrooms
  for (const classroom of level.classrooms) {
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

    // Find which hallway this room connects to
    const connection = findAdjacentHallway(classroom.x, classroom.y, classroom.width, classroom.height);
    if (connection) {
      const doorWidth = 60;
      const { hallway: h, side } = connection;

      if (side === 'above') {
        doors.push({
          x: classroom.x + classroom.width / 2 - doorWidth / 2,
          y: classroom.y + classroom.height - 20,
          width: doorWidth,
          height: 40,
          connects: [classroom.id, h.id],
        });
      } else if (side === 'below') {
        doors.push({
          x: classroom.x + classroom.width / 2 - doorWidth / 2,
          y: h.y + h.height - 20,
          width: doorWidth,
          height: 40,
          connects: [h.id, classroom.id],
        });
      } else if (side === 'left') {
        doors.push({
          x: classroom.x + classroom.width - 20,
          y: classroom.y + classroom.height / 2 - doorWidth / 2,
          width: 40,
          height: doorWidth,
          connects: [classroom.id, h.id],
        });
      } else if (side === 'right') {
        doors.push({
          x: h.x + h.width - 20,
          y: classroom.y + classroom.height / 2 - doorWidth / 2,
          width: 40,
          height: doorWidth,
          connects: [h.id, classroom.id],
        });
      }
    }
  }

  // Add office
  const office = level.office;
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

  // Find which hallway the office connects to
  const officeConnection = findAdjacentHallway(office.x, office.y, office.width, office.height);
  if (officeConnection) {
    const doorWidth = 60;
    const { hallway: h, side } = officeConnection;

    if (side === 'above') {
      doors.push({
        x: office.x + office.width / 2 - doorWidth / 2,
        y: office.y + office.height - 20,
        width: doorWidth,
        height: 40,
        connects: [office.id, h.id],
      });
    } else if (side === 'below') {
      doors.push({
        x: office.x + office.width / 2 - doorWidth / 2,
        y: h.y + h.height - 20,
        width: doorWidth,
        height: 40,
        connects: [h.id, office.id],
      });
    } else if (side === 'left') {
      doors.push({
        x: office.x + office.width - 20,
        y: office.y + office.height / 2 - doorWidth / 2,
        width: 40,
        height: doorWidth,
        connects: [office.id, h.id],
      });
    } else if (side === 'right') {
      doors.push({
        x: h.x + h.width - 20,
        y: office.y + office.height / 2 - doorWidth / 2,
        width: 40,
        height: doorWidth,
        connects: [h.id, office.id],
      });
    }
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
 * Create initial ICE agent (inactive)
 */
function createIceAgent(): IceAgent {
  return {
    x: -100, // Off screen
    y: 0,
    direction: 'right',
    active: false,
    timer: 0,
    speed: ICE_AGENT.speed,
  };
}

/**
 * Create initial ICE warning state
 */
function createIceWarning(): IceWarning {
  return {
    active: false,
    countdown: 0,
  };
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
 * Get desk position for a level
 */
function getDeskForLevel(levelIndex: number) {
  const level = LEVELS[levelIndex] || LEVELS[0];
  return {
    x: level.office.x + 40,
    y: level.office.y + 60,
    width: 100,
    height: 80,
  };
}

/**
 * Create the initial game state
 * @param levelIndex - which level to load
 * @param persistedUpgrades - upgrades to carry over from previous games
 * @param persistedFunding - total funding accumulated
 */
export function createInitialState(
  levelIndex: number = 0,
  persistedUpgrades?: Upgrades,
  persistedFunding: number = 0
): GameState {
  const building = createBuilding(levelIndex);
  const forms = spawnForms(building);
  const level = LEVELS[levelIndex] || LEVELS[0];
  const upgrades = persistedUpgrades || createDefaultUpgrades();

  // Start player in the hallway
  const startX = level.hallway.x + 50;
  const startY = level.hallway.y + level.hallway.height / 2;

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
    desk: getDeskForLevel(levelIndex),
    iceAgent: createIceAgent(),
    iceWarning: createIceWarning(),
    enrollments: 0,
    funding: 0,
    totalFunding: persistedFunding,
    suspicion: INITIAL_SUSPICION,
    timeRemaining: INSPECTION_TIME,
    level: levelIndex,
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
