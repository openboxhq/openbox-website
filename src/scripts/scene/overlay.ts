import { ALERT, DRONE_ORBIT_S, GROUND, HEADCAM_CAPTURE_S, LEVEL_S, LEVELS, LOOP_S, MONO, SIGNAL, WHITE } from "./config";
import { crewHead, droneAt, headcamHead, surveyPercent, truckTop } from "./actors";
import { deckCorner } from "./building";
import { GATE_CAM_TOP } from "./site";
import { type Painter, type Vec3, ease, envelope, lerp, project, rgba } from "./view";

const TAG_FONT = `500 10px ${MONO}`;
const HUD_FONT = `400 8.5px ${MONO}`;
const TAG_LIFT = 28;
const TAG_SIDE_GAP = 26;
const TAG_SIDE_RUN = 18;
const TAG_PLATE_PAD = 19;
const TAG_EDGE = 10;
const LANE_GAP = 11;
const RECORD_GAP = 16;
const DAY_START_MIN = 6 * 60;
const DAY_SPAN_MIN = 12 * 60;

interface Tag {
  at: number; life: number;
  text: (t: number) => string;
  anchor: (t: number) => Vec3;
  /** Draw a detection frame around a standing person at the anchor. */
  frame?: boolean;
  /** Leader runs sideways instead of up; used on deck corners. */
  side?: boolean;
  alert?: boolean;
}

const fixed = (label: string) => () => label;
const TAGS: readonly Tag[] = [
  { at: 3, life: 4.5, text: fixed("SITE CAM 04 · LIVE"), anchor: () => GATE_CAM_TOP },
  { at: 9.5, life: 5, text: (t) => `DRONE · SURVEY ${surveyPercent(t)}%`, anchor: droneAt },
  { at: 18.5, life: 5, text: fixed("HEADCAM · L1 CAPTURE"), anchor: headcamHead },
  { at: 25, life: 4.8, text: fixed("GATE · TRUCK IN"), anchor: truckTop },
  { at: 29.5, life: 4.5, text: fixed("PERSON · PPE OK"), anchor: () => crewHead(0), frame: true },
  { at: 34.5, life: 5, text: fixed("HEADCAM · L1 CAPTURE"), anchor: headcamHead },
  { at: 36, life: 5, text: (t) => `DRONE · SURVEY ${surveyPercent(t)}%`, anchor: droneAt },
  { at: 44, life: 4.5, text: fixed("PERSON · PPE OK"), anchor: () => crewHead(1), frame: true },
  { at: 51.5, life: 4, text: fixed("PERSON · NO HARD HAT"), anchor: () => crewHead(0), frame: true, alert: true },
  ...Array.from({ length: LEVELS }, (_, i): Tag => ({
    at: (i + 1) * LEVEL_S - 0.2, life: 4.2, side: true,
    text: fixed(`SLAB L${i + 1} · VERIFIED`), anchor: () => deckCorner(i + 1),
  })),
];

function drawTag(p: Painter, tag: Tag): void {
  const alpha = envelope(p.t, tag.at, tag.life);
  if (alpha <= 0) return;
  const { ctx } = p;
  const tone = tag.alert ? ALERT : SIGNAL;
  const [ax, ay] = project(p.view, ...tag.anchor(p.t));
  const rise = ease((p.t - tag.at) / 0.9);

  if (tag.frame) {
    const fw = p.view.s * 0.34, fh = p.view.s * 0.5, x = ax - fw / 2, y = ay - fh * 0.24, c = 4;
    ctx.strokeStyle = rgba(tone, 0.9 * alpha); ctx.lineWidth = 1;
    ctx.beginPath();
    [[x, y, 1, 1], [x + fw, y, -1, 1], [x + fw, y + fh, -1, -1], [x, y + fh, 1, -1]].forEach(([px, py, dx, dy]) => {
      ctx.moveTo(px! + dx! * c, py!); ctx.lineTo(px!, py!); ctx.lineTo(px!, py! + dy! * c);
    });
    ctx.stroke();
  }

  ctx.font = TAG_FONT;
  const text = tag.text(p.t), width = ctx.measureText(text).width;
  // Keep the label inside the canvas; on narrow screens side leaders would run off the edge.
  const maxX = p.view.w - TAG_EDGE - width - TAG_PLATE_PAD;
  let lx: number, ly: number;
  ctx.strokeStyle = rgba(WHITE, 0.34 * alpha); ctx.lineWidth = 1;
  ctx.beginPath();
  if (tag.side && !p.view.narrow) {
    lx = Math.min(ax + TAG_SIDE_GAP + TAG_SIDE_RUN * rise, maxX); ly = ay;
    ctx.moveTo(ax + TAG_SIDE_GAP, ay); ctx.lineTo(lx, ly);
  } else {
    const top = tag.frame ? ay - p.view.s * 0.14 : ay - 7;
    lx = Math.min(ax + 9, maxX); ly = top - TAG_LIFT * rise;
    ctx.moveTo(ax, top); ctx.lineTo(ax, ly); ctx.lineTo(lx, ly);
  }
  ctx.stroke();
  const tx = lx + 13;
  ctx.fillStyle = rgba(GROUND, 0.72 * alpha);
  ctx.fillRect(lx + 2, ly - 8.5, width + TAG_PLATE_PAD - 2, 17);
  ctx.fillStyle = rgba(tone, alpha);
  ctx.fillRect(lx + 5, ly - 2, 4, 4);
  ctx.fillStyle = tag.alert ? rgba(ALERT, 0.95 * alpha) : rgba(WHITE, 0.86 * alpha);
  ctx.fillText(text, tx, ly + 3.5);
}

