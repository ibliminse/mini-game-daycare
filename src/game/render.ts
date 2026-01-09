// Canvas rendering functions - Preschool Chaos style

import { GameState, Room, IceAgent } from './types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  COLORS,
  WARNING_THRESHOLD,
  WALL_THICKNESS,
  ICE_AGENT,
} from './config';

// Seeded random for consistent decorations
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Main render function
 */
export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  // Clear with background color
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Draw building
  drawBuilding(ctx, state, time);

  // Draw doors
  drawDoors(ctx, state);

  // Draw forms in classrooms
  drawForms(ctx, state, time);

  // Draw desk
  drawDesk(ctx, state, time);

  // Draw player
  drawPlayer(ctx, state, time);

  // Draw form stack following player
  if (state.player.carrying > 0) {
    drawFormStack(ctx, state, time);
  }

  // Draw room labels
  drawRoomLabels(ctx, state);

  // Draw ICE agent
  if (state.iceAgent.active) {
    drawIceAgent(ctx, state.iceAgent, time);
  }

  // Draw warning banner if suspicion high
  if (state.suspicion >= WARNING_THRESHOLD && state.phase === 'playing') {
    drawWarningBanner(ctx, time);
  }

  // Draw ICE warning if agent is active
  if (state.iceAgent.active) {
    drawIceWarning(ctx, time);
  }

  // Draw ICE incoming warning countdown
  if (state.iceWarning.active) {
    drawIceCountdown(ctx, state.iceWarning.countdown, time);
  }
}

/**
 * Draw all rooms in the building
 */
function drawBuilding(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  for (const room of state.building.rooms) {
    drawRoom(ctx, room, time);
  }
}

/**
 * Draw a single room with decorations
 */
function drawRoom(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  const { x, y, width, height } = room.bounds;

  // Floor
  ctx.fillStyle = room.color;
  ctx.fillRect(x, y, width, height);

  // Add floor pattern for classrooms
  if (room.type === 'classroom') {
    drawClassroomDecorations(ctx, room, time);
  }

  // Add posters to hallway
  if (room.type === 'hallway') {
    drawHallwayDecorations(ctx, room);
  }

  // Wall border
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = WALL_THICKNESS;
  ctx.strokeRect(x + WALL_THICKNESS / 2, y + WALL_THICKNESS / 2, width - WALL_THICKNESS, height - WALL_THICKNESS);

  // Wall trim (inner line)
  ctx.strokeStyle = COLORS.wallTrim;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + WALL_THICKNESS + 2, y + WALL_THICKNESS + 2, width - WALL_THICKNESS * 2 - 4, height - WALL_THICKNESS * 2 - 4);
}

/**
 * Draw hallway decorations (posters, floor tiles)
 */
function drawHallwayDecorations(ctx: CanvasRenderingContext2D, room: Room): void {
  const { x, y, width, height } = room.bounds;

  // Floor tiles pattern
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  const tileSize = 40;
  for (let tx = x; tx < x + width; tx += tileSize) {
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + height);
    ctx.stroke();
  }
  for (let ty = y; ty < y + height; ty += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x + width, ty);
    ctx.stroke();
  }

  // "Know Your Rights" posters along hallway - just 2-3, spread out
  const posterSpacing = 400;
  for (let px = x + 200; px < x + width - 200; px += posterSpacing) {
    drawKnowYourRightsPoster(ctx, px, y + 25, Math.floor(px / 100) % 3);
  }
}

/**
 * Draw classroom decorations (bulletin boards, kid art, mess)
 */
