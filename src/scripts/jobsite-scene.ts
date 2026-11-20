/**
 * Animated hero background: a building rising floor by floor on an isometric site,
 * watched by sweeping cameras that tag what they see. Drawn on a canvas so the page
 * needs no video file; reduced-motion users get a single still frame.
 */
type Pt = [number, number];

const SIGNAL = "217, 255, 66";
const WHITE = "255, 255, 255";
const FLOORS = 6;
const CYCLE_S = 16;
const FOOT = { w: 4, d: 3 };
const LEVEL_H = 0.85;
const STILL_T = CYCLE_S * 0.62;
const TAG_EVERY_S = 1.4;
const TAG_LIFE_S = 2.6;
const LABELS = [
  "PERSON · PPE OK",
  "SLAB · VERIFIED",
  "GATE · TRUCK IN",
  "PERSON · NO HARD HAT",
  "DELIVERY · DRYWALL",
  "AFTER HOURS · CLEAR",
  "CREW · 14 ON SITE",
];
const CAMERAS: { x: number; y: number }[] = [
  { x: -2.6, y: -2.4 },
  { x: 6.6, y: -2.2 },
  { x: 6.4, y: 5.4 },
  { x: -2.4, y: 5.2 },
];

interface Tag { born: number; x: number; y: number; z: number; label: string; alert: boolean }