export function drawTags(p: Painter): void {
  p.ctx.textBaseline = "alphabetic";
  TAGS.forEach((tag) => drawTag(p, tag));
}

/** The one timeline: three capture lanes feeding a single verified record. */
export function drawTimeline(p: Painter): void {
  const { ctx, view, t } = p;
  const x0 = view.narrow ? 84 : view.w * 0.62, x1 = view.w - (view.narrow ? 22 : 56);
  const y0 = view.h - (view.narrow ? 124 : 96);
  const alpha = Math.min(ease(t / 1.5), 1 - ease((t - 56.5) / 3));
  const at = (time: number) => lerp(x0, x1, time / LOOP_S);
  const xp = at(t);
  const lanes = ["SITE CAM", "HEADCAM", "DRONE"].map((label, i) => ({ label, y: y0 + i * LANE_GAP }));
  const recordY = y0 + 2 * LANE_GAP + RECORD_GAP;

  ctx.font = HUD_FONT; ctx.textAlign = "right"; ctx.lineWidth = 1;
  [...lanes, { label: "RECORD", y: recordY }].forEach(({ label, y }, i) => {
    ctx.fillStyle = i === 3 ? rgba(SIGNAL, 0.7) : rgba(WHITE, 0.38);
    ctx.fillText(label, x0 - 12, y + 3);
    ctx.strokeStyle = rgba(WHITE, 0.09);
    ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
  });
  const span = (y: number, from: number, to: number, color: string) => {
    if (to <= from) return;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(at(from), y + 0.5); ctx.lineTo(at(to), y + 0.5); ctx.stroke();
  };

  span(lanes[0]!.y, 0, t, rgba(WHITE, 0.42 * alpha));
  ctx.strokeStyle = rgba(WHITE, 0.5 * alpha);
  ctx.beginPath();
  for (let c = 0; c <= t; c += HEADCAM_CAPTURE_S) {
    ctx.moveTo(Math.round(at(c)) + 0.5, lanes[1]!.y - 2); ctx.lineTo(Math.round(at(c)) + 0.5, lanes[1]!.y + 3);
  }
  ctx.stroke();
  for (let f = 0; f < t; f += DRONE_ORBIT_S) span(lanes[2]!.y, f + 1, Math.min(t, f + DRONE_ORBIT_S - 1), rgba(WHITE, 0.42 * alpha));

  span(recordY, 0, t, rgba(SIGNAL, 0.75 * alpha));
  for (let k = 1; k <= LEVELS && k * LEVEL_S <= t; k++) {
    const x = at(k * LEVEL_S), fresh = Math.exp(-(t - k * LEVEL_S) / 2);
    ctx.fillStyle = rgba(SIGNAL, alpha);
    ctx.beginPath(); ctx.moveTo(x, recordY - 3); ctx.lineTo(x + 3.5, recordY + 0.5); ctx.lineTo(x, recordY + 4); ctx.lineTo(x - 3.5, recordY + 0.5); ctx.fill();
    if (fresh > 0.05) { ctx.strokeStyle = rgba(SIGNAL, 0.6 * fresh * alpha); ctx.beginPath(); ctx.arc(x, recordY + 0.5, 4 + 7 * (1 - fresh), 0, Math.PI * 2); ctx.stroke(); }
  }

  ctx.strokeStyle = rgba(WHITE, 0.6 * alpha);
  ctx.beginPath(); ctx.moveTo(Math.round(xp) + 0.5, y0 - 7); ctx.lineTo(Math.round(xp) + 0.5, recordY + 6); ctx.stroke();
  const minutes = DAY_START_MIN + Math.floor((t / LOOP_S) * DAY_SPAN_MIN);
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  ctx.textAlign = xp > x1 - 40 ? "right" : "left";
  ctx.fillStyle = rgba(WHITE, 0.5 * alpha);
  ctx.fillText(clock, xp + (ctx.textAlign === "right" ? -5 : 5), y0 - 9);
  ctx.textAlign = "left";
}
