/**
 * Vector content for the story's two upper layers.
 * drawPlan paints the 2D drawing the footage is mapped to, in one colour.
 * drawInsights paints what Openbox read from the footage, placed on that drawing.
 */

export type DrawingKind = "progress" | "security" | "safety";

export interface PlanStyle {
  line: string;
  faint: string;
  fill: string;
  text: string;
  font: string;
}

export interface InsightStyle {
  line: string;
  ok: string;
  okFill: string;
  alert: string;
  alertFill: string;
}

/** Steel bays complete by the end of each day, Monday to today, out of BAY_COLS x BAY_ROWS. */
export const BAYS_BY_DAY = [2, 3, 4, 5, 6, 7, 8];
const BAY_COLS = 6;
const BAY_ROWS = 4;
export const BAY_TOTAL = BAY_COLS * BAY_ROWS;
/** Days, Monday = 0, with plant in use after hours. */
export const SECURITY_ALERT_DAYS = [3, 6];
/** Where the working excavator sits in the security footage, 0 to 1 from the top-left. */
const PLANT_AT = [0.63, 0.8] as const;
/** People checked on the walk each day, Monday to today. All pass: the footage shows real people. */
export const PEOPLE_BY_DAY = [3, 2, 4, 2, 3, 3, 2];
const PEOPLE_AT: readonly (readonly [number, number])[] = [[0.47, 0.63], [0.63, 0.61], [0.82, 0.74], [0.34, 0.8]];

type Ctx = CanvasRenderingContext2D;

interface Grid {
  x0: number;
  y0: number;
  bw: number;
  bh: number;
}

const bayGrid = (w: number, h: number): Grid => ({ x0: w * 0.08, y0: h * 0.17, bw: (w * 0.84) / BAY_COLS, bh: (h * 0.62) / BAY_ROWS });

function hatch(ctx: Ctx, x: number, y: number, w: number, h: number, colour: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let d = -h; d < w; d += 9) {
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
  }
  ctx.stroke();
  ctx.restore();
}

function label(ctx: Ctx, text: string, x: number, y: number, s: PlanStyle, align: CanvasTextAlign = "left"): void {
  ctx.font = s.font;
  ctx.fillStyle = s.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

/** Plan geometry stays above this share of the sheet's height, so the title block below it is never covered. */
const PLAN_FLOOR = 0.84;

/** Below this plate width (phones) the title is left out: the insight tags need the room. */
const TITLE_MIN_WIDTH = 360;

/** The sheet's title sits in the bottom margin, below both the plan and the footage plate behind it. */
function titleBlock(ctx: Ctx, w: number, h: number, sheet: string, s: PlanStyle): void {
  ctx.font = s.font;
  const boxW = ctx.measureText(sheet).width + 20;
  ctx.strokeStyle = s.faint;
  ctx.lineWidth = 1;
  ctx.strokeRect(w - boxW - 14, h - 31, boxW, 22);
  label(ctx, sheet, w - boxW - 4, h - 19.5, s);
}

function planProgress(ctx: Ctx, w: number, h: number, s: PlanStyle): void {
  const { x0, y0, bw, bh } = bayGrid(w, h);
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= BAY_COLS; c++) {
    ctx.moveTo(x0 + c * bw, y0 - 10);
    ctx.lineTo(x0 + c * bw, y0 + BAY_ROWS * bh + 10);
  }
  for (let r = 0; r <= BAY_ROWS; r++) {
    ctx.moveTo(x0 - 10, y0 + r * bh);
    ctx.lineTo(x0 + BAY_COLS * bw + 10, y0 + r * bh);
  }
  ctx.stroke();
  ctx.fillStyle = s.line;
  for (let c = 0; c <= BAY_COLS; c++) for (let r = 0; r <= BAY_ROWS; r++) ctx.fillRect(x0 + c * bw - 2.5, y0 + r * bh - 2.5, 5, 5);
  for (let c = 0; c < BAY_COLS; c++) label(ctx, String.fromCharCode(65 + c), x0 + (c + 0.5) * bw, y0 - 20, s, "center");
  for (let r = 0; r < BAY_ROWS; r++) label(ctx, String(r + 1), x0 - 22, y0 + (r + 0.5) * bh, s, "center");
}

