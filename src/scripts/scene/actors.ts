import { DRONE_ORBIT_S, HEADCAM_CAPTURE_S, LEVEL_H, LEVELS, LOOP_S, ROAD_Y, SIGNAL, TAU, WHITE } from "./config";
import { type Painter, type Vec3, box, dot, ease, fill, haze, lerp, project, rect, rgba, ring, stroke, trace } from "./view";

const PERSON_H = 0.34;
const HEADCAM_REACH = 1.5;
const HEADCAM_HALF_FOV = 0.42;
const TRAIL_S = 16;
const TRAIL_STEP_S = 0.3;
const CAPTURE_KEEP_S = 22;
const PING_S = 1.8;
const PATH_SAMPLES = 240;
/** Puts the walk on the camera side of the building for the first paint and the still. */
const ROUTE_OFFSET_S = 30;
/** The headcam route: one lap of the building per loop. */
const ROUTE: readonly (readonly [number, number])[] = [
  [3.25, 2.45], [0, 2.6], [-3.3, 2.4], [-3.7, -0.2], [-3.0, -2.5], [0.3, -2.7], [3.2, -2.4], [3.5, 0.1],
];
const CREW: readonly (readonly [number, number])[] = [[1.9, 3.45], [2.3, 3.6]];

const DRONE_Z = LEVELS * LEVEL_H + 2.5;
const DRONE_RX = 3.1;
const DRONE_RY = 2.5;
const DRONE_ARM = 0.26;
const FOOTPRINT_HALF = 0.8;
/** The gimbal looks inward, so the footprint stays on the top deck. */
const FOOTPRINT_PULL = 0.78;

const TRUCK = { arrive: 19, parked: 26.5, leave: 42, gone: 49, farX: 12.5, parkX: 4.55, len: 1.25, wid: 0.52, h: 0.6 } as const;

function catmull(a: number, b: number, c: number, d: number, k: number): number {
  return 0.5 * (2 * b + (c - a) * k + (2 * a - 5 * b + 4 * c - d) * k * k + (3 * b - a - 3 * c + d) * k * k * k);
}

/** Smooth closed route resampled by arc length so the walk keeps an even pace. */
const routeTable: (readonly [number, number])[] = (() => {
  const n = ROUTE.length, dense: [number, number][] = [];
  const at = (i: number) => ROUTE[((i % n) + n) % n]!;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 24; j++) {
      const k = j / 24, [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      dense.push([catmull(a[0], b[0], c[0], d[0], k), catmull(a[1], b[1], c[1], d[1], k)]);
    }
  }
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const p = dense[i % dense.length]!, q = dense[i - 1]!;
    cum.push(cum[i - 1]! + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }
  const total = cum[cum.length - 1]!, out: [number, number][] = [];
  for (let s = 0, i = 0; s < PATH_SAMPLES; s++) {
    const target = (s / PATH_SAMPLES) * total;
    while (cum[i + 1]! < target) i++;
    const k = (target - cum[i]!) / (cum[i + 1]! - cum[i]! || 1);
    const p = dense[i % dense.length]!, q = dense[(i + 1) % dense.length]!;
    out.push([lerp(p[0], q[0], k), lerp(p[1], q[1], k)]);
  }
  return out;
})();

/** Ground position of the headcam worker at loop time t (any t, wraps with the loop). */
export function headcamAt(t: number): readonly [number, number] {
  const u = (((((t + ROUTE_OFFSET_S) / LOOP_S) % 1) + 1) % 1) * PATH_SAMPLES;
  const i = Math.floor(u), k = u - i;
  const p = routeTable[i % PATH_SAMPLES]!, q = routeTable[(i + 1) % PATH_SAMPLES]!;
  return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
}

/** True while the worker is on the camera side of the building, so he draws over it. */
export const headcamInFront = (t: number) => { const [x, y] = headcamAt(t); return x + y > 0; };

export const headcamHead = (t: number): Vec3 => { const [x, y] = headcamAt(t); return [x, y, PERSON_H]; };
export const crewHead = (i: number): Vec3 => { const c = CREW[i % CREW.length]!; return [c[0], c[1], PERSON_H]; };

