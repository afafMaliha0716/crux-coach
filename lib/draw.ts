import { BONES, LM, isVisible } from "./analysis";
import { SAMPLE_HOLDS } from "./samples";
import type { Landmark } from "./types";

type Pose = (Landmark | undefined)[] | null;

interface Palette {
  surface: string;
  line: string;
  ink: string;
  muted: string;
  accent: string;
}

/** Reads the current theme's colors so canvas drawing matches the page. */
export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    surface: get("--surface"),
    line: get("--line"),
    ink: get("--ink"),
    muted: get("--muted"),
    accent: get("--accent"),
  };
}

/** The wall behind the sample animation: a flat panel, a faint grid, and the holds. */
export function drawSampleWall(ctx: CanvasRenderingContext2D, w: number, h: number, palette: Palette) {
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  for (let x = w / 6; x < w; x += w / 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = h / 8; y < h; y += h / 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (const hold of SAMPLE_HOLDS) {
    ctx.fillStyle = hold.color;
    ctx.beginPath();
    ctx.ellipse(hold.x * w, hold.y * h, hold.small ? w / 40 : w / 26, hold.small ? w / 52 : w / 33, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Which arm is reaching higher in this pose: its shoulder, elbow and wrist indices. */
export function reachingArm(pose: Pose): number[] {
  if (!pose) return [];
  const left = pose[LM.leftWrist];
  const right = pose[LM.rightWrist];
  const leftArm = [LM.leftShoulder, LM.leftElbow, LM.leftWrist];
  const rightArm = [LM.rightShoulder, LM.rightElbow, LM.rightWrist];
  if (!isVisible(left)) return rightArm;
  if (!isVisible(right)) return leftArm;
  return left.y < right.y ? leftArm : rightArm;
}

/**
 * Draws the skeleton. Joints listed in `highlight` and the bones between them
 * are drawn in the accent color: this is the flagged joint at the flagged moment.
 * `onVideo` switches to white lines with a dark edge so they read over footage.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose,
  w: number,
  h: number,
  palette: Palette,
  options: { highlight?: number[]; onVideo?: boolean } = {},
) {
  if (!pose) return;
  const { highlight = [], onVideo = false } = options;
  const base = onVideo ? "#ffffff" : palette.ink;
  const width = Math.max(3, w / 90);
  ctx.lineCap = "round";

  const line = (a: Landmark, b: Landmark, color: string, lineWidth: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  };

  for (const [i, j] of BONES) {
    const a = pose[i];
    const b = pose[j];
    if (!isVisible(a) || !isVisible(b)) continue;
    const hot = highlight.includes(i) && highlight.includes(j);
    if (onVideo) line(a, b, "rgba(0,0,0,0.45)", width + 3);
    line(a, b, hot ? palette.accent : base, hot ? width + 1 : width);
  }

  for (const index of Object.values(LM)) {
    const point = pose[index];
    if (!isVisible(point)) continue;
    const hot = highlight.includes(index);
    ctx.fillStyle = hot ? palette.accent : base;
    ctx.beginPath();
    ctx.arc(point.x * w, point.y * h, hot ? width * 1.5 : width * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}
