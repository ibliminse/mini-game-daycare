// Collision detection utilities

import { Player, Form, Desk } from './types';
import { PICKUP_DISTANCE } from './config';

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
 * Check if player would collide with map bounds
 */
export function clampToMap(
  x: number,
  y: number,
  radius: number,
  mapWidth: number,
  mapHeight: number
): { x: number; y: number } {
  return {
    x: Math.max(radius, Math.min(mapWidth - radius, x)),
    y: Math.max(radius, Math.min(mapHeight - radius, y)),
  };
}
