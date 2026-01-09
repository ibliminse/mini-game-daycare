// Shared types for admin components

// Editable room type for the map editor
export interface EditableRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'hallway' | 'classroom' | 'office';
}

// Editable level layout
export interface EditableLevel {
  name: string;
  rooms: EditableRoom[];
}

// Editable config type
export interface EditableConfig {
  inspectionTime: number;
  playerSpeed: number;
  carryCapacity: number;
  maxCarryCapacity: number;
  formsPerRoom: number;
  initialSuspicion: number;
  loseThreshold: number;
  suspicionReductionPerForm: number;
  iceSpeed: number;
  iceDuration: number;
  iceSpawnInterval: number;
  iceWarningTime: number;
  iceVisionDistance: number;
  iceVisionAngle: number;
  upgradeCapacityCost: number;
  upgradeSprintCost: number;
  upgradeNoIceCost: number;
  sprintDuration: number;
  sprintMultiplier: number;
  noIceDuration: number;
}

// Validation constants
export const VALIDATION = {
  MIN_ROOM_SIZE: 50,
  MAX_ROOM_SIZE: 500,
  MIN_POSITION: 0,
  MAX_X: 1400,
  MAX_Y: 900,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 30,
};

// Editor canvas dimensions
export const EDITOR_WIDTH = 1400;
export const EDITOR_HEIGHT = 900;
