/**
 * The home page story: one pinned canvas driven by scroll.
 * The hero film shrinks into a tilted plate, then two more sheets lift off it:
 * the 2D drawing the footage is mapped to, and the insights read from both.
 * A day timeline under the stack rewinds all three.
 */
import { BAYS_BY_DAY, drawSheet, type DrawingKind, type DrawingStyle } from "./story-drawings";

export interface FilmTag {
  /** Position on the plate, 0 to 1 from the top-left. */
  x: number;
  y: number;
  /** "{bays}" is replaced with the bays erected since Monday. */
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
  chapters: StoryChapter[];
}

interface Clip {
  name: string;
  film: HTMLVideoElement;
  poster: HTMLImageElement;
  alpha: number;
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

/** Scroll progress marks, 0 to 1 across the pinned section. */
const HERO_OUT = 0.07;
const DARK_BY = 0.1;
const SHRINK_END = 0.2;
const EXPLODE_START = 0.1;
const EXPLODE_END = 0.24;
const MANIFESTO: [number, number, number, number] = [0.15, 0.2, 0.3, 0.34];
const SIDE_START = 0.32;
const CHAPTERS_START = 0.42;
const FADE = 0.03;

const GLASS_STYLE: Omit<DrawingStyle, "font"> = {
  line: BLUE,
  faint: "rgba(143,188,255,.38)",
  ok: GREEN,
  okFill: "rgba(111,214,160,.3)",
  coneFill: "rgba(143,188,255,.14)",
  alert: ALERT,
  alertFill: "rgba(255,106,61,.55)",
  text: "rgba(214,230,255,.9)",
};
const PAPER_STYLE: Omit<DrawingStyle, "font"> = {
  line: "#1b2a44",
  faint: "rgba(27,42,68,.35)",
  ok: "#1f8a55",
  okFill: "rgba(31,138,85,.22)",
  coneFill: "rgba(27,42,68,.1)",
  alert: "#d9481c",
  alertFill: "rgba(217,72,28,.5)",
  text: "#1b2a44",
};

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
  const header = document.querySelector<HTMLElement>("[data-nav]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = window.innerWidth < SMALL_VIEWPORT;

  const names = [...new Set([...config.heroCycle.map(([clip]) => clip), ...config.chapters.map((c) => c.clip)])];
  const clips = new Map<string, Clip>();
  for (const name of names) {
    const poster = new Image();
    poster.decoding = "async";
    poster.src = `${config.mediaBase}${name}.jpg`;
    const file = smallScreen && name === "hero" ? "hero-sm" : name;
    clips.set(name, { name, film: hiddenVideo(`${config.mediaBase}${file}.mp4`, pin), poster, alpha: name === config.heroCycle[0][0] ? 1 : 0 });
  }

  const chapterSpan = (1 - CHAPTERS_START) / config.chapters.length;
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
  let cycleStart = performance.now();
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
    root.style.setProperty("--card-top", `${topInset}px`);
  }

  function progress(): number {
    const rect = root.getBoundingClientRect();
    return clamp01(-rect.top / Math.max(1, rect.height - height));
  }

