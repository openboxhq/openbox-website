import { LOOP_S, NARROW_W, TAU } from "./config";

export type Pt = readonly [number, number];
export type Vec3 = readonly [number, number, number];

const BASE_YAW = Math.PI / 4;
const YAW_DRIFT = 0.1;
const ZOOM_BREATHE = 0.018;
const PITCH = 0.5;
const Z_SCALE = 0.82;
const HAZE_FAR = -8;
const HAZE_NEAR = 5;
const HAZE_MIN = 0.36;

/** Axonometric camera for one frame; yaw drifts slowly so near and far layers part. */
export interface View {
  w: number; h: number; s: number; cx: number; cy: number;
  cos: number; sin: number; narrow: boolean;
}

export interface Painter { ctx: CanvasRenderingContext2D; view: View; t: number }

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ease = (v: number) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
/** 0 → 1 → 0 envelope over [start, start + life] with eased ends. */
export const envelope = (t: number, start: number, life: number, fadeIn = 0.7, fadeOut = 0.9) =>
  t < start || t > start + life ? 0 : Math.min(ease((t - start) / fadeIn), ease((start + life - t) / fadeOut));
export const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${clamp01(a).toFixed(3)})`;

export function makeView(w: number, h: number, t: number): View {
  const narrow = w < NARROW_W;
  const phase = (TAU * t) / LOOP_S;
  const yaw = BASE_YAW + YAW_DRIFT * Math.sin(phase);
  const fit = narrow ? Math.min(w / 14.5, h / 19) : Math.min((w * 0.5) / 14, h / 13.5);
  return {
    w, h, narrow,
    s: fit * (1 + ZOOM_BREATHE * Math.sin(phase * 2 + 1)),
    cx: narrow ? w * 0.5 : w * 0.725,
    cy: narrow ? h * 0.725 : h * 0.62,
    cos: Math.cos(yaw), sin: Math.sin(yaw),
  };
}

export function project(v: View, x: number, y: number, z = 0): Pt {
  const xr = x * v.cos - y * v.sin;
  const yr = x * v.sin + y * v.cos;
  return [v.cx + xr * v.s, v.cy + yr * v.s * PITCH - z * v.s * Z_SCALE];
}

/** Atmospheric fade: far side of the site reads fainter than the near side. */
export function haze(v: View, x: number, y: number): number {
  const depth = x * v.sin + y * v.cos;
  return lerp(HAZE_MIN, 1, clamp01((depth - HAZE_FAR) / (HAZE_NEAR - HAZE_FAR)));
}

export function trace(p: Painter, pts: readonly Vec3[], closed = false): void {
  p.ctx.beginPath();
  pts.forEach(([x, y, z], i) => {
    const [px, py] = project(p.view, x, y, z);
    if (i) p.ctx.lineTo(px, py); else p.ctx.moveTo(px, py);
  });
  if (closed) p.ctx.closePath();
}

export function stroke(p: Painter, pts: readonly Vec3[], color: string, width = 1, closed = false): void {
  trace(p, pts, closed);
  p.ctx.strokeStyle = color; p.ctx.lineWidth = width; p.ctx.stroke();
}

export function fill(p: Painter, pts: readonly Vec3[], color: string): void {
  trace(p, pts, true);
  p.ctx.fillStyle = color; p.ctx.fill();
}

export function dot(p: Painter, at: Vec3, r: number, color: string): void {
  const [x, y] = project(p.view, at[0], at[1], at[2]);
  p.ctx.fillStyle = color;
  p.ctx.beginPath(); p.ctx.arc(x, y, r, 0, TAU); p.ctx.fill();
}

/** Points of a world-space circle or arc lying flat at height z. */
export function ring(cx: number, cy: number, z: number, r: number, from = 0, to = TAU, steps = 28): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = lerp(from, to, i / steps);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return out;
}

export function rect(x0: number, y0: number, x1: number, y1: number, z = 0): Vec3[] {
  return [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
}

/** Wireframe box: base outline, top outline and the four verticals. */
export function box(p: Painter, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, color: string): void {
  stroke(p, rect(x0, y0, x1, y1, z0), color, 1, true);
  stroke(p, rect(x0, y0, x1, y1, z1), color, 1, true);
  rect(x0, y0, x1, y1).forEach(([x, y]) => stroke(p, [[x, y, z0], [x, y, z1]], color));
}