export function startJobsiteScene(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, s = 0, cx = 0, cy = 0;
  let tags: Tag[] = [];
  let nextTag = 0;
  let running = true;
  let raf = 0;
  const start = performance.now();

  const iso = (x: number, y: number, z: number): Pt => [cx + (x - y) * 0.866 * s, cy + (x + y) * 0.5 * s - z * s];
  const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${a.toFixed(3)})`;
  const line = (a: Pt, b: Pt, color: string, width = 1) => {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  };
  const quad = (z: number, fill: string | null, stroke: string) => {
    const pts = [iso(0, 0, z), iso(FOOT.w, 0, z), iso(FOOT.w, FOOT.d, z), iso(0, FOOT.d, z)];
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke();
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = w < 760;
    s = Math.min(w, h) / (narrow ? 14 : 17);
    cx = narrow ? w * 0.5 : w * 0.72;
    cy = narrow ? h * 0.72 : h * 0.6;
    if (still) draw(STILL_T);
  }

  function grid(t: number) {
    const shift = (t * 0.18) % 1;
    for (let i = -8; i <= 12; i++) {
      const k = i + shift;
      const fade = 0.075 * (1 - Math.abs(i - 2) / 11);
      if (fade <= 0) continue;
      line(iso(k, -6, 0), iso(k, 10, 0), rgba(WHITE, fade));
      line(iso(-6, k, 0), iso(12, k, 0), rgba(WHITE, fade));
    }
  }

  function building(t: number) {
    const progress = Math.min(((t % CYCLE_S) / CYCLE_S) * 1.25, 1);
    const built = progress * FLOORS;
    const done = Math.floor(built);
    const top = built * LEVEL_H;
    const cols: Pt[] = [[0, 0], [FOOT.w, 0], [FOOT.w, FOOT.d], [0, FOOT.d], [FOOT.w / 2, 0], [FOOT.w / 2, FOOT.d]];
    cols.forEach(([x, y]) => line(iso(x, y, 0), iso(x, y, top), rgba(WHITE, 0.38)));
    for (let f = 1; f <= done; f++) {
      const fresh = f === done && built - done < 0.35;
      quad(f * LEVEL_H, fresh ? rgba(SIGNAL, 0.07) : rgba(WHITE, 0.02), fresh ? rgba(SIGNAL, 0.85) : rgba(WHITE, 0.32));
    }
    if (done < FLOORS) {
      const z = (done + 1) * LEVEL_H;
      const frac = built - done;
      const a = iso(0, 0, z), b = iso(FOOT.w, 0, z), c = iso(FOOT.w, FOOT.d, z);
      ctx.setLineDash([4, 5]);
      line(a, [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac], rgba(SIGNAL, 0.7));
      line(b, [b[0] + (c[0] - b[0]) * frac, b[1] + (c[1] - b[1]) * frac], rgba(SIGNAL, 0.7));
      ctx.setLineDash([]);
    }
    const mastTop = (FLOORS + 1.6) * LEVEL_H;
    line(iso(FOOT.w + 0.8, -0.6, 0), iso(FOOT.w + 0.8, -0.6, mastTop), rgba(WHITE, 0.3));
    const jib = t * 0.12;
    const tip = iso(FOOT.w + 0.8 + Math.cos(jib) * 4.2, -0.6 + Math.sin(jib) * 4.2, mastTop);
    const tail = iso(FOOT.w + 0.8 - Math.cos(jib) * 1.4, -0.6 - Math.sin(jib) * 1.4, mastTop);
    line(tail, tip, rgba(WHITE, 0.3));
    line(tip, [tip[0], tip[1] + s * 1.6], rgba(WHITE, 0.14));
  }

  function cameras(t: number) {
    const target = iso(FOOT.w / 2, FOOT.d / 2, 1.5);
    CAMERAS.forEach((cam, i) => {
      const [x, y] = iso(cam.x, cam.y, 0.4);
      const base = Math.atan2(target[1] - y, target[0] - x);
      const sweep = base + Math.sin(t * 0.5 + i * 1.7) * 0.32;
      const reach = s * 4.2;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, reach);
      grad.addColorStop(0, rgba(WHITE, 0.06)); grad.addColorStop(1, rgba(WHITE, 0));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, reach, sweep - 0.2, sweep + 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba(SIGNAL, 0.9);
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    });
  }

  function spawnTag(t: number) {
    const onGround = Math.random() < 0.4;
    const label = LABELS[Math.floor(Math.random() * LABELS.length)];
    tags.push({
      born: t,
      x: onGround ? -1.5 + Math.random() * 7 : Math.random() * FOOT.w,
      y: onGround ? -1.5 + Math.random() * 6 : FOOT.d,
      z: onGround ? 0 : Math.random() * FLOORS * LEVEL_H * 0.8,
      label,
      alert: label.includes("NO HARD HAT"),
    });
  }

  function drawTags(t: number) {
    ctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace";
    tags = tags.filter((g) => t - g.born < TAG_LIFE_S);
    tags.forEach((g) => {
      const age = (t - g.born) / TAG_LIFE_S;
      const alpha = Math.min(age * 6, 1, (1 - age) * 4);
      const [x, y] = iso(g.x, g.y, g.z);
      const bw = s * 0.42, bh = s * 0.62;
      const color = g.alert ? `rgba(255, 120, 90, ${alpha})` : rgba(SIGNAL, alpha);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
      ctx.fillStyle = rgba("12, 12, 11", alpha * 0.75);
      const tw = ctx.measureText(g.label).width + 10;
      ctx.fillRect(x - bw / 2, y - bh - 17, tw, 15);
      ctx.fillStyle = color;
      ctx.fillText(g.label, x - bw / 2 + 5, y - bh - 6);
    });
  }

  function scan(t: number) {
    const y = ((t % 7) / 7) * (h + 200) - 100;
    const grad = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    grad.addColorStop(0, rgba(WHITE, 0)); grad.addColorStop(0.5, rgba(WHITE, 0.035)); grad.addColorStop(1, rgba(WHITE, 0));
    ctx.fillStyle = grad; ctx.fillRect(0, y - 80, w, 160);
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, w, h);
    grid(t);
    cameras(t);
    building(t);
    if (still && tags.length === 0) [0, 1, 2].forEach(() => spawnTag(t - 0.8));
    drawTags(t);
    if (!still) scan(t);
  }

  function frame(now: number) {
    const t = (now - start) / 1000;
    if (t >= nextTag) { spawnTag(t); nextTag = t + TAG_EVERY_S * (0.7 + Math.random() * 0.6); }
    draw(t);
    if (running) raf = requestAnimationFrame(frame);
  }

  const setRunning = (on: boolean) => {
    if (still || on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
  };

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (still) return;
  new IntersectionObserver(([e]) => setRunning(e.isIntersecting)).observe(canvas);
  document.addEventListener("visibilitychange", () => setRunning(!document.hidden));
  raf = requestAnimationFrame(frame);
}