export function droneAt(t: number): Vec3 {
  const a = (TAU * t) / DRONE_ORBIT_S + 2.2;
  return [Math.cos(a) * DRONE_RX, Math.sin(a) * DRONE_RY, DRONE_Z + 0.12 * Math.sin((TAU * t * 5) / LOOP_S)];
}

/** Truck centre x and visibility; it pulls in through the gate, waits, then leaves. */
export function truckAt(t: number): { x: number; alpha: number } {
  const inbound = ease((t - TRUCK.arrive) / (TRUCK.parked - TRUCK.arrive));
  const outbound = ease((t - TRUCK.leave) / (TRUCK.gone - TRUCK.leave));
  const k = inbound * (1 - outbound);
  return { x: lerp(TRUCK.farX, TRUCK.parkX, k), alpha: Math.min(1, k * 3) };
}
export const truckTop = (t: number): Vec3 => [truckAt(t).x, ROAD_Y, TRUCK.h];

function drawPerson(p: Painter, x: number, y: number, headColor: string): void {
  const depth = haze(p.view, x, y);
  fill(p, ring(x, y, 0, 0.1, 0, TAU, 10), rgba(WHITE, 0.1 * depth));
  stroke(p, [[x, y, 0], [x, y, PERSON_H * 0.82]], rgba(WHITE, 0.8 * depth), 1.4);
  dot(p, [x, y, PERSON_H], 1.9, headColor);
}

export function drawCrew(p: Painter): void {
  CREW.forEach(([x, y]) => drawPerson(p, x, y, rgba(WHITE, 0.85)));
}

export function drawHeadcam(p: Painter): void {
  const { ctx, view, t } = p;
  for (let age = TRAIL_S; age > 0; age -= TRAIL_STEP_S) {
    const a = headcamAt(t - age), b = headcamAt(t - age + TRAIL_STEP_S);
    const k = 1 - age / TRAIL_S;
    stroke(p, [[a[0], a[1], 0], [b[0], b[1], 0]], rgba(SIGNAL, 0.5 * k * k), 1.1);
  }
  // Captures drop along the route on a fixed cadence and linger as faint marks.
  const latest = Math.floor(t / HEADCAM_CAPTURE_S) * HEADCAM_CAPTURE_S;
  for (let at = latest; t - at < CAPTURE_KEEP_S; at -= HEADCAM_CAPTURE_S) {
    const age = t - at, [x, y] = headcamAt(at);
    dot(p, [x, y, 0], 1.3, rgba(SIGNAL, 0.75 * (1 - age / CAPTURE_KEEP_S)));
    if (age < PING_S) {
      const k = age / PING_S;
      stroke(p, ring(x, y, 0, lerp(0.12, 0.62, ease(k))), rgba(SIGNAL, 0.55 * (1 - k)), 1, true);
    }
  }

  const [x, y] = headcamAt(t), ahead = headcamAt(t + 0.4);
  const heading = Math.atan2(ahead[1] - y, ahead[0] - x);
  const head: Vec3 = [x, y, PERSON_H];
  const arc = ring(x, y, 0, HEADCAM_REACH, heading - HEADCAM_HALF_FOV, heading + HEADCAM_HALF_FOV, 8);
  const [hx, hy] = project(view, x, y, PERSON_H);
  const [fx, fy] = project(view, x + Math.cos(heading) * HEADCAM_REACH, y + Math.sin(heading) * HEADCAM_REACH);
  const beam = ctx.createLinearGradient(hx, hy, fx, fy);
  beam.addColorStop(0, rgba(SIGNAL, 0.2)); beam.addColorStop(1, rgba(SIGNAL, 0));
  trace(p, [head, ...arc], true);
  ctx.fillStyle = beam; ctx.fill();
  const first = arc[0], last = arc[arc.length - 1];
  if (first && last) {
    const edge = ctx.createLinearGradient(hx, hy, fx, fy);
    edge.addColorStop(0, rgba(SIGNAL, 0.5)); edge.addColorStop(1, rgba(SIGNAL, 0.03));
    trace(p, [first, head, last]);
    ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
  }
  drawPerson(p, x, y, rgba(SIGNAL, 1));
  dot(p, head, 5, rgba(SIGNAL, 0.16));
}

