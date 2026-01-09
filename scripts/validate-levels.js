// Script to validate all level layouts
// Run with: node scripts/validate-levels.js

// Copy of LEVELS from config.ts
const LEVELS = [
  // Level 1: Simple straight hallway - 2 classrooms (tutorial)
  {
    name: 'Iftin Academy',
    hallway: { x: 100, y: 260, width: 600, height: 80 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 100, y: 50, width: 250, height: 210 },
      { id: 'room-b', name: 'Room B', x: 400, y: 50, width: 250, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 400, y: 340, width: 250, height: 210 },
  },
  // Level 2: Longer hallway - 3 classrooms
  {
    name: 'Barwaaqo Center',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 220, height: 210 },
      { id: 'room-b', name: 'Room B', x: 300, y: 50, width: 220, height: 210 },
      { id: 'room-c', name: 'Room C', x: 50, y: 340, width: 220, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 730, y: 340, width: 220, height: 210 },
  },
  // Level 3: L-shaped hallway - 4 classrooms
  {
    name: 'Nabad Academy',
    hallway: { x: 50, y: 260, width: 700, height: 80 },
    hallway2: { x: 670, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 510, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 50, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 300, y: 340, width: 200, height: 210 },
  },
  // Level 4: L-shaped with 4 classrooms
  {
    name: 'Hodan Daycare',
    hallway: { x: 50, y: 260, width: 700, height: 80 },
    hallway2: { x: 670, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 510, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 50, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 750, y: 340, width: 200, height: 210 },
  },
  // Level 5: T-shaped - 5 classrooms
  {
    name: 'Salam Kids',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    hallway2: { x: 420, y: 50, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 180, height: 210 },
      { id: 'room-b', name: 'Room B', x: 240, y: 50, width: 180, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 210 },
      { id: 'room-d', name: 'Room D', x: 690, y: 50, width: 180, height: 210 },
      { id: 'room-e', name: 'Room E', x: 50, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 750, y: 340, width: 200, height: 210 },
  },
  // Level 6: L-shaped reversed - 5 classrooms
  {
    name: 'Hibo Center',
    hallway: { x: 50, y: 260, width: 600, height: 80 },
    hallway2: { x: 570, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 200, height: 210 },
      { id: 'room-c', name: 'Room C', x: 510, y: 50, width: 200, height: 210 },
      { id: 'room-d', name: 'Room D', x: 50, y: 340, width: 200, height: 210 },
      { id: 'room-e', name: 'Room E', x: 280, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 650, y: 340, width: 200, height: 210 },
  },
  // Level 7: T-shaped with bottom branch - 6 classrooms
  {
    name: 'Ayaan Academy',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    hallway2: { x: 420, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 180, height: 210 },
      { id: 'room-b', name: 'Room B', x: 240, y: 50, width: 180, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 210 },
      { id: 'room-d', name: 'Room D', x: 690, y: 50, width: 180, height: 210 },
      { id: 'room-e', name: 'Room E', x: 50, y: 340, width: 180, height: 210 },
      { id: 'room-f', name: 'Room F', x: 240, y: 340, width: 180, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 500, y: 340, width: 200, height: 210 },
  },
  // Level 8: T-shape with vertical going up - 6 classrooms
  {
    name: 'Deeqa Daycare',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    hallway2: { x: 420, y: 50, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 180, height: 210 },
      { id: 'room-b', name: 'Room B', x: 240, y: 50, width: 180, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 180, height: 210 },
      { id: 'room-d', name: 'Room D', x: 690, y: 50, width: 180, height: 210 },
      { id: 'room-e', name: 'Room E', x: 50, y: 340, width: 200, height: 210 },
      { id: 'room-f', name: 'Room F', x: 260, y: 340, width: 200, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 700, y: 340, width: 200, height: 210 },
  },
  // Level 9: Wide T - 7 classrooms
  {
    name: 'Farah Center',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    hallway2: { x: 200, y: 260, width: 80, height: 290 },
    hallway3: { x: 650, y: 260, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 50, y: 50, width: 200, height: 210 },
      { id: 'room-b', name: 'Room B', x: 280, y: 50, width: 180, height: 210 },
      { id: 'room-c', name: 'Room C', x: 480, y: 50, width: 180, height: 210 },
      { id: 'room-d', name: 'Room D', x: 680, y: 50, width: 180, height: 210 },
      { id: 'room-e', name: 'Room E', x: 50, y: 340, width: 150, height: 210 },
      { id: 'room-f', name: 'Room F', x: 280, y: 340, width: 180, height: 210 },
      { id: 'room-g', name: 'Room G', x: 730, y: 340, width: 180, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 480, y: 340, width: 170, height: 210 },
  },
  // Level 10: H-shaped - 8 classrooms
  {
    name: 'Warsame Academy',
    hallway: { x: 50, y: 260, width: 900, height: 80 },
    hallway2: { x: 50, y: 50, width: 80, height: 290 },
    hallway3: { x: 420, y: 50, width: 80, height: 290 },
    hallway4: { x: 800, y: 50, width: 80, height: 290 },
    classrooms: [
      { id: 'room-a', name: 'Room A', x: 130, y: 50, width: 150, height: 210 },
      { id: 'room-b', name: 'Room B', x: 290, y: 50, width: 130, height: 210 },
      { id: 'room-c', name: 'Room C', x: 500, y: 50, width: 150, height: 210 },
      { id: 'room-d', name: 'Room D', x: 660, y: 50, width: 130, height: 210 },
      { id: 'room-e', name: 'Room E', x: 130, y: 340, width: 150, height: 210 },
      { id: 'room-f', name: 'Room F', x: 290, y: 340, width: 130, height: 210 },
      { id: 'room-g', name: 'Room G', x: 500, y: 340, width: 150, height: 210 },
      { id: 'room-h', name: 'Room H', x: 660, y: 340, width: 130, height: 210 },
    ],
    office: { id: 'office', name: 'Office', x: 880, y: 50, width: 70, height: 210 },
  },
];

