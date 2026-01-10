// Collision detection utilities

import { Player, Form, Desk, Building, Room, Rect } from './types';
import { PICKUP_DISTANCE, MAP_WIDTH, MAP_HEIGHT } from './config';

/**
 * Check if player is close enough to pick up a form
 */
export function canPickupForm(player: Player, form: Form): boolean {
  if (form.collected) return false;

  const dx = player.x - form.x;
  const dy = player.y - form.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < PICKUP_DISTANCE;
}

/**
 * Check if player is inside the desk drop-off zone
 */
export function isPlayerAtDesk(player: Player, desk: Desk): boolean {
  return (
    player.x > desk.x &&
    player.x < desk.x + desk.width &&
    player.y > desk.y &&
    player.y < desk.y + desk.height
  );
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

/**
 * Check if player position is walkable (in any room or door zone)
 */
export function isPositionWalkable(
  x: number,
  y: number,
  radius: number,
  building: Building
): boolean {
  // Check if player center is in any room (with padding for walls)
  for (const room of building.rooms) {
    const padding = radius + 4; // Wall padding
    const innerBounds = {
      x: room.bounds.x + padding,
      y: room.bounds.y + padding,
      width: room.bounds.width - padding * 2,
      height: room.bounds.height - padding * 2,
    };

    if (pointInRect(x, y, innerBounds)) {
      return true;
    }
  }

  // Check if player is in a door zone (expanded area for passage)
  for (const door of building.doors) {
    // Door zones need to be significantly expanded to bridge room-hallway gaps
    // The gap between room/hallway inner bounds and door can be 20-30px on each side
    const expansion = 30;
    const doorBounds = {
      x: door.x - expansion,
      y: door.y - expansion,
      width: door.width + expansion * 2,
      height: door.height + expansion * 2,
    };

    if (pointInRect(x, y, doorBounds)) {
      return true;
    }
  }

  return false;
}

/**
 * Clamp position to walkable areas, with wall sliding
 */
export function clampToWalkable(
  newX: number,
  newY: number,
  oldX: number,
  oldY: number,
  radius: number,
  building: Building
): { x: number; y: number } {
  // Try full movement first
  if (isPositionWalkable(newX, newY, radius, building)) {
    return { x: newX, y: newY };
  }

  // Try X-only movement (slide along horizontal walls)
  if (isPositionWalkable(newX, oldY, radius, building)) {
    return { x: newX, y: oldY };
  }

  // Try Y-only movement (slide along vertical walls)
  if (isPositionWalkable(oldX, newY, radius, building)) {
    return { x: oldX, y: newY };
  }

  // Can't move
  return { x: oldX, y: oldY };
}

/**
 * Find which room a point is in
 */
export function getRoomAtPosition(x: number, y: number, building: Building): Room | null {
  for (const room of building.rooms) {
    if (pointInRect(x, y, room.bounds)) {
      return room;
    }
  }
  return null;
}

/**
 * Clamp to map bounds (fallback)
 */
export function clampToMap(
  x: number,
  y: number,
  radius: number
): { x: number; y: number } {
  return {
    x: Math.max(radius, Math.min(MAP_WIDTH - radius, x)),
    y: Math.max(radius, Math.min(MAP_HEIGHT - radius, y)),
  };
}