function drawClassroomDecorations(ctx: CanvasRenderingContext2D, room: Room, time: number): void {
  const { x, y, width, height } = room.bounds;
  const seed = room.id.charCodeAt(room.id.length - 1);

  // Bulletin board on wall - positioned lower
  const boardX = x + 20;
  const boardY = y + 50;
  const boardW = 60;
  const boardH = 40;

  ctx.fillStyle = COLORS.bulletinBoard;
  ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 3;
  ctx.strokeRect(boardX, boardY, boardW, boardH);

  // Kid drawings on bulletin board
  for (let i = 0; i < 3; i++) {
    const paperX = boardX + 5 + i * 18;
    const paperY = boardY + 5 + seededRandom(seed + i) * 10;
    const color = COLORS.constructionPaper[Math.floor(seededRandom(seed + i + 10) * COLORS.constructionPaper.length)];

    ctx.fillStyle = color;
    ctx.fillRect(paperX, paperY, 15, 20);

    // Crayon scribble
    ctx.strokeStyle = COLORS.formCrayon[Math.floor(seededRandom(seed + i + 20) * COLORS.formCrayon.length)];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paperX + 3, paperY + 5);
    ctx.lineTo(paperX + 12, paperY + 15);
    ctx.stroke();
  }

  // "Know Your Rights" poster on right wall (every other room)
  if (seed % 2 === 0) {
    drawKnowYourRightsPoster(ctx, x + width - 40, y + 60, seed % 3);
  }

  // Random toy/mess on floor
  const toyX = x + width - 50 + seededRandom(seed + 30) * 20;
  const toyY = y + height - 40 + seededRandom(seed + 31) * 15;
  drawToy(ctx, toyX, toyY, seed);

  // Crayon marks on floor
  ctx.strokeStyle = COLORS.formCrayon[seed % COLORS.formCrayon.length];
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const markX = x + 30 + seededRandom(seed + 40) * (width - 80);
  const markY = y + height - 30;
  ctx.moveTo(markX, markY);
  ctx.quadraticCurveTo(markX + 20, markY - 10, markX + 40, markY + 5);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/**
 * Draw a toy on the floor
 */
function drawToy(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  const toyType = seed % 3;

  if (toyType === 0) {
    // Block
    ctx.fillStyle = COLORS.constructionPaper[seed % COLORS.constructionPaper.length];
    ctx.fillRect(x, y, 15, 15);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 15, 15);
  } else if (toyType === 1) {
    // Ball
    ctx.fillStyle = COLORS.formCrayon[(seed + 1) % COLORS.formCrayon.length];
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    // Crayon
    ctx.fillStyle = COLORS.formCrayon[(seed + 2) % COLORS.formCrayon.length];
    ctx.fillRect(x, y, 20, 6);
    ctx.fillStyle = '#f5d0c5';
    ctx.fillRect(x + 17, y + 1, 5, 4);
  }
}

/**
 * Draw doors between rooms (just openings)
 */
function drawDoors(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const door of state.building.doors) {
    // Door opening - draw floor color to create opening in wall
    ctx.fillStyle = COLORS.hallwayFloor;
    ctx.fillRect(door.x + 5, door.y, door.width - 10, door.height);
  }
}

/**
 * Draw room labels (room names)
 */
function drawRoomLabels(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.font = 'bold 12px Comic Sans MS, cursive';
  ctx.textAlign = 'center';

  for (const room of state.building.rooms) {
    if (room.type === 'classroom' || room.type === 'office') {
      const { x, y, width, height } = room.bounds;
      ctx.fillStyle = COLORS.wall;
      // Position label near bottom of room
      ctx.fillText(room.name, x + width / 2, y + height - 15);
    }
  }
}

/**
 * Draw all uncollected forms
 */
function drawForms(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  for (const form of state.forms) {
    if (!form.collected) {
      drawForm(ctx, form.x, form.y, form.variant, time);
    }
  }
}

/**
 * Draw a single form as a kid's drawing (stick figure only)
 */
function drawForm(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number, time: number): void {
  // Slight hover animation
  const hover = Math.sin(time / 300 + variant) * 2;

  ctx.save();
  ctx.translate(x, y + hover);

  // Paper
  ctx.fillStyle = COLORS.formPaper;
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;

  // Slightly rotated paper
  ctx.rotate((variant - 2) * 0.1);

  ctx.beginPath();
  ctx.rect(-10, -14, 20, 28);
  ctx.fill();
  ctx.stroke();

  // Stick figure drawing (use variant for color only)
  const crayonColor = COLORS.formCrayon[variant % COLORS.formCrayon.length];
  ctx.strokeStyle = crayonColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(0, -6, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Body, arms, legs
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 5);
  ctx.moveTo(-4, 0);
  ctx.lineTo(4, 0);
  ctx.moveTo(0, 5);
  ctx.lineTo(-3, 10);
  ctx.moveTo(0, 5);
  ctx.lineTo(3, 10);
  ctx.stroke();

  ctx.lineCap = 'butt';
  ctx.restore();
}

/**
 * Draw the enrollment desk with mess
 */