// Same logic as init.ts findAdjacentHallway
function findAdjacentHallway(room, hallways) {
  const roomLeft = room.x;
  const roomRight = room.x + room.width;
  const roomTop = room.y;
  const roomBottom = room.y + room.height;
  const roomCenterX = room.x + room.width / 2;
  const roomCenterY = room.y + room.height / 2;

  for (const h of hallways) {
    const hLeft = h.x;
    const hRight = h.x + h.width;
    const hTop = h.y;
    const hBottom = h.y + h.height;

    // Check if room is above hallway
    if (roomBottom <= hTop + 10 && roomBottom >= hTop - 30) {
      if (roomCenterX >= hLeft && roomCenterX <= hRight) {
        return { hallway: h, side: 'above' };
      }
    }
    // Check if room is below hallway
    if (roomTop >= hBottom - 10 && roomTop <= hBottom + 30) {
      if (roomCenterX >= hLeft && roomCenterX <= hRight) {
        return { hallway: h, side: 'below' };
      }
    }
    // Check if room is left of hallway
    if (roomRight <= hLeft + 10 && roomRight >= hLeft - 30) {
      if (roomCenterY >= hTop && roomCenterY <= hBottom) {
        return { hallway: h, side: 'left' };
      }
    }
    // Check if room is right of hallway
    if (roomLeft >= hRight - 10 && roomLeft <= hRight + 30) {
      if (roomCenterY >= hTop && roomCenterY <= hBottom) {
        return { hallway: h, side: 'right' };
      }
    }
  }
  return null;
}

function validateLevel(levelIndex) {
  const level = LEVELS[levelIndex];
  const errors = [];

  // Build hallways list
  const hallways = [{ id: 'hallway', ...level.hallway }];
  if (level.hallway2) hallways.push({ id: 'hallway2', ...level.hallway2 });
  if (level.hallway3) hallways.push({ id: 'hallway3', ...level.hallway3 });
  if (level.hallway4) hallways.push({ id: 'hallway4', ...level.hallway4 });
  if (level.hallway5) hallways.push({ id: 'hallway5', ...level.hallway5 });

  // Check each classroom
  for (const classroom of level.classrooms) {
    const connection = findAdjacentHallway(classroom, hallways);
    if (!connection) {
      errors.push(`❌ Classroom "${classroom.name}" has NO door!`);
      errors.push(`   Position: x=${classroom.x}, y=${classroom.y}, w=${classroom.width}, h=${classroom.height}`);
      errors.push(`   Bottom edge: ${classroom.y + classroom.height}, Center X: ${classroom.x + classroom.width/2}`);
    }
  }

  // Check office
  const office = level.office;
  const officeConnection = findAdjacentHallway(office, hallways);
  if (!officeConnection) {
    errors.push(`❌ OFFICE has NO door!`);
    errors.push(`   Position: x=${office.x}, y=${office.y}, w=${office.width}, h=${office.height}`);

    // Show what's needed
    for (const h of hallways) {
      const hRight = h.x + h.width;
      const hBottom = h.y + h.height;
      errors.push(`   For ${h.id} (ends at x=${hRight}, y=${hBottom}):`);
      errors.push(`     To connect RIGHT: office.x should be in [${hRight-10}, ${hRight+30}], centerY in [${h.y}, ${h.y+h.height}]`);
      errors.push(`     To connect BELOW: office.y should be in [${hBottom-10}, ${hBottom+30}], centerX in [${h.x}, ${h.x+h.width}]`);
    }
  }

  return errors;
}

// Run validation
console.log('=== Level Validation Report ===\n');

let totalErrors = 0;
for (let i = 0; i < LEVELS.length; i++) {
  const errors = validateLevel(i);
  const level = LEVELS[i];

  if (errors.length === 0) {
    console.log(`✅ Level ${i + 1} (${level.name}): All rooms connected!`);
  } else {
    console.log(`❌ Level ${i + 1} (${level.name}):`);
    for (const error of errors) {
      console.log(`   ${error}`);
    }
    totalErrors += errors.length;
  }
  console.log('');
}

if (totalErrors === 0) {
  console.log('=== All levels valid! ===');
} else {
  console.log(`=== ${totalErrors} issues found ===`);
}
