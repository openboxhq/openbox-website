/** Vector drawing sheets for the story's middle layer: the 2D plan that the footage is mapped to. */

export type DrawingKind = "progress" | "security" | "safety";

export interface DrawingStyle {
  line: string;
  faint: string;
  ok: string;
  okFill: string;
  coneFill: string;
  alert: string;
  alertFill: string;
  text: string;
  font: string;
}

/** Steel bays erected by the end of each day, Monday to today, out of BAY_COLS x BAY_ROWS. */
export const BAYS_BY_DAY = [2, 3, 4, 5, 6, 7, 8];
const BAY_COLS = 6;
const BAY_ROWS = 4;
export const BAY_TOTAL = BAY_COLS * BAY_ROWS;
/** Days, Monday = 0, with an after-hours vehicle at the gate. */
export const SECURITY_ALERT_DAYS = [3, 6];
/** Days with a hard hat missing on the walk. */
export const SAFETY_FLAG_DAYS = [2];

type Ctx = CanvasRenderingContext2D;

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

function titleBlock(ctx: Ctx, w: number, h: number, sheet: string, s: DrawingStyle): void {
  ctx.font = s.font;
  const boxW = ctx.measureText(sheet).width + 20;
  ctx.strokeStyle = s.faint;
  ctx.strokeRect(w - boxW - 14, h - 36, boxW, 22);
  ctx.fillStyle = s.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(sheet, w - boxW - 4, h - 24.5);
}

function drawProgress(ctx: Ctx, w: number, h: number, day: number, s: DrawingStyle): void {
  const x0 = w * 0.08;
  const y0 = h * 0.17;
  const bw = (w * 0.84) / BAY_COLS;
  const bh = (h * 0.62) / BAY_ROWS;
  const done = BAYS_BY_DAY[day];
  const before = day > 0 ? BAYS_BY_DAY[day - 1] : 0;
  for (let k = 0; k < BAY_TOTAL; k++) {
    const col = BAY_COLS - 1 - Math.floor(k / BAY_ROWS);
    const row = k % BAY_ROWS;
    const x = x0 + col * bw;
    const y = y0 + row * bh;
    if (k >= done) continue;
    ctx.fillStyle = s.okFill;
    ctx.fillRect(x, y, bw, bh);
    if (k < before) continue;
    ctx.strokeStyle = s.ok;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, bw - 6, bh - 6);
  }
  hatch(ctx, x0, y0 + bh * 3, bw * 1.5, bh, s.alertFill);
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
  ctx.font = s.font;
  ctx.fillStyle = s.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let c = 0; c < BAY_COLS; c++) ctx.fillText(String.fromCharCode(65 + c), x0 + (c + 0.5) * bw, y0 - 20);
  for (let r = 0; r < BAY_ROWS; r++) ctx.fillText(String(r + 1), x0 - 22, y0 + (r + 0.5) * bh);
  ctx.textAlign = "left";
}

function drawSecurity(ctx: Ctx, w: number, h: number, day: number, now: number, s: DrawingStyle): void {
  ctx.strokeStyle = s.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.1);
  ctx.lineTo(w * 0.74, h * 0.14);
  ctx.lineTo(w * 0.74, h * 0.44);
  ctx.lineTo(w * 0.12, h * 0.38);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = s.coneFill;
  ctx.fill();

  ctx.setLineDash([10, 4, 2, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.46);
  ctx.lineTo(w * 0.46, h * 0.55);
  ctx.moveTo(w * 0.54, h * 0.565);
  ctx.lineTo(w * 0.96, h * 0.62);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  for (const [cx, cy, a0, a1] of [[0.92, 0.9, 3.5, 4.3], [0.06, 0.86, 5.1, 5.9]] as const) {
    ctx.beginPath();
    ctx.moveTo(w * cx, h * cy);
    ctx.arc(w * cx, h * cy, w * 0.2, a0, a1);
    ctx.closePath();
    ctx.fillStyle = s.coneFill;
    ctx.fill();
    ctx.strokeStyle = s.faint;
    ctx.stroke();
    ctx.fillStyle = s.line;
    ctx.fillRect(w * cx - 4, h * cy - 4, 8, 8);
  }

  ctx.font = s.font;
  ctx.fillStyle = s.text;
  ctx.textBaseline = "middle";
  ctx.fillText("GATE 2", w * 0.47, h * 0.62);
  ctx.fillText("BLOCK A", w * 0.16, h * 0.17);

  if (SECURITY_ALERT_DAYS.includes(day)) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 320);
    ctx.strokeStyle = s.alert;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.6, 9 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = s.alert;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSafety(ctx: Ctx, w: number, h: number, day: number, s: DrawingStyle): void {
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

  hatch(ctx, w * 0.08, h * 0.3, w * 0.22, h * 0.26, s.alertFill);
  ctx.strokeStyle = s.alert;
  ctx.strokeRect(w * 0.08, h * 0.3, w * 0.22, h * 0.26);

  ctx.strokeStyle = s.line;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h * 0.94);
  ctx.bezierCurveTo(w * 0.3, h * 0.9, w * 0.36, h * 0.74, w * 0.56, h * 0.72);
  ctx.bezierCurveTo(w * 0.72, h * 0.7, w * 0.82, h * 0.78, w * 0.94, h * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = s.line;
  ctx.fillRect(w * 0.56 - 4, h * 0.72 - 4, 8, 8);

  const flagged = SAFETY_FLAG_DAYS.includes(day);
  for (const [px, py, bad] of [[0.47, 0.63, flagged], [0.63, 0.61, false]] as const) {
    ctx.strokeStyle = bad ? s.alert : s.ok;
    ctx.fillStyle = bad ? s.alertFill : s.okFill;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w * px, h * py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.font = s.font;
  ctx.fillStyle = s.text;
  ctx.textBaseline = "middle";
  ctx.fillText("EXCLUSION ZONE", w * 0.09, h * 0.26);
  ctx.fillText("WALK ROUTE", w * 0.62, h * 0.8);
}

export function drawSheet(ctx: Ctx, kind: DrawingKind, sheet: string, w: number, h: number, day: number, now: number, style: DrawingStyle): void {
  if (kind === "progress") drawProgress(ctx, w, h, day, style);
  else if (kind === "security") drawSecurity(ctx, w, h, day, now, style);
  else drawSafety(ctx, w, h, day, style);
  titleBlock(ctx, w, h, sheet, style);
}
