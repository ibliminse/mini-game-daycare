// Script to validate all level layouts
// Run with: npx ts-node scripts/validate-levels.ts

import { LEVELS } from '../src/game/config';

interface RoomDef {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HallwayDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Same logic as init.ts findAdjacentHallway
function findAdjacentHallway(
  room: RoomDef,
  hallways: HallwayDef[]
): { hallway: HallwayDef; side: 'above' | 'below' | 'left' | 'right' } | null {
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

    // Check if room is above hallway (horizontal connection)
    if (roomBottom <= hTop + 10 && roomBottom >= hTop - 30) {
      if (roomCenterX >= hLeft && roomCenterX <= hRight) {
        return { hallway: h, side: 'above' };
      }
    }
    // Check if room is below hallway (horizontal connection)
    if (roomTop >= hBottom - 10 && roomTop <= hBottom + 30) {
      if (roomCenterX >= hLeft && roomCenterX <= hRight) {
        return { hallway: h, side: 'below' };
      }
    }
    // Check if room is left of hallway (vertical connection)
    if (roomRight <= hLeft + 10 && roomRight >= hLeft - 30) {
      if (roomCenterY >= hTop && roomCenterY <= hBottom) {
        return { hallway: h, side: 'left' };
      }
    }
    // Check if room is right of hallway (vertical connection)
    if (roomLeft >= hRight - 10 && roomLeft <= hRight + 30) {
      if (roomCenterY >= hTop && roomCenterY <= hBottom) {
        return { hallway: h, side: 'right' };
      }
    }
  }
  return null;
}

function validateLevel(levelIndex: number): string[] {
  const level = LEVELS[levelIndex];
  const errors: string[] = [];

  // Build hallways list
  const hallways: HallwayDef[] = [
    { id: 'hallway', ...level.hallway },
  ];
  if ('hallway2' in level && level.hallway2) {
    hallways.push({ id: 'hallway2', ...(level.hallway2 as any) });
  }
  if ('hallway3' in level && level.hallway3) {
    hallways.push({ id: 'hallway3', ...(level.hallway3 as any) });
  }
  if ('hallway4' in level && level.hallway4) {
    hallways.push({ id: 'hallway4', ...(level.hallway4 as any) });
  }
  if ('hallway5' in level && level.hallway5) {
    hallways.push({ id: 'hallway5', ...(level.hallway5 as any) });
  }

  // Check each classroom
  for (const classroom of level.classrooms) {
    const connection = findAdjacentHallway(classroom, hallways);
    if (!connection) {
      errors.push(`Classroom "${classroom.name}" (${classroom.id}) has NO door connection!`);
      // Debug info
      const roomBottom = classroom.y + classroom.height;
      const roomTop = classroom.y;
      const roomLeft = classroom.x;
      const roomRight = classroom.x + classroom.width;
      const roomCenterX = classroom.x + classroom.width / 2;
      const roomCenterY = classroom.y + classroom.height / 2;

      errors.push(`  Room bounds: x=${classroom.x}, y=${classroom.y}, w=${classroom.width}, h=${classroom.height}`);
      errors.push(`  Room edges: top=${roomTop}, bottom=${roomBottom}, left=${roomLeft}, right=${roomRight}`);
      errors.push(`  Room center: x=${roomCenterX}, y=${roomCenterY}`);

      for (const h of hallways) {
        errors.push(`  Hallway "${h.id}": x=${h.x}, y=${h.y}, w=${h.width}, h=${h.height}`);
        errors.push(`    H edges: top=${h.y}, bottom=${h.y + h.height}, left=${h.x}, right=${h.x + h.width}`);

        // Check each condition
        const hTop = h.y;
        const hBottom = h.y + h.height;
        const hLeft = h.x;
        const hRight = h.x + h.width;

        // Above check
        const aboveEdge = roomBottom <= hTop + 10 && roomBottom >= hTop - 30;
        const aboveCenter = roomCenterX >= hLeft && roomCenterX <= hRight;
        errors.push(`    Above: edge=${aboveEdge} (${roomBottom} in [${hTop-30}, ${hTop+10}]), center=${aboveCenter} (${roomCenterX} in [${hLeft}, ${hRight}])`);

        // Below check
        const belowEdge = roomTop >= hBottom - 10 && roomTop <= hBottom + 30;
        const belowCenter = roomCenterX >= hLeft && roomCenterX <= hRight;
        errors.push(`    Below: edge=${belowEdge} (${roomTop} in [${hBottom-10}, ${hBottom+30}]), center=${belowCenter}`);

        // Left check
        const leftEdge = roomRight <= hLeft + 10 && roomRight >= hLeft - 30;
        const leftCenter = roomCenterY >= hTop && roomCenterY <= hBottom;
        errors.push(`    Left: edge=${leftEdge} (${roomRight} in [${hLeft-30}, ${hLeft+10}]), center=${leftCenter} (${roomCenterY} in [${hTop}, ${hBottom}])`);

        // Right check
        const rightEdge = roomLeft >= hRight - 10 && roomLeft <= hRight + 30;
        const rightCenter = roomCenterY >= hTop && roomCenterY <= hBottom;
        errors.push(`    Right: edge=${rightEdge} (${roomLeft} in [${hRight-10}, ${hRight+30}]), center=${rightCenter}`);
      }
    }
  }

  // Check office
  const office = level.office;
  const officeConnection = findAdjacentHallway(office, hallways);
  if (!officeConnection) {
    errors.push(`OFFICE "${office.name}" has NO door connection!`);
    const roomBottom = office.y + office.height;
    const roomTop = office.y;
    const roomLeft = office.x;
    const roomRight = office.x + office.width;
    const roomCenterX = office.x + office.width / 2;
    const roomCenterY = office.y + office.height / 2;

    errors.push(`  Office bounds: x=${office.x}, y=${office.y}, w=${office.width}, h=${office.height}`);
    errors.push(`  Office edges: top=${roomTop}, bottom=${roomBottom}, left=${roomLeft}, right=${roomRight}`);
    errors.push(`  Office center: x=${roomCenterX}, y=${roomCenterY}`);

    for (const h of hallways) {
      const hTop = h.y;
      const hBottom = h.y + h.height;
      const hLeft = h.x;
      const hRight = h.x + h.width;

      errors.push(`  Hallway "${h.id}": top=${hTop}, bottom=${hBottom}, left=${hLeft}, right=${hRight}`);

      // Right of hallway check (most likely for office)
      const rightEdge = roomLeft >= hRight - 10 && roomLeft <= hRight + 30;
      const rightCenter = roomCenterY >= hTop && roomCenterY <= hBottom;
      errors.push(`    Right: edge=${rightEdge} (${roomLeft} in [${hRight-10}, ${hRight+30}]), center=${rightCenter} (${roomCenterY} in [${hTop}, ${hBottom}])`);

      // Below check
      const belowEdge = roomTop >= hBottom - 10 && roomTop <= hBottom + 30;
      const belowCenter = roomCenterX >= hLeft && roomCenterX <= hRight;
      errors.push(`    Below: edge=${belowEdge} (${roomTop} in [${hBottom-10}, ${hBottom+30}]), center=${belowCenter} (${roomCenterX} in [${hLeft}, ${hRight}])`);
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
    console.log(`❌ Level ${i + 1} (${level.name}): ${errors.length} issues`);
    for (const error of errors) {
      console.log(`   ${error}`);
    }
    totalErrors += errors.length;
  }
  console.log('');
}

console.log(`\n=== Summary: ${totalErrors === 0 ? 'All levels valid!' : `${totalErrors} total issues found`} ===`);
