import { FENCE, FOOT, GATE, LEVEL_H, LEVELS, LOOP_S, ROAD_Y, SIGNAL, TAU, WHITE } from "./config";
import { type Painter, type Vec3, box, dot, fill, haze, lerp, project, rect, rgba, ring, stroke, trace } from "./view";

const GRID_EXTENT = 14;
const GRID_MAJOR = 4;
const GRID_FADE_RADIUS = 11.5;
const FENCE_H = 0.24;
const POST_GAP = 1.1;
const CAM_POLE_H = 1.5;
const CAM_REACH = 4.6;
const CAM_HALF_FOV = 0.27;
const CAM_PAN = 0.3;
const CRANE = { x: 2.95, y: -2.25, jib: 4.3, tail: 1.3, swing: 0.55 } as const;
const CRANE_H = LEVELS * LEVEL_H + 1.7;

interface SiteCam { x: number; y: number; aimX: number; aimY: number; beats: number; phase: number }

/** Fixed cameras on perimeter poles; the last one watches the gate. */
export const SITE_CAMS: readonly SiteCam[] = [
  { x: FENCE.x0, y: FENCE.y0, aimX: -0.6, aimY: -0.4, beats: 2, phase: 0.4 },
  { x: FENCE.x1, y: FENCE.y0, aimX: 0.8, aimY: -0.6, beats: 3, phase: 2.1 },
  { x: FENCE.x0, y: FENCE.y1, aimX: -0.8, aimY: 0.9, beats: 2, phase: 3.6 },
  { x: FENCE.x1, y: FENCE.y1, aimX: 4.2, aimY: ROAD_Y, beats: 1, phase: 5.0 },
];
export const GATE_CAM_TOP: Vec3 = [FENCE.x1, FENCE.y1, CAM_POLE_H];

