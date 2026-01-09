'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { LEVELS, COLORS, UPGRADE_COSTS, INSPECTION_TIME, ICE_AGENT, FORMS_PER_ROOM, CARRY_CAPACITY, MAX_CARRY_CAPACITY, SUSPICION_REDUCTION_PER_FORM, INITIAL_SUSPICION, LOSE_THRESHOLD, SPRINT_DURATION, NO_ICE_DURATION, SPRINT_SPEED_MULTIPLIER, PLAYER_SPEED, MAP_WIDTH, MAP_HEIGHT } from '@/game/config';
import { createInputState, createJoystickState } from '@/game/init';
import { updateGame, resetIceTimer } from '@/game/update';
import { render } from '@/game/render';
import { setupKeyboardListeners } from '@/game/input';
import { GameState, InputState, JoystickState, Building, Room, Door, Form } from '@/game/types';
import { AdminLogin, AdminStatsTab, AdminConfigTab, EditableLevel, EditableRoom, EditableConfig, VALIDATION, EDITOR_WIDTH, EDITOR_HEIGHT } from './components';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'maps' | 'config' | 'stats'>('maps');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isPlayTesting, setIsPlayTesting] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Map editor state
  const [editableLevel, setEditableLevel] = useState<EditableLevel | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Editable config state
  const [config, setConfig] = useState<EditableConfig>({
    inspectionTime: INSPECTION_TIME,
    playerSpeed: PLAYER_SPEED,
    carryCapacity: CARRY_CAPACITY,
    maxCarryCapacity: MAX_CARRY_CAPACITY,
    formsPerRoom: FORMS_PER_ROOM,
    initialSuspicion: INITIAL_SUSPICION,
    loseThreshold: LOSE_THRESHOLD,
    suspicionReductionPerForm: SUSPICION_REDUCTION_PER_FORM,
    iceSpeed: ICE_AGENT.speed,
    iceDuration: ICE_AGENT.duration,
    iceSpawnInterval: ICE_AGENT.spawnInterval,
    iceWarningTime: ICE_AGENT.warningTime,
    iceVisionDistance: ICE_AGENT.visionDistance,
    iceVisionAngle: ICE_AGENT.visionAngle,
    upgradeCapacityCost: UPGRADE_COSTS.carryCapacity,
    upgradeSprintCost: UPGRADE_COSTS.sprint,
    upgradeNoIceCost: UPGRADE_COSTS.noIce,
    sprintDuration: SPRINT_DURATION,
    sprintMultiplier: SPRINT_SPEED_MULTIPLIER,
    noIceDuration: NO_ICE_DURATION,
  });

  // Play test refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const inputStateRef = useRef<InputState>(createInputState());
  const joystickStateRef = useRef<JoystickState>(createJoystickState());
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);

  const updateConfig = (key: keyof EditableConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };


  // Validate and update room property
  const updateRoomProperty = useCallback((roomId: string, key: string, value: string | number) => {
    setEditableLevel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => {
          if (r.id !== roomId) return r;

          // Validate based on property type
          if (key === 'name') {
            const nameValue = String(value).slice(0, VALIDATION.MAX_NAME_LENGTH);
            return nameValue.length >= VALIDATION.MIN_NAME_LENGTH ? { ...r, name: nameValue } : r;
          }

          const numValue = Number(value);
          if (isNaN(numValue)) return r;

          switch (key) {
            case 'x':
              return { ...r, x: Math.max(VALIDATION.MIN_POSITION, Math.min(VALIDATION.MAX_X - r.width, numValue)) };
            case 'y':
              return { ...r, y: Math.max(VALIDATION.MIN_POSITION, Math.min(VALIDATION.MAX_Y - r.height, numValue)) };
            case 'width':
              return { ...r, width: Math.max(VALIDATION.MIN_ROOM_SIZE, Math.min(VALIDATION.MAX_ROOM_SIZE, numValue)) };
            case 'height':
              return { ...r, height: Math.max(VALIDATION.MIN_ROOM_SIZE, Math.min(VALIDATION.MAX_ROOM_SIZE, numValue)) };
            default:
              return r;
          }
        }),
      };
    });
  }, []);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('adminToken');
      if (savedToken) {
        try {
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedToken }),
          });
          const data = await response.json();
          if (data.valid) {
            setAuthToken(savedToken);
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('adminToken');
          }
        } catch {
          localStorage.removeItem('adminToken');
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Convert a LEVELS entry to editable format
  const levelToEditable = useCallback((levelIndex: number): EditableLevel => {
    const level = LEVELS[levelIndex];
    const rooms: EditableRoom[] = [];

    // Add main hallway
    rooms.push({
      id: 'hallway',
      name: 'Hallway',
      x: level.hallway.x,
      y: level.hallway.y,
      width: level.hallway.width,
      height: level.hallway.height,
      type: 'hallway',
    });

    // Add additional hallways
    if ('hallway2' in level && level.hallway2) {
      const h2 = level.hallway2 as { x: number; y: number; width: number; height: number };
      rooms.push({ id: 'hallway2', name: 'Hallway 2', x: h2.x, y: h2.y, width: h2.width, height: h2.height, type: 'hallway' });
    }
    if ('hallway3' in level && level.hallway3) {
      const h3 = level.hallway3 as { x: number; y: number; width: number; height: number };
      rooms.push({ id: 'hallway3', name: 'Hallway 3', x: h3.x, y: h3.y, width: h3.width, height: h3.height, type: 'hallway' });
    }
    if ('hallway4' in level && level.hallway4) {
      const h4 = level.hallway4 as { x: number; y: number; width: number; height: number };
      rooms.push({ id: 'hallway4', name: 'Hallway 4', x: h4.x, y: h4.y, width: h4.width, height: h4.height, type: 'hallway' });
    }
    if ('hallway5' in level && level.hallway5) {
      const h5 = level.hallway5 as { x: number; y: number; width: number; height: number };
      rooms.push({ id: 'hallway5', name: 'Hallway 5', x: h5.x, y: h5.y, width: h5.width, height: h5.height, type: 'hallway' });
    }

    // Add classrooms
    for (const classroom of level.classrooms) {
      rooms.push({
        id: classroom.id,
        name: classroom.name,
        x: classroom.x,
        y: classroom.y,
        width: classroom.width,
        height: classroom.height,
        type: 'classroom',
      });
    }

    // Add office
    rooms.push({
      id: level.office.id,
      name: level.office.name,
      x: level.office.x,
      y: level.office.y,
      width: level.office.width,
      height: level.office.height,
      type: 'office',
    });

    return { name: level.name, rooms };
  }, []);

  // Convert editable level to game-ready Building format
  const editableToBuilding = useCallback((editable: EditableLevel): Building => {
    const rooms: Room[] = [];
    const doors: Door[] = [];

    const hallways = editable.rooms.filter(r => r.type === 'hallway');
    const classrooms = editable.rooms.filter(r => r.type === 'classroom');
    const office = editable.rooms.find(r => r.type === 'office');

    // Add all rooms
    for (const room of editable.rooms) {
      rooms.push({
        id: room.id,
        name: room.name,
        bounds: { x: room.x, y: room.y, width: room.width, height: room.height },
        type: room.type,
        color: room.type === 'hallway' ? COLORS.hallwayFloor : room.type === 'office' ? COLORS.officeFloor : COLORS.classroomFloor,
      });
    }

    // Helper to find adjacent hallway
    const findAdjacentHallway = (roomX: number, roomY: number, roomW: number, roomH: number) => {
      const roomCenterX = roomX + roomW / 2;
      const roomCenterY = roomY + roomH / 2;
      const roomBottom = roomY + roomH;
      const roomTop = roomY;
      const roomRight = roomX + roomW;
      const roomLeft = roomX;

      for (const h of hallways) {
        const hLeft = h.x;
        const hRight = h.x + h.width;
        const hTop = h.y;
        const hBottom = h.y + h.height;

        // Check if room is above hallway
        if (roomBottom <= hTop + 10 && roomBottom >= hTop - 30) {
          if (roomCenterX >= hLeft && roomCenterX <= hRight) {
            return { hallway: h, side: 'above' as const };
          }
        }
        // Check if room is below hallway
        if (roomTop >= hBottom - 10 && roomTop <= hBottom + 30) {
          if (roomCenterX >= hLeft && roomCenterX <= hRight) {
            return { hallway: h, side: 'below' as const };
          }
        }
        // Check if room is left of hallway
        if (roomRight <= hLeft + 10 && roomRight >= hLeft - 30) {
          if (roomCenterY >= hTop && roomCenterY <= hBottom) {
            return { hallway: h, side: 'left' as const };
          }
        }
        // Check if room is right of hallway
        if (roomLeft >= hRight - 10 && roomLeft <= hRight + 30) {
          if (roomCenterY >= hTop && roomCenterY <= hBottom) {
            return { hallway: h, side: 'right' as const };
          }
        }
      }
      return null;
    };

    // Create doors for classrooms
    for (const classroom of classrooms) {
      const connection = findAdjacentHallway(classroom.x, classroom.y, classroom.width, classroom.height);
      if (connection) {
        const doorWidth = 60;
        const { hallway: h, side } = connection;
        if (side === 'above') {
          doors.push({ x: classroom.x + classroom.width / 2 - doorWidth / 2, y: classroom.y + classroom.height - 20, width: doorWidth, height: 40, connects: [classroom.id, h.id] });
        } else if (side === 'below') {
          doors.push({ x: classroom.x + classroom.width / 2 - doorWidth / 2, y: h.y + h.height - 20, width: doorWidth, height: 40, connects: [h.id, classroom.id] });
        } else if (side === 'left') {
          doors.push({ x: classroom.x + classroom.width - 20, y: classroom.y + classroom.height / 2 - doorWidth / 2, width: 40, height: doorWidth, connects: [classroom.id, h.id] });
        } else if (side === 'right') {
          doors.push({ x: h.x + h.width - 20, y: classroom.y + classroom.height / 2 - doorWidth / 2, width: 40, height: doorWidth, connects: [h.id, classroom.id] });
        }
      }
    }

    // Create door for office
    if (office) {
      const connection = findAdjacentHallway(office.x, office.y, office.width, office.height);
      if (connection) {
        const doorWidth = 60;
        const { hallway: h, side } = connection;
        if (side === 'above') {
          doors.push({ x: office.x + office.width / 2 - doorWidth / 2, y: office.y + office.height - 20, width: doorWidth, height: 40, connects: [office.id, h.id] });
        } else if (side === 'below') {
          doors.push({ x: office.x + office.width / 2 - doorWidth / 2, y: h.y + h.height - 20, width: doorWidth, height: 40, connects: [h.id, office.id] });
        } else if (side === 'left') {
          doors.push({ x: office.x + office.width - 20, y: office.y + office.height / 2 - doorWidth / 2, width: 40, height: doorWidth, connects: [office.id, h.id] });
        } else if (side === 'right') {
          doors.push({ x: h.x + h.width - 20, y: office.y + office.height / 2 - doorWidth / 2, width: 40, height: doorWidth, connects: [h.id, office.id] });
        }
      }
    }

    return { rooms, walls: [], doors };
  }, []);

  // Spawn forms for editable level
  const spawnFormsForEditable = useCallback((building: Building): Form[] => {
    const forms: Form[] = [];
    let formId = 0;
    const classrooms = building.rooms.filter(r => r.type === 'classroom');
    for (const room of classrooms) {
      for (let i = 0; i < FORMS_PER_ROOM; i++) {
        const margin = 35;
        const x = room.bounds.x + margin + Math.random() * (room.bounds.width - margin * 2);
        const y = room.bounds.y + margin + Math.random() * (room.bounds.height - margin * 2);
        forms.push({ id: `form-${formId++}`, x, y, collected: false, roomId: room.id, variant: Math.floor(Math.random() * 5) });
      }
    }
    return forms;
  }, []);

  // Auto-fit level to game bounds (1000x600)
  const fitLevelToGameBounds = useCallback((level: EditableLevel): EditableLevel => {
    if (level.rooms.length === 0) return level;

    // Calculate bounding box of all rooms
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const room of level.rooms) {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.height);
    }

    const levelWidth = maxX - minX;
    const levelHeight = maxY - minY;

    // Add padding
    const padding = 30;
    const targetWidth = MAP_WIDTH - padding * 2;
    const targetHeight = MAP_HEIGHT - padding * 2;

    // Calculate scale to fit (maintain aspect ratio)
    const scaleX = targetWidth / levelWidth;
    const scaleY = targetHeight / levelHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed

    // Calculate offset to center
    const scaledWidth = levelWidth * scale;
    const scaledHeight = levelHeight * scale;
    const offsetX = padding + (targetWidth - scaledWidth) / 2;
    const offsetY = padding + (targetHeight - scaledHeight) / 2;

    // Transform all rooms
    return {
      ...level,
      rooms: level.rooms.map(room => ({
        ...room,
        x: Math.round((room.x - minX) * scale + offsetX),
        y: Math.round((room.y - minY) * scale + offsetY),
        width: Math.round(room.width * scale),
        height: Math.round(room.height * scale),
      })),
    };
  }, []);

  // Get SVG coordinates from mouse event
  const getSvgCoords = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * EDITOR_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * EDITOR_HEIGHT;
    return { x, y };
  }, []);

  // Handle mouse down on a room
  const handleRoomMouseDown = useCallback((e: React.MouseEvent, roomId: string, handle?: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    const coords = getSvgCoords(e);
    const room = editableLevel?.rooms.find(r => r.id === roomId);
    if (!room) return;

    setSelectedRoom(roomId);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
      setDragOffset({ x: coords.x - room.x, y: coords.y - room.y });
    }
  }, [isEditMode, editableLevel, getSvgCoords]);

  // Handle mouse move for drag/resize
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editableLevel || (!isDragging && !isResizing) || !selectedRoom) return;

    const coords = getSvgCoords(e);
    const room = editableLevel.rooms.find(r => r.id === selectedRoom);
    if (!room) return;

    setEditableLevel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => {
          if (r.id !== selectedRoom) return r;

          if (isDragging) {
            // Snap to grid of 10
            const newX = Math.round((coords.x - dragOffset.x) / 10) * 10;
            const newY = Math.round((coords.y - dragOffset.y) / 10) * 10;
            return { ...r, x: Math.max(0, Math.min(EDITOR_WIDTH - r.width, newX)), y: Math.max(0, Math.min(EDITOR_HEIGHT - r.height, newY)) };
          } else if (isResizing && resizeHandle) {
            let newX = r.x, newY = r.y, newW = r.width, newH = r.height;
            const minSize = 80;

            if (resizeHandle.includes('e')) {
              newW = Math.max(minSize, Math.round((coords.x - r.x) / 10) * 10);
            }
            if (resizeHandle.includes('w')) {
              const delta = Math.round((r.x - coords.x) / 10) * 10;
              if (r.width + delta >= minSize) {
                newX = r.x - delta;
                newW = r.width + delta;
              }
            }
            if (resizeHandle.includes('s')) {
              newH = Math.max(minSize, Math.round((coords.y - r.y) / 10) * 10);
            }
            if (resizeHandle.includes('n')) {
              const delta = Math.round((r.y - coords.y) / 10) * 10;
              if (r.height + delta >= minSize) {
                newY = r.y - delta;
                newH = r.height + delta;
              }
            }

            return { ...r, x: newX, y: newY, width: newW, height: newH };
          }
          return r;
        }),
      };
    });
  }, [editableLevel, isDragging, isResizing, selectedRoom, dragOffset, resizeHandle, getSvgCoords]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Add a new room
  const addRoom = useCallback((type: 'hallway' | 'classroom') => {
    if (!editableLevel) return;

    const existingOfType = editableLevel.rooms.filter(r => r.type === type);
    const newId = type === 'hallway' ? `hallway${existingOfType.length + 1}` : `room-${String.fromCharCode(65 + existingOfType.length)}`;
    const newName = type === 'hallway' ? `Hallway ${existingOfType.length + 1}` : `Room ${String.fromCharCode(65 + existingOfType.length)}`;

    setEditableLevel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: [...prev.rooms, {
          id: newId,
          name: newName,
          x: 400,
          y: 250,
          width: type === 'hallway' ? 200 : 150,
          height: type === 'hallway' ? 80 : 150,
          type,
        }],
      };
    });
  }, [editableLevel]);

  // Delete selected room
  const deleteSelectedRoom = useCallback(() => {
    if (!editableLevel || !selectedRoom) return;
    const room = editableLevel.rooms.find(r => r.id === selectedRoom);
    if (!room || room.type === 'office') return; // Can't delete office

    setEditableLevel(prev => {
      if (!prev) return prev;
      return { ...prev, rooms: prev.rooms.filter(r => r.id !== selectedRoom) };
    });
    setSelectedRoom(null);
  }, [editableLevel, selectedRoom]);

  // Initialize editable level when selecting a level
  useEffect(() => {
    if (selectedLevel !== null && !editableLevel) {
      setEditableLevel(levelToEditable(selectedLevel));
    }
  }, [selectedLevel, editableLevel, levelToEditable]);

  // Load saved level from localStorage or use default
  const loadLevelFromStorage = useCallback((index: number): EditableLevel => {
    try {
      const saved = localStorage.getItem(`qlearn_level_${index}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // If parsing fails, use default
    }
    return levelToEditable(index);
  }, [levelToEditable]);

  // Save level to localStorage
  const saveLevelToStorage = useCallback((index: number, level: EditableLevel) => {
    try {
      localStorage.setItem(`qlearn_level_${index}`, JSON.stringify(level));
    } catch {
      console.error('Failed to save level to localStorage');
    }
  }, []);

  // Clear saved level and reset to default
  const resetLevelToDefault = useCallback((index: number) => {
    localStorage.removeItem(`qlearn_level_${index}`);
    setEditableLevel(levelToEditable(index));
  }, [levelToEditable]);

  // Reset editable level when changing selected level
  const handleSelectLevel = useCallback((index: number) => {
    setSelectedLevel(index);
    setEditableLevel(loadLevelFromStorage(index));
    setSelectedRoom(null);
    setIsEditMode(false);
  }, [loadLevelFromStorage]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setIsLoggedIn(false);
  };

  // Start play test (uses editable level if available)
  const startPlayTest = useCallback(() => {
    if (selectedLevel === null) return;

    resetIceTimer();

    // Use editable level if available, otherwise use default
    if (editableLevel) {
      // Auto-fit the level to game bounds before playing
      const fittedLevel = fitLevelToGameBounds(editableLevel);
      const building = editableToBuilding(fittedLevel);
      const forms = spawnFormsForEditable(building);
      const hallway = fittedLevel.rooms.find(r => r.id === 'hallway');
      const office = fittedLevel.rooms.find(r => r.type === 'office');

      const startX = hallway ? hallway.x + 50 : 100;
      const startY = hallway ? hallway.y + hallway.height / 2 : 300;

      gameStateRef.current = {
        phase: 'playing',
        player: {
          x: startX,
          y: startY,
          radius: 15,
          speed: config.playerSpeed,
          carrying: 0,
          carryCapacity: config.carryCapacity,
          stress: 0,
        },
        forms,
        building,
        desk: office ? { x: office.x + 40, y: office.y + 60, width: 100, height: 80 } : { x: 40, y: 60, width: 100, height: 80 },
        iceAgent: { x: -100, y: 0, direction: 'right', active: false, timer: 0, speed: config.iceSpeed },
        iceWarning: { active: false, countdown: 0 },
        enrollments: 0,
        funding: 0,
        totalFunding: 0,
        suspicion: config.initialSuspicion,
        timeRemaining: config.inspectionTime,
        level: selectedLevel,
        upgrades: { carryCapacity: 0 },
        sprintTimer: 0,
        noIceTimer: 0,
        timeSinceIceSpawn: 0,
        nextIceSpawnTime: config.iceSpawnInterval + Math.random() * 5,
      };
    } else {
      const { createInitialState } = require('@/game/init');
      gameStateRef.current = createInitialState(selectedLevel);
    }

    if (gameStateRef.current) {
      gameStateRef.current.phase = 'playing';
      gameStateRef.current.timeRemaining = config.inspectionTime;
      gameStateRef.current.suspicion = config.initialSuspicion;
      gameStateRef.current.player.speed = config.playerSpeed;
      gameStateRef.current.player.carryCapacity = config.carryCapacity;
    }

    setIsPlayTesting(true);
  }, [selectedLevel, config, editableLevel, editableToBuilding, spawnFormsForEditable, fitLevelToGameBounds]);

  // Stop play test
  const stopPlayTest = useCallback(() => {
    setIsPlayTesting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    gameStateRef.current = null;
  }, []);

  // Game loop for play test
  useEffect(() => {
    if (!isPlayTesting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup keyboard
    const isPlayingRef = { current: true };
    const cleanup = setupKeyboardListeners(inputStateRef, isPlayingRef);

    const gameLoop = (timestamp: number) => {
      if (!gameStateRef.current || !isPlayTesting) return;

      const deltaTime = Math.min(lastTimeRef.current ? timestamp - lastTimeRef.current : 16, 50);
      lastTimeRef.current = timestamp;
      gameTimeRef.current += deltaTime;

      // Update game
      if (gameStateRef.current.phase === 'playing') {
        gameStateRef.current = updateGame(
          gameStateRef.current,
          inputStateRef.current,
          joystickStateRef.current,
          deltaTime
        );
      }

      // Render
      render(ctx, gameStateRef.current, gameTimeRef.current);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cleanup();
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlayTesting]);

  // Touch handlers for play test (game controls)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = (touch.clientX - touchStartRef.current.x) / 50;
    const dy = (touch.clientY - touchStartRef.current.y) / 50;

    joystickStateRef.current = {
      active: true,
      dx: Math.max(-1, Math.min(1, dx)),
      dy: Math.max(-1, Math.min(1, dy)),
    };
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    joystickStateRef.current = { active: false, dx: 0, dy: 0 };
  };

  // Touch handlers for editor (drag rooms)
  const editorTouchRef = useRef<{ id: string; startX: number; startY: number; roomStartX: number; roomStartY: number } | null>(null);

  const handleEditorTouchStart = useCallback((e: React.TouchEvent, roomId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();
    const touch = e.touches[0];
    const room = editableLevel?.rooms.find(r => r.id === roomId);
    if (!room) return;

    setSelectedRoom(roomId);
    editorTouchRef.current = {
      id: roomId,
      startX: touch.clientX,
      startY: touch.clientY,
      roomStartX: room.x,
      roomStartY: room.y,
    };
  }, [isEditMode, editableLevel]);

  const handleEditorTouchMove = useCallback((e: React.TouchEvent) => {
    if (!editorTouchRef.current || !editableLevel || !svgRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Calculate delta in SVG coordinates
    const deltaX = ((touch.clientX - editorTouchRef.current.startX) / rect.width) * EDITOR_WIDTH;
    const deltaY = ((touch.clientY - editorTouchRef.current.startY) / rect.height) * EDITOR_HEIGHT;

    const newX = Math.round((editorTouchRef.current.roomStartX + deltaX) / 10) * 10;
    const newY = Math.round((editorTouchRef.current.roomStartY + deltaY) / 10) * 10;

    setEditableLevel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rooms: prev.rooms.map(r => {
          if (r.id !== editorTouchRef.current?.id) return r;
          return {
            ...r,
            x: Math.max(0, Math.min(EDITOR_WIDTH - r.width, newX)),
            y: Math.max(0, Math.min(EDITOR_HEIGHT - r.height, newY)),
          };
        }),
      };
    });
  }, [editableLevel]); // EDITOR_WIDTH/HEIGHT are constants, not dependencies

  const handleEditorTouchEnd = useCallback(() => {
    editorTouchRef.current = null;
  }, []);

  // Show loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: COLORS.uiBlue, borderTopColor: 'transparent' }}></div>
          <p style={{ color: COLORS.uiPaper, fontFamily: 'Comic Sans MS, cursive' }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AdminLogin onLogin={(token) => {
        setAuthToken(token);
        setIsLoggedIn(true);
      }} />
    );
  }

  // Play Test Mode
  const handleSaveConfig = () => {
    // In a real app, this would save to a database or file
    // For now, we just show a confirmation
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
    // Log the config to console for easy copying
    console.log('Saved Config:', JSON.stringify(config, null, 2));
  };

  if (isPlayTesting && selectedLevel !== null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
        {/* Header */}
        <div className="p-2 flex justify-between items-center" style={{ backgroundColor: COLORS.uiBlue }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={stopPlayTest}
              className="px-2 sm:px-3 py-1 bg-white/20 text-white rounded active:bg-white/30 transition-colors text-xs sm:text-sm"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              ← Back
            </button>
            <h1 className="text-sm sm:text-lg font-bold text-white truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              🎮 {LEVELS[selectedLevel].name}
            </h1>
          </div>
          <button
            onClick={() => startPlayTest()}
            className="px-2 sm:px-3 py-1 bg-white/20 text-white rounded active:bg-white/30 transition-colors text-xs sm:text-sm"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            🔄
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Game Canvas */}
          <div className={`flex-1 flex items-center justify-center p-2 sm:p-4 ${showConfigEditor ? 'sm:w-2/3' : 'w-full'}`}>
            <div
              className="relative w-full"
              style={{ maxWidth: showConfigEditor ? '700px' : '1000px', aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <canvas
                ref={canvasRef}
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                className="w-full h-full rounded-lg shadow-2xl"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Win/Lose overlay */}
              {gameStateRef.current && (gameStateRef.current.phase === 'win' || gameStateRef.current.phase === 'lose') && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg"
                     style={{ backgroundColor: gameStateRef.current.phase === 'win' ? 'rgba(29, 209, 161, 0.9)' : 'rgba(255, 107, 107, 0.9)' }}>
                  <div className="text-center p-6 rounded-lg" style={{ backgroundColor: COLORS.uiPaper }}>
                    <h2 className="text-2xl font-bold mb-4"
                        style={{ fontFamily: 'Comic Sans MS, cursive', color: gameStateRef.current.phase === 'win' ? COLORS.uiGreen : COLORS.uiRed }}>
                      {gameStateRef.current.phase === 'win' ? '✓ Level Passed!' : '✗ Level Failed!'}
                    </h2>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => startPlayTest()}
                        className="px-4 py-2 text-white font-bold rounded hover:scale-105 transition-transform"
                        style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        Play Again
                      </button>
                      <button
                        onClick={stopPlayTest}
                        className="px-4 py-2 font-bold rounded hover:scale-105 transition-transform"
                        style={{ backgroundColor: '#ddd', fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        Back to Admin
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Config Editor Sidebar / Bottom Sheet on mobile */}
          {showConfigEditor && (
            <div className="sm:w-1/3 sm:min-w-[280px] sm:max-w-[350px] max-h-[40vh] sm:max-h-none overflow-y-auto p-2 sm:p-3 flex flex-col" style={{ backgroundColor: COLORS.uiPaper }}>
              <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base" style={{ fontFamily: 'Comic Sans MS, cursive', color: COLORS.uiBlue }}>
                ⚙️ Config
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2 text-xs sm:text-sm flex-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>⏱️ Timer</label>
                  <input type="number" value={config.inspectionTime} onChange={(e) => updateConfig('inspectionTime', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>🏃 Speed</label>
                  <input type="number" value={config.playerSpeed} onChange={(e) => updateConfig('playerSpeed', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>📋 Carry</label>
                  <input type="number" value={config.carryCapacity} onChange={(e) => updateConfig('carryCapacity', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>👀 Suspicion</label>
                  <input type="number" value={config.initialSuspicion} onChange={(e) => updateConfig('initialSuspicion', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>❄️ ICE Spd</label>
                  <input type="number" value={config.iceSpeed} onChange={(e) => updateConfig('iceSpeed', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <label className="text-xs font-bold w-20 sm:w-28 shrink-0" style={{ color: '#555' }}>⚡ Sprint</label>
                  <input type="number" value={config.sprintDuration} onChange={(e) => updateConfig('sprintDuration', Number(e.target.value))} className="flex-1 p-1 sm:p-1.5 border rounded text-xs sm:text-sm min-w-0" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2 italic hidden sm:block">Restart to apply</p>
              {/* Cancel button */}
              <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t flex justify-end">
                <button
                  onClick={() => {
                    setConfig({
                      inspectionTime: INSPECTION_TIME,
                      playerSpeed: PLAYER_SPEED,
                      carryCapacity: CARRY_CAPACITY,
                      maxCarryCapacity: MAX_CARRY_CAPACITY,
                      formsPerRoom: FORMS_PER_ROOM,
                      initialSuspicion: INITIAL_SUSPICION,
                      loseThreshold: LOSE_THRESHOLD,
                      suspicionReductionPerForm: SUSPICION_REDUCTION_PER_FORM,
                      iceSpeed: ICE_AGENT.speed,
                      iceDuration: ICE_AGENT.duration,
                      iceSpawnInterval: ICE_AGENT.spawnInterval,
                      iceWarningTime: ICE_AGENT.warningTime,
                      iceVisionDistance: ICE_AGENT.visionDistance,
                      iceVisionAngle: ICE_AGENT.visionAngle,
                      upgradeCapacityCost: UPGRADE_COSTS.carryCapacity,
                      upgradeSprintCost: UPGRADE_COSTS.sprint,
                      upgradeNoIceCost: UPGRADE_COSTS.noIce,
                      sprintDuration: SPRINT_DURATION,
                      sprintMultiplier: SPRINT_SPEED_MULTIPLIER,
                      noIceDuration: NO_ICE_DURATION,
                    });
                    setShowConfigEditor(false);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded active:scale-95 transition-transform"
                  style={{ backgroundColor: '#ddd', fontFamily: 'Comic Sans MS, cursive' }}
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom config bar */}
        <div className="p-1.5 sm:p-2 flex justify-between items-center gap-2" style={{ backgroundColor: '#222' }}>
          <div className="text-[10px] sm:text-xs text-white/70 truncate flex-1" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            <span className="hidden sm:inline">Timer: {config.inspectionTime}s | Speed: {config.playerSpeed} | </span>
            <span>Carry: {config.carryCapacity} | ICE: {config.iceSpeed}</span>
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setShowConfigEditor(!showConfigEditor)}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold rounded active:scale-95 transition-transform ${showConfigEditor ? 'bg-white text-blue-600' : 'text-white'}`}
              style={{ backgroundColor: showConfigEditor ? undefined : COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
            >
              {showConfigEditor ? '✕' : '⚙️'}
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-2 sm:px-3 py-1 text-white text-xs sm:text-sm font-bold rounded active:scale-95 transition-transform"
              style={{ backgroundColor: configSaved ? COLORS.uiGreen : COLORS.uiPink, fontFamily: 'Comic Sans MS, cursive' }}
            >
              {configSaved ? '✓' : '💾'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a2e' }} role="main" aria-label="Admin dashboard">
      {/* Header */}
      <header className="p-2 sm:p-4 flex justify-between items-center" style={{ backgroundColor: COLORS.uiBlue }}>
        <h1 className="text-base sm:text-xl font-bold text-white" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Q-Learn™ Admin
        </h1>
        <button
          onClick={handleLogout}
          className="px-2 sm:px-4 py-1 bg-white/20 text-white rounded active:bg-white/30 transition-colors text-xs sm:text-base"
          style={{ fontFamily: 'Comic Sans MS, cursive' }}
          aria-label="Log out of admin panel"
        >
          Logout
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 p-1.5 sm:p-2" style={{ backgroundColor: COLORS.bulletinBoard }} role="tablist" aria-label="Admin sections">
        {(['maps', 'config', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-t font-bold transition-colors text-xs sm:text-base ${
              activeTab === tab ? 'text-white' : 'bg-white/50 text-gray-700 active:bg-white/70'
            }`}
            style={{
              fontFamily: 'Comic Sans MS, cursive',
              backgroundColor: activeTab === tab ? COLORS.uiBlue : undefined
            }}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`${tab}-panel`}
          >
            {tab === 'maps' ? '🗺️' : tab === 'config' ? '⚙️' : '📊'}
            <span className="hidden sm:inline"> {tab === 'maps' ? 'Maps' : tab === 'config' ? 'Config' : 'Stats'}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="p-2 sm:p-4">
        {/* Maps Tab */}
        {activeTab === 'maps' && (
          <section id="maps-panel" role="tabpanel" aria-labelledby="maps-tab">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Level List */}
            <div className="p-3 sm:p-4 rounded-lg lg:w-1/3 lg:min-w-[280px]" style={{ backgroundColor: COLORS.uiPaper }}>
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                All Levels ({LEVELS.length})
              </h2>
              <div className="space-y-2 max-h-[300px] lg:max-h-[500px] overflow-y-auto">
                {LEVELS.map((level, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectLevel(index)}
                    className={`w-full p-2 sm:p-3 rounded text-left transition-all active:scale-[0.98] ${
                      selectedLevel === index ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: selectedLevel === index ? COLORS.uiBlue : COLORS.uiYellow,
                      color: selectedLevel === index ? 'white' : '#333',
                      fontFamily: 'Comic Sans MS, cursive',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs sm:text-sm">Lv{index + 1}: {level.name}</span>
                      <span className="text-xs opacity-70">
                        {level.classrooms.length}r
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Level Preview / Editor */}
            <div className="p-3 sm:p-4 rounded-lg flex-1" style={{ backgroundColor: COLORS.uiPaper }}>
              <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ color: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}>
                {isEditMode ? '✏️ Map Editor' : 'Level Preview'}
              </h2>
              {selectedLevel !== null && editableLevel ? (
                <div>
                  {/* Header with name and buttons */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                    <h3 className="font-bold text-base sm:text-lg" style={{ fontFamily: 'Comic Sans MS, cursive', color: '#333' }}>
                      {editableLevel.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-2 sm:px-3 py-1.5 sm:py-2 font-bold rounded active:scale-95 transition-transform text-xs sm:text-sm ${isEditMode ? 'text-white' : ''}`}
                        style={{ backgroundColor: isEditMode ? COLORS.uiPink : COLORS.uiYellow, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        {isEditMode ? '✓ Done' : '✏️ Edit'}
                      </button>
                      <button
                        onClick={() => {
                          if (editableLevel) {
                            saveLevelToStorage(selectedLevel, editableLevel);
                            alert('Level saved!');
                          }
                        }}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 font-bold rounded active:scale-95 transition-transform text-xs sm:text-sm text-white"
                        style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Reset level to default? This will discard your saved changes.')) {
                            resetLevelToDefault(selectedLevel);
                          }
                        }}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 font-bold rounded active:scale-95 transition-transform text-xs sm:text-sm"
                        style={{ backgroundColor: '#ddd', fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        🔄 Reset
                      </button>
                      <button
                        onClick={startPlayTest}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 text-white font-bold rounded active:scale-95 transition-transform text-xs sm:text-sm flex items-center gap-1"
                        style={{ backgroundColor: COLORS.uiGreen, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        🎮 Play
                      </button>
                    </div>
                  </div>

                  {/* Edit mode toolbar */}
                  {isEditMode && (
                    <div className="flex gap-1.5 sm:gap-2 mb-2 p-2 rounded flex-wrap" style={{ backgroundColor: '#eee' }}>
                      <button
                        onClick={() => addRoom('hallway')}
                        className="px-2 py-1.5 text-xs font-bold rounded active:scale-95 transition-transform"
                        style={{ backgroundColor: COLORS.hallwayFloor, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        + Hall
                      </button>
                      <button
                        onClick={() => addRoom('classroom')}
                        className="px-2 py-1.5 text-xs font-bold rounded active:scale-95 transition-transform"
                        style={{ backgroundColor: COLORS.classroomFloor, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        + Room
                      </button>
                      {selectedRoom && editableLevel.rooms.find(r => r.id === selectedRoom)?.type !== 'office' && (
                        <button
                          onClick={deleteSelectedRoom}
                          className="px-2 py-1.5 text-xs font-bold rounded active:scale-95 transition-transform text-white"
                          style={{ backgroundColor: COLORS.uiRed, fontFamily: 'Comic Sans MS, cursive' }}
                        >
                          🗑️
                        </button>
                      )}
                      <button
                        onClick={() => setEditableLevel(fitLevelToGameBounds(editableLevel))}
                        className="px-2 py-1.5 text-xs font-bold rounded active:scale-95 transition-transform text-white"
                        style={{ backgroundColor: COLORS.uiGreen, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        📐 Fit
                      </button>
                      <span className="text-xs text-gray-500 ml-auto self-center hidden sm:inline" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                        {selectedRoom ? `${editableLevel.rooms.find(r => r.id === selectedRoom)?.name}` : 'Tap to select'}
                      </span>
                    </div>
                  )}

                  {/* Interactive map preview */}
                  <div
                    className="relative border-2 rounded mb-3 sm:mb-4 touch-none"
                    style={{
                      width: '100%',
                      height: isEditMode ? 'min(500px, 60vh)' : 'min(350px, 50vh)',
                      backgroundColor: '#333',
                      borderColor: isEditMode ? COLORS.uiPink : COLORS.uiBlue,
                      cursor: isEditMode ? (isDragging ? 'grabbing' : 'default') : 'default',
                    }}
                  >
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${EDITOR_WIDTH} ${EDITOR_HEIGHT}`}
                      className="w-full h-full"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchMove={handleEditorTouchMove}
                      onTouchEnd={handleEditorTouchEnd}
                      onClick={() => isEditMode && setSelectedRoom(null)}
                    >
                      {/* Game bounds indicator in edit mode */}
                      {isEditMode && (
                        <rect
                          x="0"
                          y="0"
                          width="1000"
                          height="600"
                          fill="none"
                          stroke="#4ade80"
                          strokeWidth="3"
                          strokeDasharray="10 5"
                          opacity="0.5"
                        />
                      )}
                      {/* Grid lines in edit mode */}
                      {isEditMode && (
                        <g opacity="0.15">
                          {Array.from({ length: Math.floor(EDITOR_WIDTH / 100) + 1 }).map((_, i) => (
                            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2={EDITOR_HEIGHT} stroke="white" strokeWidth="1" />
                          ))}
                          {Array.from({ length: Math.floor(EDITOR_HEIGHT / 100) + 1 }).map((_, i) => (
                            <line key={`h${i}`} x1="0" y1={i * 100} x2={EDITOR_WIDTH} y2={i * 100} stroke="white" strokeWidth="1" />
                          ))}
                        </g>
                      )}
                      {/* Game bounds label */}
                      {isEditMode && (
                        <text x="5" y="20" fill="#4ade80" fontSize="14" opacity="0.7" fontFamily="Comic Sans MS, cursive">
                          Game Area (1000x600)
                        </text>
                      )}

                      {/* Render all rooms from editable level */}
                      {editableLevel.rooms.map((room) => {
                        const isSelected = selectedRoom === room.id;
                        const fillColor = room.type === 'hallway' ? COLORS.hallwayFloor : room.type === 'office' ? COLORS.officeFloor : COLORS.classroomFloor;
                        const strokeColor = room.type === 'office' ? COLORS.uiGreen : isSelected ? COLORS.uiPink : COLORS.wall;

                        return (
                          <g key={room.id}>
                            {/* Room rectangle */}
                            <rect
                              x={room.x}
                              y={room.y}
                              width={room.width}
                              height={room.height}
                              fill={fillColor}
                              stroke={strokeColor}
                              strokeWidth={isSelected ? 4 : room.type === 'office' ? 4 : 3}
                              style={{ cursor: isEditMode ? 'grab' : 'default' }}
                              onMouseDown={(e) => handleRoomMouseDown(e, room.id)}
                              onTouchStart={(e) => handleEditorTouchStart(e, room.id)}
                            />
                            {/* Room label */}
                            <text
                              x={room.x + room.width / 2}
                              y={room.y + room.height / 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={room.type === 'office' ? 20 : room.type === 'hallway' ? 14 : 18}
                              fill={room.type === 'office' ? COLORS.uiGreen : '#333'}
                              fontWeight={room.type === 'office' ? 'bold' : 'normal'}
                              fontFamily="Comic Sans MS, cursive"
                              style={{ pointerEvents: 'none' }}
                            >
                              {room.type === 'office' ? 'OFFICE' : room.name}
                            </text>

                            {/* Resize handles in edit mode */}
                            {isEditMode && isSelected && (
                              <>
                                {/* Corner handles */}
                                <rect x={room.x - 6} y={room.y - 6} width={12} height={12} fill={COLORS.uiPink} style={{ cursor: 'nw-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'nw')} />
                                <rect x={room.x + room.width - 6} y={room.y - 6} width={12} height={12} fill={COLORS.uiPink} style={{ cursor: 'ne-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'ne')} />
                                <rect x={room.x - 6} y={room.y + room.height - 6} width={12} height={12} fill={COLORS.uiPink} style={{ cursor: 'sw-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'sw')} />
                                <rect x={room.x + room.width - 6} y={room.y + room.height - 6} width={12} height={12} fill={COLORS.uiPink} style={{ cursor: 'se-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'se')} />
                                {/* Edge handles */}
                                <rect x={room.x + room.width / 2 - 6} y={room.y - 6} width={12} height={12} fill={COLORS.uiBlue} style={{ cursor: 'n-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'n')} />
                                <rect x={room.x + room.width / 2 - 6} y={room.y + room.height - 6} width={12} height={12} fill={COLORS.uiBlue} style={{ cursor: 's-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 's')} />
                                <rect x={room.x - 6} y={room.y + room.height / 2 - 6} width={12} height={12} fill={COLORS.uiBlue} style={{ cursor: 'w-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'w')} />
                                <rect x={room.x + room.width - 6} y={room.y + room.height / 2 - 6} width={12} height={12} fill={COLORS.uiBlue} style={{ cursor: 'e-resize' }} onMouseDown={(e) => handleRoomMouseDown(e, room.id, 'e')} />
                              </>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Room properties panel in edit mode */}
                  {isEditMode && selectedRoom && (
                    <div className="p-2 sm:p-3 rounded mb-3 sm:mb-4" style={{ backgroundColor: '#eee' }}>
                      <h4 className="font-bold text-xs sm:text-sm mb-2" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                        {editableLevel.rooms.find(r => r.id === selectedRoom)?.name} Properties
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div>
                          <label className="block font-bold mb-1">Name</label>
                          <input
                            type="text"
                            value={editableLevel.rooms.find(r => r.id === selectedRoom)?.name || ''}
                            onChange={(e) => updateRoomProperty(selectedRoom, 'name', e.target.value)}
                            maxLength={30}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">X</label>
                          <input
                            type="number"
                            min={0}
                            max={VALIDATION.MAX_X}
                            value={editableLevel.rooms.find(r => r.id === selectedRoom)?.x || 0}
                            onChange={(e) => updateRoomProperty(selectedRoom, 'x', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Y</label>
                          <input
                            type="number"
                            min={0}
                            max={VALIDATION.MAX_Y}
                            value={editableLevel.rooms.find(r => r.id === selectedRoom)?.y || 0}
                            onChange={(e) => updateRoomProperty(selectedRoom, 'y', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Width</label>
                          <input
                            type="number"
                            min={VALIDATION.MIN_ROOM_SIZE}
                            max={VALIDATION.MAX_ROOM_SIZE}
                            value={editableLevel.rooms.find(r => r.id === selectedRoom)?.width || 0}
                            onChange={(e) => updateRoomProperty(selectedRoom, 'width', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">Height</label>
                          <input
                            type="number"
                            min={VALIDATION.MIN_ROOM_SIZE}
                            max={VALIDATION.MAX_ROOM_SIZE}
                            value={editableLevel.rooms.find(r => r.id === selectedRoom)?.height || 0}
                            onChange={(e) => updateRoomProperty(selectedRoom, 'height', e.target.value)}
                            className="w-full p-1 border rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Level Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                    <div className="p-1.5 sm:p-2 rounded" style={{ backgroundColor: COLORS.uiBlue, color: 'white' }}>
                      <strong>Rooms:</strong> {editableLevel.rooms.filter(r => r.type === 'classroom').length}
                    </div>
                    <div className="p-1.5 sm:p-2 rounded" style={{ backgroundColor: COLORS.uiGreen, color: 'white' }}>
                      <strong>Forms:</strong> {editableLevel.rooms.filter(r => r.type === 'classroom').length * FORMS_PER_ROOM}
                    </div>
                    <div className="p-1.5 sm:p-2 rounded" style={{ backgroundColor: COLORS.uiYellow, color: '#333' }}>
                      <strong>Halls:</strong> {editableLevel.rooms.filter(r => r.type === 'hallway').length}
                    </div>
                    <div className="p-1.5 sm:p-2 rounded" style={{ backgroundColor: COLORS.uiPink, color: 'white' }}>
                      <strong>Office:</strong> {editableLevel.rooms.filter(r => r.type === 'office').length > 0 ? '✓' : '✗'}
                    </div>
                  </div>

                  {/* Export button */}
                  {isEditMode && (
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          console.log('Level Layout JSON:', JSON.stringify(editableLevel, null, 2));
                          alert('Level layout exported to console! Check browser DevTools.');
                        }}
                        className="w-full py-2 text-white font-bold rounded hover:scale-[1.02] transition-transform"
                        style={{ backgroundColor: COLORS.uiBlue, fontFamily: 'Comic Sans MS, cursive' }}
                      >
                        📋 Export Layout to Console
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
                  Select a level to preview
                </p>
              )}
            </div>
          </div>
          </section>
        )}

        {/* Config Tab - Editable */}
        {activeTab === 'config' && (
          <AdminConfigTab
            config={config}
            onConfigChange={updateConfig}
            onGoToMaps={() => setActiveTab('maps')}
          />
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && <AdminStatsTab />}
      </div>
    </div>
  );
}
