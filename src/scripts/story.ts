/**
 * The home page story: one pinned canvas driven by scroll.
 * The hero film shrinks into a tilted plate, then two more sheets lift off it:
 * the 2D drawing the footage is mapped to, and the insights read from both.
 * A day timeline under the stack rewinds the insights.
 */
import { BAYS_BY_DAY, drawInsights, drawPlan, type DrawingKind, type InsightStyle, type PlanStyle } from "./story-drawings";

export interface FilmTag {
  /** Position on the plate, 0 to 1 from the top-left. */
  x: number;
  y: number;
  /** "{bays}" is replaced with the bays completed since Monday. */
  text: string;
  tone?: "ok" | "alert";
  /** Days, Monday = 0, on which the tag shows; every day when omitted. */
  days?: number[];
}

export interface StoryChapter {
  clip: string;
  source: string;
  sheet: string;
  drawing: DrawingKind;
  tags: FilmTag[];
  /** One status line per day, Monday to today. */
  readouts: string[];
}

export interface StoryConfig {
  mediaBase: string;
  /** Clips the hero cycles through, as [clip, pillar id]. */
  heroCycle: [string, string][];
  /** Lighter clips to use in place of the hero's large ones on small screens. */
  smallScreenClips: Record<string, string>;
  chapters: StoryChapter[];
}

interface Clip {
  name: string;
  film: HTMLVideoElement;
  poster: HTMLImageElement;
  alpha: number;
}

interface Point {
  x: number;
  y: number;
}

const BLUE = "#8fbcff";
const GREEN = "#6fd6a0";
const ALERT = "#ff6a3d";
const GROUND = [10, 10, 9];
const MAX_DPR = 2;
const SMALL_VIEWPORT = 860;
const HERO_CLIP_MS = 4200;
const CARD_INSET = 12;
const PLATE_RATIO = 9 / 16;
const LAYER_NAMES = ["FOOTAGE", "DRAWING", "INSIGHTS"];
const LAST_DAY = BAYS_BY_DAY.length - 1;
/** How far an unfocused layer fades when another layer is picked. */
const DIMMED = 0.16;
/** How much the drawing glass darkens the footage behind it, so the plan's lines stay readable. */
const DRAWING_TINT = 0.34;
/** Affine stand-in for perspective: narrow the plate and lift its right edge. */
const PLATE_SQUEEZE = 0.9;
const PLATE_SHEAR = -0.11;
/** Offset between neighbouring plates, as a share of plate width. */
const DEPTH_X = -0.17;
const DEPTH_Y = 0.07;
/** Plate height as a share of the viewport: smaller while the statement sits under the stack. */
const STACK_HEIGHT_ALONE = 0.42;
const STACK_HEIGHT_BESIDE = 0.5;
/** Distance from the stack's centre to its top edge, in plate heights, once the plates are spread. */
const STACK_HALF_SPAN = 0.5 + ((PLATE_SQUEEZE * -PLATE_SHEAR) / 2 + DEPTH_Y) / PLATE_RATIO;
const NAV_GAP = 28;
/** The drawn state trails the scroll position by this time constant, so wheel steps glide. */
const SCROLL_LAG_MS = 170;
/** The drawn state never trails the scroll position by more than this share of the story. */
const MAX_TRAIL = 0.22;

/** Scroll progress marks, 0 to 1 across the pinned section. */
/*
 * The story is timed in screens of scroll. Each whole screen lands on a finished state:
 * 1 = the spread stack with its statement, 2, 3 and 4 = the three chapters.
 * A page-down key press (about 0.87 of a screen) lands on the same four states.
 */
