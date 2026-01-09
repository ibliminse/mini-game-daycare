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

export interface IceAgent {
  x: number;
  y: number;
  direction: 'left' | 'right';
  active: boolean;
  timer: number; // seconds remaining
  speed: number;
}

export interface Building {
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
}

export interface IceWarning {
  active: boolean;
  countdown: number; // seconds remaining
}

export interface Upgrades {
  carryCapacity: number; // extra capacity purchased (0-7, since base is 3 and max is 10)
}

export interface GameState {
  phase: 'menu' | 'playing' | 'win' | 'lose';
  player: Player;
  forms: Form[];
  building: Building;
  desk: Desk;
  iceAgent: IceAgent;
  iceWarning: IceWarning;
  enrollments: number;
  funding: number;
  totalFunding: number; // accumulated across games for upgrades
  suspicion: number;
  timeRemaining: number;
  level: number;
  upgrades: Upgrades;
  sprintTimer: number; // seconds remaining of sprint
  noIceTimer: number; // seconds remaining of no-ICE protection
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
