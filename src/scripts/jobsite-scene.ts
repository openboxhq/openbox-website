/**
 * Animated hero background: one jobsite seen by site cameras, a headcam walk and a drone,
 * with every capture landing on one timeline as the building is verified level by level.
 * The scene is a pure function of loop time, so the reduced-motion still is just one frame.
 */
import { INTRO_S, LOOP_S, START_T, STILL_T } from "./scene/config";
import { drawCrew, drawDrone, drawHeadcam, drawTruck, headcamInFront } from "./scene/actors";
import { deckHeight, drawBuilding } from "./scene/building";
import { drawTags, drawTimeline } from "./scene/overlay";
import { drawCrane, drawFence, drawGround, drawSiteCams, drawSurroundings } from "./scene/site";
import { ease, makeView } from "./scene/view";

const MAX_DPR = 2;

export function startJobsiteScene(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1;
  let running = false, visible = true, raf = 0;
  let last = 0, elapsed = 0;

  function draw(t: number, intro: number): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (w === 0 || h === 0) return;
    ctx.globalAlpha = intro;
    const p = { ctx, view: makeView(w, h, t), t };
    drawGround(p);
    drawSurroundings(p);
    drawFence(p);
    drawSiteCams(p);
    drawTruck(p);
    const deckZ = deckHeight(t), walkerInFront = headcamInFront(t);
    if (!walkerInFront) drawHeadcam(p);
    drawCrew(p);
    drawBuilding(p);
    if (walkerInFront) drawHeadcam(p);
    drawCrane(p, deckZ);
    drawDrone(p, deckZ);
    drawTags(p);
    drawTimeline(p);
    ctx.globalAlpha = 1;
  }

  const drawStill = () => draw(STILL_T, 1);

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (still) drawStill(); else draw((START_T + elapsed) % LOOP_S, ease(elapsed / INTRO_S));
  }

  function frame(now: number): void {
    // Clamp the step so a long pause never shows up as a jump in the scene.
    elapsed += Math.min((now - last) / 1000, 0.1);
    last = now;
    draw((START_T + elapsed) % LOOP_S, ease(elapsed / INTRO_S));
    if (running) raf = requestAnimationFrame(frame);
  }

  function sync(): void {
    const on = visible && !document.hidden;
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (still) {
    // Labels are drawn once, so repaint when the mono face has loaded.
    void document.fonts.ready.then(drawStill);
    return;
  }
  new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; sync(); }).observe(canvas);
  document.addEventListener("visibilitychange", sync);
  sync();
}