  function setNavTheme(p: number): void {
    const past = root.getBoundingClientRect().bottom < 64;
    const theme = past || p < DARK_BY * 0.5 ? "light" : "dark";
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

  function updateClips(chapter: number, now: number): void {
    const cycleIndex = reduced ? 0 : Math.floor(Math.max(0, now - cycleStart) / HERO_CLIP_MS) % config.heroCycle.length;
    const [cycleClip, cyclePillar] = config.heroCycle[cycleIndex];
    const active = chapter >= 0 ? config.chapters[chapter].clip : cycleClip;
    pillarEls.forEach((el) => el.classList.toggle("is-on", el.dataset.pillar === cyclePillar));
    for (const clip of clips.values()) {
      const target = clip.name === active ? 1 : 0;
      clip.alpha = reduced ? target : clip.alpha + (target - clip.alpha) * 0.09;
      if ((clip.alpha > 0.02 || target === 1) && !reduced && visible) {
        if (clip.film.paused) void clip.film.play().catch(() => undefined);
      } else clip.film.pause();
    }
  }

  function draw(now: number): void {
    const p = progress();
    const chapter = chapterAt(p);
    setNavTheme(p);
    updateClips(chapter, now);

    const shrink = ease(span(p, 0, SHRINK_END));
    const explode = ease(span(p, EXPLODE_START, EXPLODE_END));
    const side = ease(span(p, SIDE_START, CHAPTERS_START));

    show(hero, 1 - span(p, 0, HERO_OUT));
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
    const dark = span(p, 0, DARK_BY);
    ctx.fillStyle = `rgb(${GROUND.map((c) => Math.round(lerp(255, c, dark))).join(",")})`;
    ctx.fillRect(0, 0, width, height);

    const narrow = width < SMALL_VIEWPORT;
    const plateW = narrow ? width * 0.7 : Math.min(width * lerp(0.46, 0.4, side), (height * 0.5) / PLATE_RATIO);
    const cardW = width - CARD_INSET * 2;
    const cardH = height - topInset - CARD_INSET;
    const w = lerp(cardW, plateW, shrink);
    const h = lerp(cardH, plateW * PLATE_RATIO, shrink);
    const squeeze = lerp(1, PLATE_SQUEEZE, shrink);
    const shear = lerp(0, PLATE_SHEAR, shrink);
    const restX = narrow ? width / 2 : lerp(width / 2, width * 0.69, side);
    const restY = narrow ? lerp(height * 0.34, height * 0.25, side) : lerp(height * 0.4, height * 0.45, side);
    const cx = lerp(width / 2, restX, shrink);
    const cy = lerp(topInset + cardH / 2, restY, shrink);
    const stepX = plateW * DEPTH_X * explode;
    const stepY = plateW * DEPTH_Y * explode;
    const originX = cx - (w * squeeze) / 2 - stepX;
    const originY = cy - h / 2 - (w * squeeze * shear) / 2 - stepY;
    const radius = lerp(14, 16, shrink);

    const at = (depth: number) => ({ x: originX + stepX * depth, y: originY + stepY * depth });
    const toScreen = (depth: number, u: number, v: number) => {
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
      ctx.imageSmoothingQuality = "high";
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

    onPlate(1, () => {
      roundedRect(ctx, w, h, radius);
      ctx.fillStyle = `rgba(9,14,24,${DRAWING_TINT * explode * layerAlpha[1] * (active ? 1 : 0.4)})`;
      ctx.fill();
      ctx.fillStyle = `rgba(244,243,238,${0.96 * paper})`;
      ctx.fill();
      if (active) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = Math.min(span(local, 0, 0.1), leaving) * layerAlpha[1];
        drawSheet(ctx, active.drawing, active.sheet, w, h, day, now, { ...(paper > 0.5 ? PAPER_STYLE : GLASS_STYLE), font });
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

    onPlate(2, () => {
      roundedRect(ctx, w, h, radius);
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
        const detail = depth === 0 && active ? ` · ${active.source}` : "";
        ctx.fillText(`0${depth + 1} ${name}${detail}`, radius, -9);
      });
    });

    if (!active) return;
    const since = BAYS_BY_DAY[day] - BAYS_BY_DAY[0];
    active.tags.forEach((tag, i) => {
      if (tag.days && !tag.days.includes(day)) return;
      const reveal = Math.min(span(local, 0.1 + i * 0.08, 0.2 + i * 0.08), leaving) * layerAlpha[2] * (1 - paper);
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
  function positionControls(toScreen: (depth: number, u: number, v: number) => { x: number; y: number }, side: number): void {
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
      cycleStart = performance.now();
      raf = requestAnimationFrame(tick);
      return;
    }
    for (const clip of clips.values()) clip.film.pause();
    setNavTheme(progress());
  }

  resize();
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(pin);
  for (const clip of clips.values()) clip.poster.addEventListener("load", () => draw(performance.now()));
  document.fonts?.ready.then(() => draw(performance.now()));
  window.addEventListener("scroll", () => { if (!visible) setNavTheme(progress()); }, { passive: true });

  new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting) && !document.hidden)).observe(root);
  document.addEventListener("visibilitychange", () => {
    const rect = root.getBoundingClientRect();
    setVisible(!document.hidden && rect.bottom > 0 && rect.top < window.innerHeight);
  });
}
