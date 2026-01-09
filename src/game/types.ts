// Game entity types

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  speed: number;
  carrying: number;
  carryCapacity: number;
}

export interface Form {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}

export interface Desk {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  phase: 'menu' | 'playing' | 'win' | 'lose';
  player: Player;
  forms: Form[];
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
