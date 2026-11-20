/**
 * Film layers: real site footage with its machine-read outline.
 * "cover" fills the hero and sweeps a read line across it.
 * "plates" explodes the film, its outline and its findings into stacked glass sheets.
 */

export interface FilmTag {
  /** Position on the plate, 0 to 1 from the top-left. */
  x: number;
  y: number;
  text: string;
  tone?: "ok" | "alert";
}

interface FilmConfig {
  mode: "cover" | "plates";
  film: string;
  filmSmall?: string;
  edge: string;
  poster: string;
  tags: FilmTag[];
}

const SIGNAL = "#d9ff42";
const ALERT = "#ff785a";
const MAX_DPR = 2;
const SMALL_VIEWPORT = 760;
/** Below this stage width the plates shrink so the front plate's tags stay on screen. */
const NARROW_STAGE = 520;
const SYNC_TOLERANCE_S = 0.12;
const SWEEP_PERIOD_MS = 9000;
const SWEEP_BAND = 0.36;
const PLATE_RATIO = 9 / 16;
const PLATE_RADIUS = 16;
/** Affine stand-in for perspective: narrow the plate and lift its right edge. */
const PLATE_SQUEEZE = 0.9;
const PLATE_SHEAR = -0.11;
/** Offset between neighbouring plates, as a share of plate width. */
const DEPTH_X = -0.13;
const DEPTH_Y = 0.045;

function hiddenVideo(src: string, host: HTMLElement): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = "auto";
  v.setAttribute("aria-hidden", "true");
  v.tabIndex = -1;
  v.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
  v.src = src;
  host.appendChild(v);
  return v;
}

function ready(v: HTMLVideoElement): boolean {
  return v.readyState >= 2 && v.videoWidth > 0;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Draws a source so it covers the box, like CSS object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, w: number, h: number, focusX = 0.5): void {
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, (w - dw) * focusX, (h - dh) / 2, dw, dh);
}

function roundedRect(ctx: CanvasRenderingContext2D, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
}

