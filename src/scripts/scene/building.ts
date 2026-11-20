import {
  BAYS_X, BAYS_Y, BUILD_END_S, DISSOLVE_AT_S, FOOT, GROUND, LEVEL_H, LEVEL_S, LEVELS, MONO, SIGNAL, WHITE,
} from "./config";
import { type Painter, type Vec3, clamp01, ease, fill, haze, lerp, project, rect, rgba, stroke } from "./view";

/** Share of a level's build time spent on each phase. */
const COLUMNS_END = 0.28;
const DECK_START = 0.25;
const DECK_END = 0.5;
const VERIFY_START = 0.5;
const VERIFY_SPAN = 0.45;
const BAY_GLOW_S = 1.7;
const EDGE_FLASH_S = 2.4;
const DISSOLVE_STEP_S = 0.55;
const DISSOLVE_FADE_S = 1.4;

const levelProgress = (t: number, k: number) => clamp01((t - (k - 1) * LEVEL_S) / LEVEL_S);
/** Levels fade top-down at the end of the loop so the build can start again. */
const levelPresence = (t: number, k: number) =>
  1 - ease((t - DISSOLVE_AT_S - (LEVELS - k) * DISSOLVE_STEP_S) / DISSOLVE_FADE_S);

/** Height of the highest steel standing at loop time t. */
export function deckHeight(t: number): number {
  let z = 0;
  for (let k = 1; k <= LEVELS; k++) z += LEVEL_H * ease(levelProgress(t, k) / COLUMNS_END) * levelPresence(t, k);
  return z;
}

/** Number of levels whose deck is fully verified. */
export const levelsVerified = (t: number) => Math.min(LEVELS, Math.floor(Math.min(t, BUILD_END_S) / LEVEL_S));

/** Right-hand corner of a deck: where its tag and level mark attach. */
export const deckCorner = (k: number): Vec3 => [FOOT.x1, FOOT.y0, k * LEVEL_H];

function partialOutline(z: number, fraction: number): Vec3[] {
  const loop = [...rect(FOOT.x0, FOOT.y0, FOOT.x1, FOOT.y1, z), [FOOT.x0, FOOT.y0, z] as Vec3];
  const lengths = loop.slice(1).map((b, i) => Math.hypot(b[0] - loop[i]![0], b[1] - loop[i]![1]));
  let left = lengths.reduce((a, b) => a + b, 0) * fraction;
  const out: Vec3[] = [loop[0]!];
  for (let i = 0; i < lengths.length && left > 0; i++) {
    const a = loop[i]!, b = loop[i + 1]!, k = Math.min(1, left / lengths[i]!);
    out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), z]);
    left -= lengths[i]!;
  }
  return out;
}

function drawColumns(p: Painter, z0: number, rise: number, presence: number): void {
  for (let i = 0; i <= BAYS_X; i++) {
    for (let j = 0; j <= BAYS_Y; j++) {
      const x = lerp(FOOT.x0, FOOT.x1, i / BAYS_X), y = lerp(FOOT.y0, FOOT.y1, j / BAYS_Y);
      const outer = i === 0 || i === BAYS_X || j === 0 || j === BAYS_Y;
      const alpha = (outer ? 0.4 : 0.16) * haze(p.view, x * 2.2, y * 2.2) * presence;
      stroke(p, [[x, y, z0], [x, y, z0 + LEVEL_H * rise]], rgba(WHITE, alpha));
    }
  }
}

function drawBays(p: Painter, z: number, sinceLevelStart: number, presence: number): void {
  const bw = (FOOT.x1 - FOOT.x0) / BAYS_X, bd = (FOOT.y1 - FOOT.y0) / BAYS_Y;
  const bays = BAYS_X * BAYS_Y;
  for (let b = 0; b < bays; b++) {
    const verifiedFor = sinceLevelStart - (VERIFY_START + (VERIFY_SPAN * b) / bays) * LEVEL_S;
    if (verifiedFor <= 0) continue;
    // Serpentine order, so verification sweeps across the deck like a walk.
    const row = Math.floor(b / BAYS_X), col = row % 2 ? BAYS_X - 1 - (b % BAYS_X) : b % BAYS_X;
    const x = FOOT.x0 + col * bw, y = FOOT.y0 + row * bd;
    const bay = rect(x, y, x + bw, y + bd, z);
    const glow = Math.exp(-verifiedFor / BAY_GLOW_S);
    fill(p, bay, rgba(SIGNAL, (0.022 + 0.2 * glow) * presence));
    stroke(p, bay, rgba(WHITE, 0.07 * presence), 1, true);
    if (glow > 0.05) stroke(p, bay, rgba(SIGNAL, 0.5 * glow * presence), 1, true);
  }
}

function drawLevelMark(p: Painter, k: number, live: boolean, alpha: number): void {
  const [x, y] = project(p.view, ...deckCorner(k));
  p.ctx.font = `400 9px ${MONO}`;
  p.ctx.fillStyle = live ? rgba(SIGNAL, 0.85 * alpha) : rgba(WHITE, 0.3 * alpha);
  p.ctx.fillText(`L${k}`, x + 9, y + 3);
  p.ctx.strokeStyle = rgba(WHITE, 0.18 * alpha); p.ctx.lineWidth = 1;
  p.ctx.beginPath(); p.ctx.moveTo(x + 2, y); p.ctx.lineTo(x + 6, y); p.ctx.stroke();
}

function drawLevel(p: Painter, k: number): void {
  const progress = levelProgress(p.t, k), presence = levelPresence(p.t, k);
  if (progress <= 0 || presence <= 0) return;
  const z = k * LEVEL_H;
  drawColumns(p, z - LEVEL_H, ease(progress / COLUMNS_END), presence);

  const laid = ease((progress - DECK_START) / (DECK_END - DECK_START));
  if (laid <= 0) return;
  const deck = rect(FOOT.x0, FOOT.y0, FOOT.x1, FOOT.y1, z);
  // A near-opaque deck hides the steel below it, which is what makes the frame read as solid.
  fill(p, deck, rgba(GROUND, 0.62 * laid * presence));
  drawBays(p, z, p.t - (k - 1) * LEVEL_S, presence);

  if (progress < 1) {
    p.ctx.setLineDash([3, 4]);
    stroke(p, partialOutline(z, laid), rgba(WHITE, 0.55 * presence));
    p.ctx.setLineDash([]);
  } else {
    const flash = Math.exp(-(p.t - k * LEVEL_S) / EDGE_FLASH_S);
    stroke(p, deck, rgba(WHITE, 0.4 * presence), 1, true);
    if (flash > 0.03) stroke(p, deck, rgba(SIGNAL, 0.95 * flash * presence), 1.25, true);
  }
  drawLevelMark(p, k, progress >= VERIFY_START && progress < 1, laid * presence);
}

export function drawBuilding(p: Painter): void {
  const top = LEVELS * LEVEL_H;
  const pad = rect(FOOT.x0, FOOT.y0, FOOT.x1, FOOT.y1);
  fill(p, pad, rgba(WHITE, 0.028));
  stroke(p, pad, rgba(WHITE, 0.3), 1, true);

  // The design envelope the build is measured against.
  p.ctx.setLineDash([2, 5]);
  stroke(p, rect(FOOT.x0, FOOT.y0, FOOT.x1, FOOT.y1, top), rgba(WHITE, 0.11), 1, true);
  pad.forEach(([x, y]) => stroke(p, [[x, y, 0], [x, y, top]], rgba(WHITE, 0.07)));
  p.ctx.setLineDash([]);

  for (let k = 1; k <= LEVELS; k++) drawLevel(p, k);
}