export function drawTruck(p: Painter): void {
  const { x, alpha } = truckAt(p.t);
  if (alpha <= 0.01) return;
  const c = rgba(WHITE, 0.42 * alpha), half = TRUCK.len / 2, w = TRUCK.wid / 2;
  fill(p, rect(x - half, ROAD_Y - w, x + half, ROAD_Y + w), rgba(WHITE, 0.05 * alpha));
  box(p, x - half + 0.34, ROAD_Y - w, x + half, ROAD_Y + w, 0.1, TRUCK.h, c);
  box(p, x - half, ROAD_Y - w, x - half + 0.3, ROAD_Y + w, 0.1, TRUCK.h * 0.72, c);
}

export function drawDrone(p: Painter, deckZ: number): void {
  const { ctx, t } = p;
  const orbit: Vec3[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (TAU * i) / 64;
    orbit.push([Math.cos(a) * DRONE_RX, Math.sin(a) * DRONE_RY, DRONE_Z]);
  }
  ctx.setLineDash([1, 7]);
  stroke(p, orbit, rgba(WHITE, 0.16));
  ctx.setLineDash([]);
  // Recently flown arc of the orbit.
  for (let age = 6; age > 0; age -= 0.25) {
    stroke(p, [droneAt(t - age), droneAt(t - age + 0.25)], rgba(WHITE, 0.3 * (1 - age / 6) ** 2));
  }

  const d = droneAt(t);
  const fx = d[0] * (1 - FOOTPRINT_PULL), fy = d[1] * (1 - FOOTPRINT_PULL);
  const yaw = Math.atan2(-d[1], -d[0]);
  const corner = (i: number): Vec3 => {
    const a = yaw + Math.PI / 4 + (i * Math.PI) / 2, r = FOOTPRINT_HALF * Math.SQRT2;
    return [fx + Math.cos(a) * r, fy + Math.sin(a) * r, deckZ];
  };
  const foot = [0, 1, 2, 3].map(corner);
  const pulse = 0.5 + 0.5 * Math.sin((TAU * t * 12) / LOOP_S);
  fill(p, foot, rgba(SIGNAL, 0.035 + 0.025 * pulse));
  foot.forEach((c, i) => {
    // Corner brackets instead of a full outline keep the footprint light.
    const n = foot[(i + 1) % 4]!, m = foot[(i + 3) % 4]!;
    const toward = (o: Vec3): Vec3 => [lerp(c[0], o[0], 0.22), lerp(c[1], o[1], 0.22), deckZ];
    stroke(p, [toward(m), c, toward(n)], rgba(SIGNAL, 0.7));
    stroke(p, [d, c], rgba(WHITE, 0.07));
  });
  ctx.setLineDash([1, 5]);
  stroke(p, [d, [d[0], d[1], 0]], rgba(WHITE, 0.13));
  ctx.setLineDash([]);

  const arms = [0, 1, 2, 3].map((i): Vec3 => {
    const a = yaw + Math.PI / 4 + (i * Math.PI) / 2;
    return [d[0] + Math.cos(a) * DRONE_ARM, d[1] + Math.sin(a) * DRONE_ARM, d[2]];
  });
  stroke(p, [arms[0]!, arms[2]!], rgba(WHITE, 0.85), 1.1);
  stroke(p, [arms[1]!, arms[3]!], rgba(WHITE, 0.85), 1.1);
  arms.forEach((a) => stroke(p, ring(a[0], a[1], a[2], 0.1, 0, TAU, 10), rgba(WHITE, 0.45), 1, true));
  dot(p, d, 5.5, rgba(SIGNAL, 0.14));
  dot(p, d, 1.8, rgba(SIGNAL, 1));
}

/** Share of the survey flown; the mission spans the whole loop. */
export const surveyPercent = (t: number) => Math.floor((t / LOOP_S) * 100);