export function startFilm(canvas: HTMLCanvasElement, config: FilmConfig): void {
  const maybeCtx = canvas.getContext("2d");
  const host = canvas.parentElement;
  if (!maybeCtx || !host) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const fx = document.createElement("canvas");
  const maybeFx = fx.getContext("2d");
  if (!maybeFx) return;
  const fxCtx: CanvasRenderingContext2D = maybeFx;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const poster = new Image();
  poster.decoding = "async";
  poster.src = config.poster;

  let film: HTMLVideoElement | null = null;
  let edge: HTMLVideoElement | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let visible = false;
  let pointerX = 0;
  let pointerY = 0;

  function load(): void {
    if (film || reduced) return;
    const small = window.innerWidth < SMALL_VIEWPORT && config.filmSmall;
    film = hiddenVideo(small ? config.filmSmall! : config.film, host!);
    edge = hiddenVideo(config.edge, host!);
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    fx.width = canvas.width;
    fx.height = canvas.height;
  }

  function keepInSync(): void {
    if (!film || !edge || !ready(film) || !ready(edge)) return;
    if (Math.abs(edge.currentTime - film.currentTime) > SYNC_TOLERANCE_S) edge.currentTime = film.currentTime;
  }

  function filmSource(): { src: CanvasImageSource; w: number; h: number } | null {
    if (film && ready(film)) return { src: film, w: film.videoWidth, h: film.videoHeight };
    if (poster.complete && poster.naturalWidth > 0) return { src: poster, w: poster.naturalWidth, h: poster.naturalHeight };
    return null;
  }

  function drawCoverMode(now: number): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0b0b0a";
    ctx.fillRect(0, 0, width, height);
    const source = filmSource();
    if (!source) return;
    const focusX = width < SMALL_VIEWPORT ? 0.42 : 0.5;
    drawCover(ctx, source.src, source.w, source.h, width, height, focusX);
    ctx.fillStyle = "rgba(9, 9, 8, .34)";
    ctx.fillRect(0, 0, width, height);
    if (!edge || !ready(edge)) return;

    const progress = (now % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
    const band = width * SWEEP_BAND;
    const lineX = -band * 0.2 + progress * (width + band * 1.4);

    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fxCtx.globalCompositeOperation = "source-over";
    fxCtx.clearRect(0, 0, width, height);
    drawCover(fxCtx, edge, edge.videoWidth, edge.videoHeight, width, height, focusX);
    fxCtx.globalCompositeOperation = "multiply";
    fxCtx.fillStyle = SIGNAL;
    fxCtx.fillRect(0, 0, width, height);
    fxCtx.globalCompositeOperation = "destination-in";
    const mask = fxCtx.createLinearGradient(lineX - band, 0, lineX, 0);
    mask.addColorStop(0, "rgba(0,0,0,0)");
    mask.addColorStop(1, "rgba(0,0,0,.9)");
    fxCtx.fillStyle = mask;
    fxCtx.fillRect(lineX - band, 0, band, height);
    fxCtx.clearRect(lineX, 0, width, height);
    fxCtx.clearRect(0, 0, Math.max(0, lineX - band), height);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(fx, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 0.1;
    drawCover(ctx, edge, edge.videoWidth, edge.videoHeight, width, height, focusX);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    ctx.fillStyle = "rgba(217,255,66,.55)";
    ctx.fillRect(lineX - 1, 0, 1, height);
  }

  /** Runs `draw` in one plate's own coordinates, where the plate is (0, 0) to (pw, ph). */
  function onPlate(originX: number, originY: number, shear: number, draw: () => void): void {
    ctx.save();
    ctx.setTransform(dpr * PLATE_SQUEEZE, dpr * shear, 0, dpr, dpr * originX, dpr * originY);
    draw();
    ctx.restore();
  }

  function drawPlatesMode(): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);

    const rect = canvas.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const spread = reduced ? 1 : easeOut(clamp01((viewport - rect.top) / (viewport * 0.85)));
    const shear = PLATE_SHEAR + pointerY * 0.012;

    const share = width < NARROW_STAGE ? 0.72 : 0.8;
    const pw = Math.min(width * share, (height * 0.8) / PLATE_RATIO);
    const ph = pw * PLATE_RATIO;
    const stepX = pw * DEPTH_X * spread + pointerX * 6;
    const stepY = pw * DEPTH_Y * spread;
    const centreX = (width - pw * PLATE_SQUEEZE) / 2 - stepX * 0.5;
    const centreY = (height - ph) / 2 - (pw * PLATE_SQUEEZE * shear) / 2 - stepY * 0.5;
    const at = (depth: number) => ({ x: centreX + stepX * depth, y: centreY + stepY * depth });
    const toScreen = (depth: number, u: number, v: number) => {
      const o = at(depth);
      return { x: o.x + u * pw * PLATE_SQUEEZE, y: o.y + v * ph + u * pw * PLATE_SQUEEZE * shear };
    };

    const back = at(-1);
    onPlate(back.x, back.y, shear, () => {
      roundedRect(ctx, pw, ph, PLATE_RADIUS);
      ctx.fillStyle = "rgba(255,255,255,.015)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.16)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.3)";
      for (let i = 1; i < 4; i++) ctx.fillRect(pw - 26, (ph * i) / 4, 10, 1);
    });

    const source = filmSource();
    const mid = at(0);
    onPlate(mid.x, mid.y, shear, () => {
      roundedRect(ctx, pw, ph, PLATE_RADIUS);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#111110";
      ctx.fillRect(0, 0, pw, ph);
      if (source) ctx.drawImage(source.src, 0, 0, pw, ph);
      ctx.fillStyle = `rgba(9, 9, 8, ${0.12 + 0.2 * spread})`;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const outline = at(1);
    onPlate(outline.x, outline.y, shear, () => {
      roundedRect(ctx, pw, ph, PLATE_RADIUS);
      ctx.fillStyle = "rgba(255,255,255,.02)";
      ctx.fill();
      if (edge && ready(edge)) {
        ctx.save();
        ctx.clip();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.55 + 0.45 * spread;
        ctx.drawImage(edge, 0, 0, pw, ph);
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const a = toScreen(-1, u, v);
      const b = toScreen(2, u, v);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const front = at(2);
    onPlate(front.x, front.y, shear, () => {
      roundedRect(ctx, pw, ph, PLATE_RADIUS);
      ctx.strokeStyle = "rgba(255,255,255,.26)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const fontSize = Math.max(10, Math.min(12.5, pw / 46));
    config.tags.forEach((tag, i) => {
      const reveal = clamp01(spread * 1.6 - 0.35 - i * 0.14);
      if (reveal <= 0) return;
      const colour = tag.tone === "alert" ? ALERT : SIGNAL;
      const anchor = toScreen(0, tag.x, tag.y);
      const label = toScreen(2, tag.x, tag.y);
      ctx.globalAlpha = reveal;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(label.x, label.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeRect(anchor.x - 4, anchor.y - 4, 8, 8);
      onPlate(front.x, front.y, shear, () => {
        const x = tag.x * pw;
        const y = tag.y * ph;
        ctx.font = `500 ${fontSize}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
        const textWidth = ctx.measureText(tag.text).width;
        const padX = 9;
        const boxH = fontSize + 13;
        ctx.fillStyle = "rgba(12,12,11,.82)";
        ctx.fillRect(x, y - boxH / 2, textWidth + padX * 2 + 10, boxH);
        ctx.strokeStyle = colour;
        ctx.strokeRect(x, y - boxH / 2, textWidth + padX * 2 + 10, boxH);
        ctx.fillStyle = colour;
        ctx.fillRect(x + padX, y - 2.5, 5, 5);
        ctx.fillStyle = "rgba(255,255,255,.94)";
        ctx.textBaseline = "middle";
        ctx.fillText(tag.text, x + padX + 10, y + 0.5);
      });
      ctx.globalAlpha = 1;
    });
  }

  function draw(now: number): void {
    keepInSync();
    if (config.mode === "cover") drawCoverMode(now);
    else drawPlatesMode();
  }

  function tick(now: number): void {
    if (!visible) return;
    draw(now);
    raf = requestAnimationFrame(tick);
  }

  function play(): void {
    load();
    void film?.play().catch(() => undefined);
    void edge?.play().catch(() => undefined);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause(): void {
    cancelAnimationFrame(raf);
    film?.pause();
    edge?.pause();
  }

  resize();
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(canvas);
  poster.addEventListener("load", () => draw(performance.now()));
  document.fonts?.ready.then(() => draw(performance.now()));

  new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting) && !document.hidden;
      if (visible && !reduced) play();
      else pause();
      if (reduced) draw(0);
    },
    { rootMargin: "200px 0px" },
  ).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else if (visible && !reduced) play();
  });

  if (config.mode === "plates" && !reduced) {
    window.addEventListener(
      "pointermove",
      (e) => {
        pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
        pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
    window.addEventListener("scroll", () => { if (reduced) draw(0); }, { passive: true });
  }
}

/** Starts every film canvas on the page; each canvas carries its config in data attributes. */
export function startAllFilms(): void {
  document.querySelectorAll<HTMLCanvasElement>("canvas[data-film]").forEach((canvas) => {
    const d = canvas.dataset;
    if (!d.film || !d.edge || !d.poster) return;
    let tags: FilmTag[] = [];
    try {
      tags = d.tags ? (JSON.parse(d.tags) as FilmTag[]) : [];
    } catch {
      tags = [];
    }
    startFilm(canvas, {
      mode: d.mode === "plates" ? "plates" : "cover",
      film: d.film,
      filmSmall: d.filmSmall,
      edge: d.edge,
      poster: d.poster,
      tags,
    });
  });
}