/** Screens of scroll the story is pinned for. The section is one screen taller than this. */
export const STORY_SCREENS = 4;
const mark = (screens: number): number => screens / STORY_SCREENS;
/** The hero clips rotate up to this mark, hold while the film shrinks, then rotate again in the stack. */
const HERO_HOLD = 0.01;
const SHRINK_END = mark(0.7);
const EXPLODE_START = mark(0.25);
const EXPLODE_END = mark(0.7);
const MANIFESTO: [number, number, number, number] = [mark(0.42), mark(0.66), mark(1.05), mark(1.22)];
const SIDE_START = mark(1.05);
export const CHAPTERS_START = mark(1.4);
/** Each chapter runs for this long; the last one then holds until the story ends. */
export const CHAPTER_SPAN = mark(0.95);
const FADE = mark(0.13);
/** Within a chapter, as shares of its length: when the plan arrives and when each tag appears. */
const PLAN_IN = 0.08;
const TAG_FIRST = 0.04;
const TAG_STEP = 0.04;
const TAG_FADE = 0.06;

const PLAN_GLASS: Omit<PlanStyle, "font"> = { line: BLUE, faint: "rgba(143,188,255,.38)", fill: "rgba(143,188,255,.1)", text: "rgba(214,230,255,.9)" };
const PLAN_PAPER: Omit<PlanStyle, "font"> = { line: "#1b2a44", faint: "rgba(27,42,68,.34)", fill: "rgba(27,42,68,.06)", text: "#1b2a44" };
const INSIGHT_STYLE: InsightStyle = { line: "rgba(255,255,255,.85)", ok: GREEN, okFill: "rgba(111,214,160,.3)", alert: ALERT, alertFill: "rgba(255,106,61,.6)" };

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => t * t * (3 - 2 * t);
const span = (p: number, from: number, to: number): number => clamp01((p - from) / (to - from));

function hiddenVideo(src: string, host: HTMLElement): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = "metadata";
  v.setAttribute("aria-hidden", "true");
  v.tabIndex = -1;
  v.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;";
  v.src = src;
  host.appendChild(v);
  return v;
}

const ready = (v: HTMLVideoElement): boolean => v.readyState >= 2 && v.videoWidth > 0;

