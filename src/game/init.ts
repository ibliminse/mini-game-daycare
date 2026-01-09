// Initial state builder

import { GameState, Form, InputState, JoystickState, Building, Room, Door } from './types';
import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  CARRY_CAPACITY,
  FORMS_PER_ROOM,
  DESK,
  INSPECTION_TIME,
  BUILDING,
  COLORS,
} from './config';

/**
 * Build the school layout
 */
function createBuilding(): Building {
  const rooms: Room[] = [];
  const doors: Door[] = [];

  const hallway = BUILDING.hallway;
  const hallwayTop = hallway.y;
  const hallwayBottom = hallway.y + hallway.height;

  // Add hallway
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

  // Add classrooms
  for (const classroom of BUILDING.classrooms) {
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

    // Create door zone at boundary between room and hallway
    const doorWidth = 60;
    const doorX = classroom.x + classroom.width / 2 - doorWidth / 2;
    const roomBottom = classroom.y + classroom.height;
    const roomTop = classroom.y;

    if (roomBottom <= hallwayTop) {
      // Room is above hallway - door spans the wall boundary
      doors.push({
        x: doorX,
        y: roomBottom - 20, // Extend into room
        width: doorWidth,
        height: 40, // Span the boundary
        connects: [classroom.id, 'hallway'],
      });
    } else if (roomTop >= hallwayBottom) {
      // Room is below hallway - door spans the wall boundary
      doors.push({
        x: doorX,
        y: hallwayBottom - 20, // Extend into hallway
        width: doorWidth,
        height: 40, // Span the boundary
        connects: ['hallway', classroom.id],
      });
    }
  }

  // Add office
  rooms.push({
    id: BUILDING.office.id,
    name: BUILDING.office.name,
    bounds: {
      x: BUILDING.office.x,
      y: BUILDING.office.y,
      width: BUILDING.office.width,
      height: BUILDING.office.height,
    },
    type: 'office',
    color: COLORS.officeFloor,
  });

  // Door from hallway to office
  const officeDoorWidth = 60;
  doors.push({
    x: BUILDING.office.x + BUILDING.office.width / 2 - officeDoorWidth / 2,
    y: hallwayBottom - 20,
    width: officeDoorWidth,
    height: 40,
    connects: ['hallway', 'office'],
  });

  return { rooms, walls: [], doors };
}

/**
 * Spawn forms in classrooms
 */
function spawnForms(building: Building): Form[] {
  const forms: Form[] = [];
  let formId = 0;

  // Only spawn in classrooms
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
 * Create the initial game state
 */
export function createInitialState(): GameState {
  const building = createBuilding();
  const forms = spawnForms(building);

  // Start player in the hallway
  const startX = BUILDING.hallway.x + 50;
  const startY = BUILDING.hallway.y + BUILDING.hallway.height / 2;

  return {
    phase: 'menu',
    player: {
      x: startX,
      y: startY,
      radius: PLAYER_RADIUS,
      speed: PLAYER_SPEED,
      carrying: 0,
      carryCapacity: CARRY_CAPACITY,
      stress: 0,
    },
    forms,
    building,
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