function drawDesk(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { desk, player } = state;

  // Glow effect when player carrying forms
  if (player.carrying > 0) {
    const glowIntensity = 0.3 + 0.2 * Math.sin(time / 200);

    ctx.shadowColor = 'rgba(46, 213, 115, 0.8)';
    ctx.shadowBlur = 20 * glowIntensity;

    ctx.fillStyle = `rgba(46, 213, 115, ${glowIntensity * 0.3})`;
    ctx.fillRect(desk.x - 10, desk.y - 10, desk.width + 20, desk.height + 20);

    ctx.shadowBlur = 0;
  }

  // Desk body (wood)
  ctx.fillStyle = COLORS.desk;
  ctx.fillRect(desk.x, desk.y, desk.width, desk.height);

  // Desk top surface
  ctx.fillStyle = COLORS.deskTop;
  ctx.fillRect(desk.x, desk.y, desk.width, 15);

  // Desk mess - coffee stain
  ctx.fillStyle = 'rgba(139, 90, 43, 0.3)';
  ctx.beginPath();
  ctx.ellipse(desk.x + 70, desk.y + 40, 12, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Desk mess - papers
  ctx.fillStyle = '#fff';
  ctx.save();
  ctx.translate(desk.x + 20, desk.y + 30);
  ctx.rotate(-0.1);
  ctx.fillRect(0, 0, 25, 35);
  ctx.restore();

  ctx.save();
  ctx.translate(desk.x + 30, desk.y + 25);
  ctx.rotate(0.15);
  ctx.fillRect(0, 0, 25, 35);
  ctx.restore();

  // Desk mess - coffee mug
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(desk.x + desk.width - 25, desk.y + 35, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Desk mess - pencil cup
  ctx.fillStyle = COLORS.uiRed;
  ctx.fillRect(desk.x + desk.width - 50, desk.y + 25, 15, 25);

  // Pencils sticking out
  ctx.strokeStyle = COLORS.uiYellow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(desk.x + desk.width - 47, desk.y + 25);
  ctx.lineTo(desk.x + desk.width - 50, desk.y + 10);
  ctx.stroke();

  ctx.strokeStyle = COLORS.uiBlue;
  ctx.beginPath();
  ctx.moveTo(desk.x + desk.width - 42, desk.y + 25);
  ctx.lineTo(desk.x + desk.width - 38, desk.y + 8);
  ctx.stroke();

  // Label
  ctx.fillStyle = COLORS.uiCrayon;
  ctx.font = 'bold 11px Comic Sans MS, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('DROP OFF', desk.x + desk.width / 2, desk.y + desk.height - 10);
}

/**
 * Draw the stressed adult player
 */
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { player } = state;
  const stress = player.stress;

  // Body bobbing animation (faster when stressed)
  const bobSpeed = 150 - stress * 50;
  const bobAmount = 1.5 + stress * 1.5;
  const bobOffset = Math.sin(time / bobSpeed) * bobAmount;

  ctx.save();
  ctx.translate(player.x, player.y + bobOffset);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(0, player.radius + 2, player.radius * 0.9, player.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (polo shirt)
  ctx.fillStyle = COLORS.playerShirt;
  ctx.beginPath();
  ctx.ellipse(0, 4, player.radius * 0.9, player.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a7abd';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Collar
  ctx.fillStyle = COLORS.playerShirt;
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(0, 0);
  ctx.lineTo(5, -4);
  ctx.stroke();

  // Head
  ctx.fillStyle = COLORS.playerSkin;
  ctx.beginPath();
  ctx.arc(0, -6, player.radius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = COLORS.playerHair;
  ctx.beginPath();
  ctx.arc(0, -10, player.radius * 0.5, Math.PI, 0, false);
  ctx.fill();

  // Messy hair strands when stressed
  if (stress > 0.3) {
    ctx.strokeStyle = COLORS.playerHair;
    ctx.lineWidth = 2;
    const strandOffset = Math.sin(time / 100) * stress * 3;
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(-5 + strandOffset, -18);
    ctx.moveTo(3, -14);
    ctx.lineTo(6 - strandOffset, -17);
    ctx.stroke();
  }

  // Eyes (wider when stressed)
  const eyeSize = 2 + stress * 1.5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-4, -6, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -6, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupils (darting around when stressed)
  ctx.fillStyle = '#333';
  const pupilOffset = stress > 0.5 ? Math.sin(time / 80) * 1.5 : 0;
  ctx.beginPath();
  ctx.arc(-4 + pupilOffset, -6, 1.5, 0, Math.PI * 2);
  ctx.arc(4 + pupilOffset, -6, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows (more furrowed when stressed)
  ctx.strokeStyle = COLORS.playerHair;
  ctx.lineWidth = 2;
  const browFurrow = stress * 2;
  ctx.beginPath();
  ctx.moveTo(-6, -10 + browFurrow);
  ctx.lineTo(-2, -9);
  ctx.moveTo(6, -10 + browFurrow);
  ctx.lineTo(2, -9);
  ctx.stroke();

  // Mouth (more grimace when stressed)
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (stress < 0.3) {
    // Neutral
    ctx.moveTo(-3, -1);
    ctx.lineTo(3, -1);
  } else if (stress < 0.7) {
    // Worried
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(0, -2, 3, 0);
  } else {
    // Grimace
    ctx.moveTo(-4, -1);
    ctx.lineTo(-2, 0);
    ctx.lineTo(0, -1);
    ctx.lineTo(2, 0);
    ctx.lineTo(4, -1);
  }
  ctx.stroke();

  // Sweat drops when stressed
  if (stress > 0.4) {
    ctx.fillStyle = COLORS.playerSweat;
    const sweatY = -8 + (time / 10 % 20);
    const sweatAlpha = 1 - (time / 10 % 20) / 20;
    ctx.globalAlpha = sweatAlpha;
    ctx.beginPath();
    ctx.ellipse(player.radius * 0.6, sweatY, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/**
 * Draw the stack of forms following the player
 */
function drawFormStack(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { player } = state;
  const stackX = player.x - 20;
  const stackY = player.y + 8;

  for (let i = 0; i < player.carrying; i++) {
    const offsetY = -i * 5;
    const wobble = Math.sin(time / 100 + i * 0.7) * 2;
    const rotation = (Math.sin(time / 200 + i) * 0.1);

    ctx.save();
    ctx.translate(stackX + wobble, stackY + offsetY);
    ctx.rotate(rotation);

    // Paper
    ctx.fillStyle = COLORS.formPaper;
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.fillRect(-8, -10, 16, 20);
    ctx.strokeRect(-8, -10, 16, 20);

    // Quick scribble
    ctx.strokeStyle = COLORS.formCrayon[i % COLORS.formCrayon.length];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 2);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Draw warning banner when suspicion is high
 */
function drawWarningBanner(ctx: CanvasRenderingContext2D, time: number): void {
  const flashAlpha = 0.6 + 0.3 * Math.sin(time / 100);

  // Construction paper style banner
  ctx.fillStyle = `rgba(255, 107, 107, ${flashAlpha * 0.8})`;
  ctx.fillRect(MAP_WIDTH / 2 - 150, 10, 300, 35);

  // Jagged edge effect
  ctx.strokeStyle = COLORS.uiRed;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 30; i++) {
    const x = MAP_WIDTH / 2 - 150 + i * 10;
    const y = i % 2 === 0 ? 10 : 13;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Comic Sans MS, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('!! SUSPICION HIGH !!', MAP_WIDTH / 2, 33);
}

/**
 * Draw the ICE agent
 */
function drawIceAgent(ctx: CanvasRenderingContext2D, ice: IceAgent, time: number): void {
  ctx.save();
  ctx.translate(ice.x, ice.y);

  // Flip based on direction
  if (ice.direction === 'left') {
    ctx.scale(-1, 1);
  }

  // Walking animation
  const walkCycle = Math.sin(time / 100) * 3;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 25, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (walking animation)
  ctx.fillStyle = COLORS.icePants;
  ctx.beginPath();
  ctx.ellipse(-5 + walkCycle, 18, 5, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5 - walkCycle, 18, 5, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Body (uniform)
  ctx.fillStyle = COLORS.iceShirt;
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tactical vest
  ctx.fillStyle = COLORS.iceVest;
  ctx.fillRect(-10, -5, 20, 18);

  // "ICE" text on vest
  ctx.fillStyle = COLORS.iceText;
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('ICE', 0, 7);

  // Arms
  ctx.fillStyle = COLORS.iceShirt;
  ctx.beginPath();
  ctx.ellipse(-14, 2, 5, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 2, 5, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = COLORS.iceSkin;
  ctx.beginPath();
  ctx.arc(0, -14, 10, 0, Math.PI * 2);
  ctx.fill();

  // Cap
  ctx.fillStyle = COLORS.iceVest;
  ctx.beginPath();
  ctx.arc(0, -18, 9, Math.PI, 0, false);
  ctx.fill();
  // Cap brim
  ctx.fillRect(-11, -16, 22, 4);

  // Sunglasses
  ctx.fillStyle = '#111';
  ctx.fillRect(-8, -16, 6, 4);
  ctx.fillRect(2, -16, 6, 4);
  ctx.fillRect(-2, -15, 4, 2);

  // Stern mouth
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-4, -8);
  ctx.lineTo(4, -8);
  ctx.stroke();

  ctx.restore();

  // Draw vision cone (faint, to show danger zone)
  drawVisionCone(ctx, ice, time);
}

/**
 * Draw the ICE agent's vision cone
 */
function drawVisionCone(ctx: CanvasRenderingContext2D, ice: IceAgent, time: number): void {
  ctx.save();

  const coneLength = ICE_AGENT.visionDistance;
  const coneWidth = 80; // How wide the cone spreads

  // Pulsing effect
  const pulse = 0.15 + Math.sin(time / 200) * 0.05;

  ctx.globalAlpha = pulse;

  if (ice.direction === 'right') {
    // Cone pointing right
    ctx.beginPath();
    ctx.moveTo(ice.x + 15, ice.y);
    ctx.lineTo(ice.x + 15 + coneLength, ice.y - coneWidth / 2);
    ctx.lineTo(ice.x + 15 + coneLength, ice.y + coneWidth / 2);
    ctx.closePath();
  } else {
    // Cone pointing left
    ctx.beginPath();
    ctx.moveTo(ice.x - 15, ice.y);
    ctx.lineTo(ice.x - 15 - coneLength, ice.y - coneWidth / 2);
    ctx.lineTo(ice.x - 15 - coneLength, ice.y + coneWidth / 2);
    ctx.closePath();
  }

  // Gradient fill
  const gradient = ctx.createLinearGradient(
    ice.direction === 'right' ? ice.x : ice.x - coneLength,
    ice.y,
    ice.direction === 'right' ? ice.x + coneLength : ice.x,
    ice.y
  );
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.restore();
}

/**
 * Draw ICE warning banner when agent is active
 */
function drawIceWarning(ctx: CanvasRenderingContext2D, time: number): void {
  const flashAlpha = 0.7 + 0.3 * Math.sin(time / 80);

  // Red flashing border at top
  ctx.fillStyle = `rgba(200, 0, 0, ${flashAlpha * 0.6})`;
  ctx.fillRect(0, 0, MAP_WIDTH, 5);

  // Warning text
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
  ctx.font = 'bold 14px Comic Sans MS, cursive';
  ctx.textAlign = 'left';
  ctx.fillText('⚠ ICE PATROL - HIDE IN ROOMS!', 10, 580);
  ctx.restore();
}

/**
 * Draw ICE incoming countdown warning
 */
function drawIceCountdown(ctx: CanvasRenderingContext2D, countdown: number, time: number): void {
  const flashAlpha = 0.8 + 0.2 * Math.sin(time / 50);

  // Yellow warning overlay at bottom
  ctx.fillStyle = `rgba(255, 200, 0, ${flashAlpha * 0.3})`;
  ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 60);

  // Border
  ctx.strokeStyle = `rgba(255, 150, 0, ${flashAlpha})`;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, MAP_HEIGHT - 58, MAP_WIDTH - 4, 56);

  // Warning text
  ctx.save();
  ctx.fillStyle = `rgba(200, 50, 0, ${flashAlpha})`;
  ctx.font = 'bold 28px Comic Sans MS, cursive';
  ctx.textAlign = 'center';
  ctx.fillText(`⚠ ICE INCOMING IN ${Math.ceil(countdown)}! ⚠`, MAP_WIDTH / 2, MAP_HEIGHT - 25);

  ctx.font = 'bold 14px Comic Sans MS, cursive';
  ctx.fillText('GET TO A ROOM NOW!', MAP_WIDTH / 2, MAP_HEIGHT - 8);
  ctx.restore();
}

/**
 * Draw "Know Your Rights" poster
 */
function drawKnowYourRightsPoster(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number): void {
  ctx.save();
  ctx.translate(x, y);

  // Slight rotation for bulletin board feel
  ctx.rotate((variant - 1) * 0.05);

  // Poster background (red)
  ctx.fillStyle = COLORS.posterRed;
  ctx.fillRect(-20, -25, 40, 50);

  // White border
  ctx.strokeStyle = COLORS.posterWhite;
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -23, 36, 46);

  // "NO" text
  ctx.fillStyle = COLORS.posterWhite;
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('NO', 0, -10);

  // "ICE" text
  ctx.font = 'bold 12px Arial';
  ctx.fillText('ICE', 0, 3);

  // "WITHOUT WARRANT" text
  ctx.font = 'bold 5px Arial';
  ctx.fillText('WITHOUT', 0, 12);
  ctx.fillText('WARRANT', 0, 18);

  // Hand symbol (simplified)
  ctx.strokeStyle = COLORS.posterWhite;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.lineTo(6, -18);
  ctx.stroke();

  ctx.restore();
}