export function drawGround(p: Painter): void {
  const { ctx, view } = p;
  const lines = (step: number, alpha: number) => {
    ctx.beginPath();
    for (let k = -GRID_EXTENT; k <= GRID_EXTENT; k += step) {
      const a = project(view, k, -GRID_EXTENT), b = project(view, k, GRID_EXTENT);
      const c = project(view, -GRID_EXTENT, k), d = project(view, GRID_EXTENT, k);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    }
    ctx.strokeStyle = rgba(WHITE, alpha); ctx.lineWidth = 1; ctx.stroke();
  };
  lines(1, 0.05);
  lines(GRID_MAJOR, 0.075);

  // Mask the grid into a soft pool of light under the site; nothing else is drawn yet.
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.translate(view.cx, view.cy + view.s * 0.4);
  ctx.scale(1, 0.56);
  const r = view.s * GRID_FADE_RADIUS;
  const pool = ctx.createRadialGradient(0, 0, r * 0.12, 0, 0, r);
  pool.addColorStop(0, "rgba(0,0,0,1)"); pool.addColorStop(0.55, "rgba(0,0,0,0.5)"); pool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

export function drawSurroundings(p: Painter): void {
  const far = (x: number, y: number, a: number) => rgba(WHITE, a * haze(p.view, x, y));
  box(p, -9.6, -8.4, -7, -6.2, 0, 2.1, far(-8, -7, 0.1));
  box(p, 1.6, -9.8, 5.2, -7.6, 0, 1.3, far(3, -8.5, 0.1));
  box(p, -11.5, -1.5, -9.4, 2.2, 0, 1.6, far(-10, 0, 0.08));

  const road = rgba(WHITE, 0.09);
  stroke(p, [[FENCE.x1, GATE.y0, 0], [GRID_EXTENT, GATE.y0, 0]], road);
  stroke(p, [[FENCE.x1, GATE.y1, 0], [GRID_EXTENT, GATE.y1, 0]], road);
  p.ctx.setLineDash([3, 9]);
  stroke(p, [[2.8, ROAD_Y, 0], [GRID_EXTENT, ROAD_Y, 0]], rgba(WHITE, 0.08));
  p.ctx.setLineDash([]);

  // Laydown yard with a few stacked pallets.
  const yard = rgba(WHITE, 0.1 * haze(p.view, -4.4, -2.5));
  stroke(p, rect(-5, -3.5, -3.8, -1.5), yard, 1, true);
  box(p, -4.8, -3.3, -4.1, -2.8, 0, 0.22, yard);
  box(p, -4.8, -2.5, -4.3, -1.8, 0, 0.36, yard);
}

export function drawFence(p: Painter): void {
  const { x0, x1, y0, y1 } = FENCE;
  const runs: Vec3[][] = [
    [[x1, GATE.y0, 0], [x1, y0, 0], [x0, y0, 0], [x0, y1, 0], [x1, y1, 0], [x1, GATE.y1, 0]],
  ];
  runs.forEach((run) => {
    stroke(p, run, rgba(WHITE, 0.17));
    stroke(p, run.map(([x, y]): Vec3 => [x, y, FENCE_H]), rgba(WHITE, 0.07));
  });
  const post = (x: number, y: number) =>
    stroke(p, [[x, y, 0], [x, y, FENCE_H]], rgba(WHITE, 0.15 * haze(p.view, x, y)));
  for (let x = x0; x <= x1 + 0.01; x += POST_GAP) { post(x, y0); post(x, y1); }
  for (let y = y0 + POST_GAP; y < y1; y += POST_GAP) {
    post(x0, y);
    if (y < GATE.y0 || y > GATE.y1) post(x1, y);
  }
  // Gate posts stand taller so the opening reads.
  [GATE.y0, GATE.y1].forEach((y) => stroke(p, [[x1, y, 0], [x1, y, FENCE_H * 2.4]], rgba(WHITE, 0.4)));
}

export function drawSiteCams(p: Painter): void {
  const { ctx, view, t } = p;
  SITE_CAMS.forEach((cam) => {
    const aim = Math.atan2(cam.aimY - cam.y, cam.aimX - cam.x)
      + CAM_PAN * Math.sin((TAU * t * cam.beats) / LOOP_S + cam.phase);
    const depth = haze(view, cam.x, cam.y);
    const arc = ring(cam.x, cam.y, 0, CAM_REACH, aim - CAM_HALF_FOV, aim + CAM_HALF_FOV, 10);
    const head: Vec3 = [cam.x, cam.y, CAM_POLE_H];
    const [hx, hy] = project(view, cam.x, cam.y, CAM_POLE_H);
    const [fx, fy] = project(view, cam.x + Math.cos(aim) * CAM_REACH, cam.y + Math.sin(aim) * CAM_REACH);

    const beam = ctx.createLinearGradient(hx, hy, fx, fy);
    beam.addColorStop(0, rgba(WHITE, 0.1 * depth)); beam.addColorStop(1, rgba(WHITE, 0));
    trace(p, [head, ...arc], true);
    ctx.fillStyle = beam; ctx.fill();
    const edge = ctx.createLinearGradient(hx, hy, fx, fy);
    edge.addColorStop(0, rgba(WHITE, 0.26 * depth)); edge.addColorStop(1, rgba(WHITE, 0.02));
    const first = arc[0], last = arc[arc.length - 1];
    if (first && last) { trace(p, [first, head, last]); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
    stroke(p, arc, rgba(WHITE, 0.07 * depth));

    stroke(p, [[cam.x, cam.y, 0], head], rgba(WHITE, 0.42 * depth));
    dot(p, head, 4.5, rgba(SIGNAL, 0.14 * depth));
    dot(p, head, 1.9, rgba(SIGNAL, 0.95 * depth));
  });
}

/** Tower crane: lattice mast, slewing jib and a hook line that follows the top deck. */
export function drawCrane(p: Painter, deckZ: number): void {
  const { x, y, jib, tail, swing } = CRANE;
  const a = rgba(WHITE, 0.24 * haze(p.view, x, y));
  const faint = rgba(WHITE, 0.12 * haze(p.view, x, y));
  const half = 0.11;
  stroke(p, [[x - half, y, 0], [x - half, y, CRANE_H]], a);
  stroke(p, [[x + half, y, 0], [x + half, y, CRANE_H]], a);
  for (let z = 0; z < CRANE_H - 0.3; z += 0.36) {
    stroke(p, [[x - half, y, z], [x + half, y, z + 0.36]], faint);
  }
  const toSite = Math.atan2((FOOT.y0 + FOOT.y1) / 2 - y, (FOOT.x0 + FOOT.x1) / 2 - x);
  const slew = toSite + swing * Math.sin((TAU * p.t) / LOOP_S + 1.2);
  const along = (d: number, z: number): Vec3 => [x + Math.cos(slew) * d, y + Math.sin(slew) * d, z];
  const apex: Vec3 = [x, y, CRANE_H + 0.55];
  stroke(p, [along(-tail, CRANE_H), along(jib, CRANE_H)], a);
  stroke(p, [along(-tail, CRANE_H), apex, along(jib * 0.72, CRANE_H)], faint);
  stroke(p, [[x, y, CRANE_H], apex], a);
  const trolley = lerp(0.42, 0.7, 0.5 + 0.5 * Math.sin((TAU * p.t * 2) / LOOP_S));
  const hookZ = deckZ + 0.5;
  stroke(p, [along(jib * trolley, CRANE_H), along(jib * trolley, hookZ)], faint);
  dot(p, along(jib * trolley, hookZ), 1.4, rgba(WHITE, 0.5));
  fill(p, rect(x - 0.3, y - 0.3, x + 0.3, y + 0.3), rgba(WHITE, 0.05));
}
