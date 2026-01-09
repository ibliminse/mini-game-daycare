// Game entity types

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Room {
  id: string;
  name: string;
  bounds: Rect;
  type: 'classroom' | 'hallway' | 'office';
  color: string;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

export interface Door {
  x: number;
  y: number;
  width: number;
  height: number;
  connects: [string, string]; // room IDs
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  carrying: number;
  carryCapacity: number;
  stress: number; // 0-1 for animation
}

export interface Form {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  roomId: string;
  variant: number; // different kid drawing styles
}

export interface Desk {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Building {
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
}

export interface GameState {
  phase: 'menu' | 'playing' | 'win' | 'lose';
  player: Player;
  forms: Form[];
  building: Building;
  desk: Desk;
  enrollments: number;
  funding: number;
  suspicion: number;
  timeRemaining: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface JoystickState {
  active: boolean;
  dx: number;
  dy: number;
}
