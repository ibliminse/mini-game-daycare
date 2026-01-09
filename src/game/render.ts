// Canvas rendering functions

import { GameState } from './types';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  FORM_RADIUS,
  COLORS,
  WARNING_THRESHOLD,
} from './config';

/**
 * Main render function
 */
export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  // Clear canvas
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Draw desk with glow if player carrying forms
  drawDesk(ctx, state, time);

  // Draw forms
  drawForms(ctx, state);

  // Draw player
  drawPlayer(ctx, state, time);

  // Draw form stack following player
  if (state.player.carrying > 0) {
    drawFormStack(ctx, state, time);
  }

  // Draw warning banner if suspicion high
  if (state.suspicion >= WARNING_THRESHOLD && state.phase === 'playing') {
    drawWarningBanner(ctx, time);
  }
}

/**
 * Draw the enrollment desk
 */
function drawDesk(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { desk, player } = state;

  // Glow effect when player carrying forms
  if (player.carrying > 0) {
    const glowIntensity = 0.3 + 0.2 * Math.sin(time / 200);
    const glowSize = 20;

    ctx.shadowColor = 'rgba(74, 222, 128, 0.8)';
    ctx.shadowBlur = glowSize * glowIntensity * 2;

    ctx.fillStyle = `rgba(74, 222, 128, ${glowIntensity * 0.5})`;
    ctx.fillRect(desk.x - 10, desk.y - 10, desk.width + 20, desk.height + 20);

    ctx.shadowBlur = 0;
  }

  // Desk body
  ctx.fillStyle = COLORS.desk;
  ctx.fillRect(desk.x, desk.y, desk.width, desk.height);

  // Desk top surface
  ctx.fillStyle = COLORS.deskTop;
  ctx.fillRect(desk.x, desk.y, desk.width, 20);

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENROLLMENT', desk.x + desk.width / 2, desk.y + desk.height / 2 + 5);
  ctx.font = '12px sans-serif';
  ctx.fillText('DESK', desk.x + desk.width / 2, desk.y + desk.height / 2 + 22);
}

/**
 * Draw all uncollected forms
 */
function drawForms(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const form of state.forms) {
    if (!form.collected) {
      drawForm(ctx, form.x, form.y);
    }
  }
}

/**
 * Draw a single form (paper/document)
 */
function drawForm(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const w = FORM_RADIUS * 1.5;
  const h = FORM_RADIUS * 2;

  // Paper background
  ctx.fillStyle = '#fff8e1';
  ctx.strokeStyle = COLORS.formOutline;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.rect(x - w / 2, y - h / 2, w, h);
  ctx.fill();
  ctx.stroke();

  // Lines on paper
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const ly = y - h / 2 + 5 + i * 5;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 3, ly);
    ctx.lineTo(x + w / 2 - 3, ly);
    ctx.stroke();
  }
}

/**
 * Draw the player
 */
function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { player } = state;

  // Body bobbing animation
  const bobOffset = Math.sin(time / 150) * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + player.radius, player.radius * 0.8, player.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = COLORS.playerOutline;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(player.x, player.y + bobOffset, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face
  ctx.fillStyle = '#f5d0c5';
  ctx.beginPath();
  ctx.arc(player.x, player.y - 3 + bobOffset, player.radius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(player.x - 3, player.y - 4 + bobOffset, 2, 0, Math.PI * 2);
  ctx.arc(player.x + 3, player.y - 4 + bobOffset, 2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw the stack of forms following the player
 */
function drawFormStack(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { player } = state;
  const stackX = player.x - 25;
  const stackY = player.y + 5;

  for (let i = 0; i < player.carrying; i++) {
    const offsetY = -i * 6;
    const wobble = Math.sin(time / 100 + i * 0.5) * 2;

    ctx.save();
    ctx.translate(stackX + wobble, stackY + offsetY);

    // Form paper
    const w = 12;
    const h = 16;
    ctx.fillStyle = '#fff8e1';
    ctx.strokeStyle = COLORS.formOutline;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Draw warning banner when suspicion is high
 */
function drawWarningBanner(ctx: CanvasRenderingContext2D, time: number): void {
  const flashAlpha = 0.5 + 0.3 * Math.sin(time / 150);

  ctx.fillStyle = `rgba(220, 38, 38, ${flashAlpha * 0.3})`;
  ctx.fillRect(0, 0, MAP_WIDTH, 40);

  ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIGH SUSPICION', MAP_WIDTH / 2, 27);
}
