import { BONES, L, visible } from "./lib/analysis";
import { SAMPLE_HOLDS } from "./lib/samples";
import type { Landmark } from "./lib/types";

const ARMS: number[] = [L.le, L.lw, L.re, L.rw];
const ARM_BONES = new Set(["11-13", "13-15", "12-14", "14-16"]);

/** Draws the tracked skeleton. `flagArms` paints the arms in the accent color at a flagged moment. */
export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: (Landmark | undefined)[] | null, W: number, H: number, flagArms = false) {
  if (!lm) return;
  // Size the lines and joints to the climber, who is often small in a phone clip.
  let size = W / 70;
  const ls = lm[L.ls], lh = lm[L.lh];
  if (visible(ls) && visible(lh)) size = Math.max(2.5, Math.min(size, Math.hypot((ls.x - lh.x) * W, (ls.y - lh.y) * H) * 0.09));
  const line = Math.max(2, size * 0.75);
  ctx.lineCap = "round";
  ctx.lineWidth = line;
  for (const [a, b] of BONES) {
    const p = lm[a], q = lm[b];
    if (!visible(p) || !visible(q)) continue;
    ctx.strokeStyle = flagArms && ARM_BONES.has(`${a}-${b}`) ? "#F07A65" : "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(p.x * W, p.y * H);
    ctx.lineTo(q.x * W, q.y * H);
    ctx.stroke();
  }
  for (const i of Object.values(L)) {
    const p = lm[i];
    if (!visible(p)) continue;
    ctx.fillStyle = flagArms && ARMS.includes(i) ? "#F07A65" : "#FFFFFF";
    ctx.strokeStyle = "#12142A";
    ctx.lineWidth = Math.max(1, size * 0.3);
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = line;
  }
}

/** The backdrop for sample attempts: a dark wall with the route's holds. */
export function drawWall(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = "#1B1E3A";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = W / 6; x < W; x += W / 6) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = H / 8; y < H; y += H / 8) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (const h of SAMPLE_HOLDS) {
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.ellipse(h.x * W, h.y * H, h.small ? 9 : 14, h.small ? 7 : 11, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 12px 'Geist', system-ui, sans-serif";
  ctx.fillText("Sample animation · Blue V4", 10, H - 10);
}
