// Input handling for keyboard and touch joystick

import { InputState, JoystickState } from './types';

/**
 * Get movement direction from keyboard input
 */
export function getKeyboardDirection(input: InputState): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;

  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;
  }

  return { dx, dy };
}

/**
 * Get movement direction from joystick
 */
export function getJoystickDirection(joystick: JoystickState): { dx: number; dy: number } {
  if (!joystick.active) {
    return { dx: 0, dy: 0 };
  }

  const dx = joystick.dx;
  const dy = joystick.dy;

  // Normalize if magnitude > 1
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude > 1) {
    return { dx: dx / magnitude, dy: dy / magnitude };
  }

  return { dx, dy };
}

/**
 * Combine keyboard and joystick input
 */
export function getCombinedDirection(
  input: InputState,
  joystick: JoystickState
): { dx: number; dy: number } {
  const keyboard = getKeyboardDirection(input);
  const joy = getJoystickDirection(joystick);

  // Use joystick if active, otherwise keyboard
  if (joystick.active) {
    return joy;
  }

  return keyboard;
}

/**
 * Setup keyboard event listeners
 */
export function setupKeyboardListeners(
  inputRef: { current: InputState },
  isPlayingRef: { current: boolean }
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isPlayingRef.current) return;

    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        e.preventDefault();
        inputRef.current.up = true;
        break;
      case 's':
      case 'arrowdown':
        e.preventDefault();
        inputRef.current.down = true;
        break;
      case 'a':
      case 'arrowleft':
        e.preventDefault();
        inputRef.current.left = true;
        break;
      case 'd':
      case 'arrowright':
        e.preventDefault();
        inputRef.current.right = true;
        break;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        inputRef.current.up = false;
        break;
      case 's':
      case 'arrowdown':
        inputRef.current.down = false;
        break;
      case 'a':
      case 'arrowleft':
        inputRef.current.left = false;
        break;
      case 'd':
      case 'arrowright':
        inputRef.current.right = false;
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}
