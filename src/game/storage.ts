// Storage utilities for persisting game configuration and custom levels

import { LevelSpec, LEVEL_SPECS, createBlankLevelSpec } from './levelSpec';
import { COLORS } from './config';

const STORAGE_KEYS = {
  CUSTOM_LEVELS: 'qlearn_custom_levels',
  GAME_CONFIG: 'qlearn_game_config',
  COLOR_THEME: 'qlearn_color_theme',
};

// ============ Custom Levels ============

/**
 * Get all custom levels from localStorage
 */
export function getCustomLevels(): LevelSpec[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_LEVELS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load custom levels:', e);
  }
  return [];
}

/**
 * Save custom levels to localStorage
 */
export function saveCustomLevels(levels: LevelSpec[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_LEVELS, JSON.stringify(levels));
  } catch (e) {
    console.error('Failed to save custom levels:', e);
  }
}

/**
 * Add a new custom level
 */
export function addCustomLevel(level: LevelSpec): LevelSpec[] {
  const levels = getCustomLevels();
  levels.push({ ...level, isCustom: true, createdAt: Date.now() });
  saveCustomLevels(levels);
  return levels;
}

/**
 * Update a custom level
 */
export function updateCustomLevel(levelId: string, updates: Partial<LevelSpec>): LevelSpec[] {
  const levels = getCustomLevels();
  const index = levels.findIndex(l => l.id === levelId);
  if (index !== -1) {
    levels[index] = { ...levels[index], ...updates };
    saveCustomLevels(levels);
  }
  return levels;
}

/**
 * Delete a custom level
 */
export function deleteCustomLevel(levelId: string): LevelSpec[] {
  const levels = getCustomLevels().filter(l => l.id !== levelId);
  saveCustomLevels(levels);
  return levels;
}

/**
 * Get all levels (predefined + custom)
 */
export function getAllLevels(): LevelSpec[] {
  return [...LEVEL_SPECS, ...getCustomLevels()];
}

/**
 * Create a duplicate of a level
 */
export function duplicateLevel(level: LevelSpec): LevelSpec {
  return {
    ...level,
    id: `custom-${Date.now()}`,
    name: `${level.name} (Copy)`,
    isCustom: true,
    createdAt: Date.now(),
    hallways: level.hallways.map(h => ({ ...h, id: `${h.id}-copy` })),
    classrooms: level.classrooms.map(c => ({ ...c, id: `${c.id}-copy` })),
    office: { ...level.office, id: `${level.office.id}-copy` },
  };
}

// ============ Game Config ============

export interface SavedGameConfig {
  inspectionTime: number;
  playerSpeed: number;
  carryCapacity: number;
  maxCarryCapacity: number;
  formsPerRoom: number;
  initialSuspicion: number;
  loseThreshold: number;
  suspicionReductionPerForm: number;
  passiveSuspicionRate: number;
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

/**
 * Get saved game config
 */
export function getSavedConfig(): SavedGameConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_CONFIG);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load game config:', e);
  }
  return null;
}

/**
 * Save game config
 */
export function saveGameConfig(config: SavedGameConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save game config:', e);
  }
}

/**
 * Clear saved game config (reset to defaults)
 */
export function clearSavedConfig(): void {
  localStorage.removeItem(STORAGE_KEYS.GAME_CONFIG);
}

// ============ Color Theme ============

export interface ColorTheme {
  hallwayFloor: string;
  classroomFloor: string;
  officeFloor: string;
  wall: string;
  wallTrim: string;
  playerShirt: string;
  playerPants: string;
  playerSkin: string;
  uiBlue: string;
  uiGreen: string;
  uiRed: string;
  uiYellow: string;
  uiPink: string;
}

/**
 * Get saved color theme
 */
export function getSavedTheme(): Partial<ColorTheme> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.COLOR_THEME);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load color theme:', e);
  }
  return null;
}

/**
 * Save color theme
 */
export function saveColorTheme(theme: Partial<ColorTheme>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COLOR_THEME, JSON.stringify(theme));
  } catch (e) {
    console.error('Failed to save color theme:', e);
  }
}

/**
 * Clear saved theme (reset to defaults)
 */
export function clearSavedTheme(): void {
  localStorage.removeItem(STORAGE_KEYS.COLOR_THEME);
}

/**
 * Get default colors
 */
export function getDefaultColors(): ColorTheme {
  return {
    hallwayFloor: COLORS.hallwayFloor,
    classroomFloor: COLORS.classroomFloor,
    officeFloor: COLORS.officeFloor,
    wall: COLORS.wall,
    wallTrim: COLORS.wallTrim,
    playerShirt: COLORS.playerShirt,
    playerPants: COLORS.playerPants,
    playerSkin: COLORS.playerSkin,
    uiBlue: COLORS.uiBlue,
    uiGreen: COLORS.uiGreen,
    uiRed: COLORS.uiRed,
    uiYellow: COLORS.uiYellow,
    uiPink: COLORS.uiPink,
  };
}

// ============ Export/Import ============

export interface ExportData {
  version: number;
  customLevels: LevelSpec[];
  gameConfig: SavedGameConfig | null;
  colorTheme: Partial<ColorTheme> | null;
}

/**
 * Export all saved data as JSON
 */
export function exportAllData(): string {
  const data: ExportData = {
    version: 1,
    customLevels: getCustomLevels(),
    gameConfig: getSavedConfig(),
    colorTheme: getSavedTheme(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
export function importAllData(json: string): boolean {
  try {
    const data: ExportData = JSON.parse(json);
    if (data.version !== 1) {
      console.error('Unsupported export version');
      return false;
    }
    if (data.customLevels) {
      saveCustomLevels(data.customLevels);
    }
    if (data.gameConfig) {
      saveGameConfig(data.gameConfig);
    }
    if (data.colorTheme) {
      saveColorTheme(data.colorTheme);
    }
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}