function planSecurity(ctx: Ctx, w: number, h: number, s: PlanStyle): void {
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1;
  for (const [x, y, pw, ph, name] of [[0.52, 0.18, 0.28, 0.12, "PLOT 4"], [0.75, 0.4, 0.17, 0.12, "PLOT 5"], [0.05, 0.34, 0.29, 0.16, "PLOT 3"]] as const) {
    ctx.fillStyle = s.fill;
    ctx.fillRect(w * x, h * y, w * pw, h * ph);
    ctx.strokeRect(w * x, h * y, w * pw, h * ph);
    label(ctx, name, w * x + 8, h * y + 12, s);
  }

  ctx.strokeStyle = s.faint;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(w * 0.47, 0);
  ctx.lineTo(w * 0.47, h * 0.34);
  ctx.lineTo(w, h * 0.34);
  ctx.moveTo(w * 0.47, h * 0.34);
  ctx.quadraticCurveTo(w * 0.46, h * 0.6, w * 0.4, h * PLAN_FLOOR);
  ctx.stroke();

  ctx.strokeStyle = s.line;
  ctx.setLineDash([10, 4, 2, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.03, h * 0.05);
  ctx.lineTo(w * 0.03, h * PLAN_FLOOR);
  ctx.lineTo(w * 0.97, h * PLAN_FLOOR);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  for (const [cx, cy, a0, a1] of [[0.95, 0.78, 3.4, 4.2], [0.05, 0.08, 0.25, 1.05]] as const) {
    ctx.beginPath();
    ctx.moveTo(w * cx, h * cy);
    ctx.arc(w * cx, h * cy, w * 0.2, a0, a1);
    ctx.closePath();
    ctx.fillStyle = s.fill;
    ctx.fill();
    ctx.strokeStyle = s.faint;
    ctx.stroke();
    ctx.fillStyle = s.line;
    ctx.fillRect(w * cx - 4, h * cy - 4, 8, 8);
  }
  label(ctx, "GATE 2", w * 0.49, h * 0.06, s);
  label(ctx, "HAUL ROAD", w * 0.5, h * 0.37, s);
  label(ctx, "FENCE LINE", w * 0.27, h * 0.79, s);
}

function planSafety(ctx: Ctx, w: number, h: number, s: PlanStyle): void {
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.36, h * 0.1, w * 0.4, h * 0.44);
  ctx.strokeRect(w * 0.76, h * 0.2, w * 0.14, h * 0.3);
  ctx.strokeStyle = s.faint;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(w * (0.36 + i * 0.1), h * 0.1);
    ctx.lineTo(w * (0.36 + i * 0.1), h * 0.54);
  }
  ctx.stroke();
  hatch(ctx, w * 0.08, h * 0.3, w * 0.22, h * 0.26, s.faint);
  ctx.strokeStyle = s.line;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(w * 0.08, h * 0.3, w * 0.22, h * 0.26);
  ctx.setLineDash([]);
  label(ctx, "EXCLUSION ZONE", w * 0.09, h * 0.26, s);
  label(ctx, "BLOCK B", w * 0.4, h * 0.17, s);
}

/** The drawing layer: plan geometry only, in the sheet's single colour. */
export function drawPlan(ctx: Ctx, kind: DrawingKind, sheet: string, w: number, h: number, style: PlanStyle): void {
  if (kind === "progress") planProgress(ctx, w, h, style);
  else if (kind === "security") planSecurity(ctx, w, h, style);
  else planSafety(ctx, w, h, style);
  if (w >= TITLE_MIN_WIDTH) titleBlock(ctx, w, h, sheet, style);
}

function insightProgress(ctx: Ctx, w: number, h: number, day: number, s: InsightStyle): void {
  const { x0, y0, bw, bh } = bayGrid(w, h);
  const done = BAYS_BY_DAY[day];
  const before = day > 0 ? BAYS_BY_DAY[day - 1] : 0;
  for (let k = 0; k < done; k++) {
    const x = x0 + (BAY_COLS - 1 - Math.floor(k / BAY_ROWS)) * bw;
    const y = y0 + (k % BAY_ROWS) * bh;
    ctx.fillStyle = s.okFill;
    ctx.fillRect(x, y, bw, bh);
    if (k < before) continue;
    ctx.strokeStyle = s.ok;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  hatch(ctx, x0, y0 + bh * 3, bw * 1.5, bh, s.alertFill);
}

function insightSecurity(ctx: Ctx, w: number, h: number, day: number, now: number, s: InsightStyle): void {
  if (!SECURITY_ALERT_DAYS.includes(day)) return;
  const pulse = 0.5 + 0.5 * Math.sin(now / 320);
  ctx.strokeStyle = s.alert;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w * PLANT_AT[0], h * PLANT_AT[1], 9 + pulse * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = s.alert;
  ctx.beginPath();
  ctx.arc(w * PLANT_AT[0], h * PLANT_AT[1], 5, 0, Math.PI * 2);
  ctx.fill();
}

function insightSafety(ctx: Ctx, w: number, h: number, day: number, s: InsightStyle): void {
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.94);
  ctx.bezierCurveTo(w * 0.3, h * 0.9, w * 0.36, h * 0.74, w * 0.56, h * 0.72);
  ctx.bezierCurveTo(w * 0.72, h * 0.7, w * 0.82, h * 0.78, w * 0.94, h * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = s.line;
  ctx.fillRect(w * 0.56 - 4, h * 0.72 - 4, 8, 8);

  for (const [px, py] of PEOPLE_AT.slice(0, PEOPLE_BY_DAY[day])) {
    ctx.strokeStyle = s.ok;
    ctx.fillStyle = s.okFill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w * px, h * py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** The insights layer: what was found on the chosen day, placed on the plan. */
export function drawInsights(ctx: Ctx, kind: DrawingKind, w: number, h: number, day: number, now: number, style: InsightStyle): void {
  if (kind === "progress") insightProgress(ctx, w, h, day, style);
  else if (kind === "security") insightSecurity(ctx, w, h, day, now, style);
  else insightSafety(ctx, w, h, day, style);
}