/** Draws a source so it covers the box, like CSS object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, w: number, h: number): void {
  const scale = Math.max(w / sw, h / sh);
  ctx.drawImage(src, (w - sw * scale) / 2, (h - sh * scale) / 2, sw * scale, sh * scale);
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

export function startStory(root: HTMLElement, config: StoryConfig): void {
  const canvas = root.querySelector<HTMLCanvasElement>("canvas");
  const pin = root.querySelector<HTMLElement>("[data-pin]");
  const maybeCtx = canvas?.getContext("2d");
  if (!canvas || !pin || !maybeCtx) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  const hero = root.querySelector<HTMLElement>("[data-hero]");
  const manifesto = root.querySelector<HTMLElement>("[data-manifesto]");
  const controls = root.querySelector<HTMLElement>("[data-controls]");
  const readout = root.querySelector<HTMLElement>("[data-readout]");
  const chapterEls = [...root.querySelectorAll<HTMLElement>("[data-chapter]")];
  const pillarEls = [...root.querySelectorAll<HTMLElement>("[data-pillar]")];
  const layerButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-layer]")];
  const dayButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-day]")];
  const header = document.querySelector<HTMLElement>("header[data-nav]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = window.innerWidth < SMALL_VIEWPORT;

  const heroCycle = config.heroCycle.map(([clip, pillar]): [string, string] => [smallScreen ? (config.smallScreenClips[clip] ?? clip) : clip, pillar]);
  const names = [...new Set([...heroCycle.map(([clip]) => clip), ...config.chapters.map((c) => c.clip)])];
  const clips = new Map<string, Clip>();
  for (const name of names) {
    const poster = new Image();
    poster.decoding = "async";
    poster.src = `${config.mediaBase}${name}.jpg`;
    clips.set(name, { name, film: hiddenVideo(`${config.mediaBase}${name}.mp4`, pin), poster, alpha: name === heroCycle[0][0] ? 1 : 0 });
  }

  const chapterSpan = CHAPTER_SPAN;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let topInset = 96;
  let raf = 0;
  let visible = false;
  let navTheme = "";
  let day = LAST_DAY;
  let pinnedLayer = -1;
  let hoverLayer = -1;
  let paper = 0;
  let shownReadout = "";
  let shown = -1;
  let lastFrame = 0;
  let cycleClock = 0;
  let cycleIndex = 0;
  let activeClip = "";
  let navHeight = 64;
  const layerAlpha = [1, 1, 1];

  layerButtons.forEach((button) => {
    const index = Number(button.dataset.layer);
    button.addEventListener("click", () => {
      pinnedLayer = pinnedLayer === index ? -1 : index;
      layerButtons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.layer) === pinnedLayer)));
    });
    button.addEventListener("pointerenter", () => { hoverLayer = index; });
    button.addEventListener("pointerleave", () => { hoverLayer = -1; });
  });
  dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      day = Number(button.dataset.day);
      dayButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    });
  });

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = pin!.clientWidth;
    height = pin!.clientHeight;
    canvas!.width = Math.round(width * dpr);
    canvas!.height = Math.round(height * dpr);
    if (header && window.scrollY < 4) topInset = header.offsetHeight + 4;
    navHeight = header?.querySelector<HTMLElement>(".nav")?.offsetHeight ?? navHeight;
    root.style.setProperty("--card-top", `${topInset}px`);
  }

  function scrollProgress(): number {
    const rect = root.getBoundingClientRect();
    return clamp01(-rect.top / Math.max(1, rect.height - height));
  }

  /** Moves the drawn progress toward the scroll position, so a wheel step becomes a glide. */
  function follow(now: number): number {
    const target = scrollProgress();
    const dt = Math.min(64, Math.max(0, now - lastFrame));
    lastFrame = now;
    if (shown < 0 || reduced) shown = target;
    const gap = target - shown;
    if (Math.abs(gap) > MAX_TRAIL) shown = target - Math.sign(gap) * MAX_TRAIL;
    shown += (target - shown) * (1 - Math.exp(-dt / SCROLL_LAG_MS));
    if (Math.abs(target - shown) < 0.0003) shown = target;
    if (shown < HERO_HOLD || shown >= SHRINK_END) cycleClock += dt;
    return shown;
  }

  function setNavTheme(dark: number): void {
    const past = root.getBoundingClientRect().bottom < 64;
    const theme = past || dark < 0.5 ? "light" : "dark";
    if (theme === navTheme) return;
    navTheme = theme;
    document.documentElement.dataset.nav = theme;
  }

  function show(el: HTMLElement | null, opacity: number, lift = 18): void {
    if (!el) return;
    el.style.opacity = opacity.toFixed(3);
    el.style.transform = `translateY(${((1 - opacity) * lift).toFixed(1)}px)`;
    el.style.pointerEvents = opacity > 0.6 ? "auto" : "none";
  }

  function chapterAt(p: number): number {
    if (p < CHAPTERS_START - FADE) return -1;
    return Math.min(config.chapters.length - 1, Math.max(0, Math.floor((p - CHAPTERS_START) / chapterSpan)));
  }

  function updateClips(chapter: number): void {
    cycleIndex = reduced ? 0 : Math.floor(cycleClock / HERO_CLIP_MS) % heroCycle.length;
    const [cycleClip, cyclePillar] = heroCycle[cycleIndex];
    const active = chapter >= 0 ? config.chapters[chapter].clip : cycleClip;
    if (active !== activeClip) {
      const next = clips.get(active);
      if (next && chapter < 0 && next.alpha < 0.05 && ready(next.film)) next.film.currentTime = 0;
      activeClip = active;
    }
    pillarEls.forEach((el) => el.classList.toggle("is-on", el.dataset.pillar === cyclePillar));
    for (const clip of clips.values()) {
      const target = clip.name === active ? 1 : 0;
      clip.alpha = reduced ? target : clip.alpha + (target - clip.alpha) * 0.08;
      if ((clip.alpha > 0.02 || target === 1) && !reduced && visible) {
        if (clip.film.paused) void clip.film.play().catch(() => undefined);
      } else clip.film.pause();
    }
  }

  function draw(now: number): void {
    const p = follow(now);
    const chapter = chapterAt(p);
    updateClips(chapter);

    const shrinking = span(p, 0, SHRINK_END);
    const shrink = smooth(shrinking);
    const dark = smooth(span(shrinking, 0.06, 0.62));
    const explode = smooth(span(p, EXPLODE_START, EXPLODE_END));
    const side = smooth(span(p, SIDE_START, CHAPTERS_START));
    setNavTheme(dark);

    show(hero, 1 - smooth(span(shrinking, 0, 0.34)), -28);
    show(manifesto, Math.min(span(p, MANIFESTO[0], MANIFESTO[1]), 1 - span(p, MANIFESTO[2], MANIFESTO[3])));
    chapterEls.forEach((el, i) => {
      const start = CHAPTERS_START + i * chapterSpan;
      const fadeOut = i === chapterEls.length - 1 ? 1 : 1 - span(p, start + chapterSpan - FADE, start + chapterSpan);
      show(el, Math.min(span(p, start, start + FADE), fadeOut));
    });

    const focus = hoverLayer >= 0 ? hoverLayer : pinnedLayer;
    for (let i = 0; i < layerAlpha.length; i++) {
      const target = focus < 0 || focus === i ? 1 : DIMMED;
      layerAlpha[i] += (target - layerAlpha[i]) * 0.14;
    }
    paper += ((focus === 1 ? 1 : 0) - paper) * 0.14;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${GROUND.map((c) => Math.round(lerp(255, c, dark))).join(",")})`;
    ctx.fillRect(0, 0, width, height);

    const narrow = width < SMALL_VIEWPORT;
    const plateW = narrow ? width * 0.7 : Math.min(width * lerp(0.46, 0.4, side), (height * lerp(STACK_HEIGHT_ALONE, STACK_HEIGHT_BESIDE, side)) / PLATE_RATIO);
    const cardW = width - CARD_INSET * 2;
    const cardH = height - topInset - CARD_INSET;
    const w = lerp(cardW, plateW, shrink);
    const h = lerp(cardH, plateW * PLATE_RATIO, shrink);
    const squeeze = lerp(1, PLATE_SQUEEZE, shrink);
    const shear = lerp(0, PLATE_SHEAR, shrink);
    const restX = narrow ? width / 2 : lerp(width / 2, width * 0.69, side);
    const clearNav = navHeight + NAV_GAP + plateW * PLATE_RATIO * STACK_HALF_SPAN;
    const restY = Math.max(clearNav, narrow ? lerp(height * 0.34, height * 0.25, side) : lerp(height * 0.4, height * 0.45, side));
    const cx = lerp(width / 2, restX, shrink);
    const cy = lerp(topInset + cardH / 2, restY, shrink);
    const stepX = plateW * DEPTH_X * explode;
    const stepY = plateW * DEPTH_Y * explode;
    const originX = cx - (w * squeeze) / 2 - stepX;
    const originY = cy - h / 2 - (w * squeeze * shear) / 2 - stepY;
    const radius = lerp(14, 16, shrink);

    const at = (depth: number): Point => ({ x: originX + stepX * depth, y: originY + stepY * depth });
    const toScreen = (depth: number, u: number, v: number): Point => {
      const o = at(depth);
      return { x: o.x + u * w * squeeze, y: o.y + v * h + u * w * squeeze * shear };
    };
    const onPlate = (depth: number, paint: () => void): void => {
      const o = at(depth);
      ctx.save();
      ctx.setTransform(dpr * squeeze, dpr * squeeze * shear, 0, dpr, dpr * o.x, dpr * o.y);
      paint();
      ctx.restore();
    };

    onPlate(0, () => {
      roundedRect(ctx, w, h, radius);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#111110";
      ctx.fillRect(0, 0, w, h);
      for (const clip of clips.values()) {
        if (clip.alpha < 0.01) continue;
        ctx.globalAlpha = clip.alpha;
        if (ready(clip.film)) drawCover(ctx, clip.film, clip.film.videoWidth, clip.film.videoHeight, w, h);
        else if (clip.poster.complete && clip.poster.naturalWidth > 0) drawCover(ctx, clip.poster, clip.poster.naturalWidth, clip.poster.naturalHeight, w, h);
      }
      ctx.globalAlpha = 1;
      const scrim = 1 - shrink;
      if (scrim > 0.01) {
        const veil = ctx.createLinearGradient(0, 0, w, 0);
        veil.addColorStop(0, `rgba(8,8,7,${0.74 * scrim})`);
        veil.addColorStop(0.45, `rgba(8,8,7,${0.4 * scrim})`);
        veil.addColorStop(0.8, `rgba(8,8,7,${0.1 * scrim})`);
        ctx.fillStyle = veil;
        ctx.fillRect(0, 0, w, h);
        const floor = ctx.createLinearGradient(0, h * 0.6, 0, h);
        floor.addColorStop(0, "rgba(8,8,7,0)");
        floor.addColorStop(1, `rgba(8,8,7,${0.72 * scrim})`);
        ctx.fillStyle = floor;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = `rgba(10,10,9,${explode * (1 - layerAlpha[0]) * 0.9})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      if (shrink > 0.02) {
        ctx.strokeStyle = `rgba(255,255,255,${0.34 * shrink})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    positionControls(toScreen, side);
    if (explode <= 0.01) return;

    const fontSize = Math.max(9.5, Math.min(12, w / 48));
    const font = `500 ${fontSize}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
    const active = chapter >= 0 ? config.chapters[chapter] : null;
    const start = CHAPTERS_START + Math.max(0, chapter) * chapterSpan;
    const local = span(p, start, start + chapterSpan);
    const leaving = chapter === config.chapters.length - 1 ? 1 : 1 - span(p, start + chapterSpan - FADE, start + chapterSpan);
    const arrive = Math.min(span(local, 0, PLAN_IN), leaving);

    onPlate(1, () => {
      roundedRect(ctx, w, h, radius);
      ctx.fillStyle = `rgba(9,14,24,${DRAWING_TINT * explode * layerAlpha[1] * (active ? 1 : 0.4)})`;
      ctx.fill();
      ctx.fillStyle = `rgba(244,243,238,${0.96 * paper})`;
      ctx.fill();
      if (active) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = arrive * layerAlpha[1];
        drawPlan(ctx, active.drawing, active.sheet, w, h, { ...(paper > 0.5 ? PLAN_PAPER : PLAN_GLASS), font });
        ctx.restore();
      }
      roundedRect(ctx, w, h, radius);
      ctx.globalAlpha = explode * layerAlpha[1];
      ctx.strokeStyle = paper > 0.5 ? "rgba(255,255,255,.9)" : "rgba(143,188,255,.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.22 * explode})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const a = toScreen(0, u, v);
      const b = toScreen(2, u, v);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const insightAlpha = layerAlpha[2] * (1 - paper);
    onPlate(2, () => {
      roundedRect(ctx, w, h, radius);
      if (active) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = arrive * insightAlpha;
        drawInsights(ctx, active.drawing, w, h, day, now, INSIGHT_STYLE);
        ctx.restore();
        roundedRect(ctx, w, h, radius);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.3 * explode * layerAlpha[2]})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    LAYER_NAMES.forEach((name, depth) => {
      onPlate(depth, () => {
        ctx.font = font;
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = explode * lerp(0.45, 1, layerAlpha[depth]);
        ctx.fillStyle = depth === 1 ? BLUE : "rgba(255,255,255,.8)";
        const source = active?.source ?? config.chapters[cycleIndex]?.source;
        const detail = depth === 0 && source ? ` · ${source}` : "";
        ctx.fillText(`0${depth + 1} ${name}${detail}`, radius, -9);
      });
    });

    if (!active) return;
    const since = BAYS_BY_DAY[day] - BAYS_BY_DAY[0];
    active.tags.forEach((tag, i) => {
      if (tag.days && !tag.days.includes(day)) return;
      const tagStart = TAG_FIRST + i * TAG_STEP;
      const reveal = Math.min(span(local, tagStart, tagStart + TAG_FADE), leaving) * insightAlpha;
      if (reveal <= 0) return;
      const colour = tag.tone === "alert" ? ALERT : "#ffffff";
      const text = tag.text.replace("{bays}", String(since));
      const anchor = toScreen(0, tag.x, tag.y);
      const label = toScreen(2, tag.x, tag.y);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      onPlate(2, () => {
        const x = tag.x * w;
        const y = tag.y * h;
        ctx.font = font;
        const boxW = ctx.measureText(text).width + 28;
        const boxH = fontSize + 13;
        ctx.fillStyle = "rgba(12,12,11,.9)";
        ctx.fillRect(x, y - boxH / 2, boxW, boxH);
        ctx.strokeStyle = tag.tone === "alert" ? ALERT : "rgba(255,255,255,.75)";
        ctx.strokeRect(x, y - boxH / 2, boxW, boxH);
        ctx.fillStyle = colour;
        ctx.fillRect(x + 9, y - 2.5, 5, 5);
        ctx.fillStyle = "rgba(255,255,255,.95)";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x + 19, y + 0.5);
      });
      ctx.globalAlpha = 1;
    });

    const line = active.readouts[day] ?? "";
    if (readout && line !== shownReadout) {
      shownReadout = line;
      readout.textContent = line;
    }
  }

  /** Keeps the layer and day controls under the plate stack as it moves. */
  function positionControls(toScreen: (depth: number, u: number, v: number) => Point, side: number): void {
    if (!controls) return;
    const left = toScreen(2, 0, 1);
    const right = toScreen(0, 1, 1);
    const bottom = Math.max(left.y, toScreen(2, 1, 1).y, right.y);
    controls.style.left = `${Math.max(16, left.x).toFixed(0)}px`;
    controls.style.width = `${Math.min(width - 32, right.x - left.x).toFixed(0)}px`;
    controls.style.top = `${(bottom + 34).toFixed(0)}px`;
    show(controls, side, 0);
  }

  function tick(now: number): void {
    if (!visible) return;
    draw(now);
    raf = requestAnimationFrame(tick);
  }

  function setVisible(next: boolean): void {
    visible = next;
    cancelAnimationFrame(raf);
    if (visible) {
      lastFrame = performance.now();
      raf = requestAnimationFrame(tick);
      return;
    }
    for (const clip of clips.values()) clip.film.pause();
    setNavTheme(0);
  }

  resize();
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(pin);
  for (const clip of clips.values()) clip.poster.addEventListener("load", () => draw(performance.now()));
  document.fonts?.ready.then(() => draw(performance.now()));

  /** Whether any part of the story is on screen right now, measured directly. */
  const onScreen = (): boolean => {
    const rect = root.getBoundingClientRect();
    return !document.hidden && rect.bottom > 0 && rect.top < window.innerHeight;
  };
  /** Starts or stops the drawing loop to match what is on screen. Safe to call at any time. */
  const sync = (): void => {
    const next = onScreen();
    if (next !== visible) setVisible(next);
  };
  // The observer is the cheap signal. Scroll, tab and page-restore events re-check it, so a missed
  // or late observer callback can never leave the story frozen on one state.
  new IntersectionObserver(sync).observe(root);
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("pageshow", sync);
  document.addEventListener("visibilitychange", sync);
}
