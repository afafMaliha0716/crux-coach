import { LM } from "./analysis";
import type { Landmark, PoseFrame } from "./types";

/**
 * Two sample attempts on Blue V4, as an animated stick figure.
 *
 * They are generated as pose frames and go through the same analysis as real
 * video, so they double as demo material and as test fixtures:
 *
 *   "fall"  reaches the crux hold with a straight arm and both feet low, then falls.
 *   "send"  sets a high right foot first, reaches with a bent arm, and tops out.
 */
export type SampleId = "fall" | "send";

interface Point {
  x: number;
  y: number;
}

interface Keyframe {
  t: number;
  hip: Point;
  leftHand: Point;
  rightHand: Point;
  leftFoot: Point;
  rightFoot: Point;
}

export const SAMPLE_WIDTH = 360;
export const SAMPLE_HEIGHT = 480;
const FPS = 30;

/** The holds drawn behind the figure. The crux is the long move to the sloper. */
export const SAMPLE_HOLDS: { x: number; y: number; color: string; small?: boolean }[] = [
  { x: 0.38, y: 0.55, color: "#4F7FC4" },
  { x: 0.56, y: 0.52, color: "#4F7FC4" },
  { x: 0.42, y: 0.4, color: "#4F7FC4" },
  { x: 0.66, y: 0.22, color: "#4F7FC4" },
  { x: 0.55, y: 0.1, color: "#4F7FC4" },
  { x: 0.4, y: 0.86, color: "#4F7FC4" },
  { x: 0.58, y: 0.84, color: "#4F7FC4" },
  { x: 0.62, y: 0.62, color: "#4E9A5B", small: true },
];

const p = (x: number, y: number): Point => ({ x, y });

const KEYFRAMES: Record<SampleId, Keyframe[]> = {
  fall: [
    { t: 0, hip: p(0.48, 0.7), leftHand: p(0.38, 0.55), rightHand: p(0.56, 0.52), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 1.5, hip: p(0.47, 0.63), leftHand: p(0.42, 0.4), rightHand: p(0.56, 0.52), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 3.0, hip: p(0.5, 0.63), leftHand: p(0.42, 0.4), rightHand: p(0.66, 0.22), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 3.9, hip: p(0.5, 0.63), leftHand: p(0.42, 0.4), rightHand: p(0.66, 0.22), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 4.6, hip: p(0.5, 0.9), leftHand: p(0.44, 0.62), rightHand: p(0.6, 0.6), leftFoot: p(0.44, 1.12), rightFoot: p(0.58, 1.12) },
    { t: 5.2, hip: p(0.5, 0.9), leftHand: p(0.44, 0.62), rightHand: p(0.6, 0.6), leftFoot: p(0.44, 1.12), rightFoot: p(0.58, 1.12) },
  ],
  send: [
    { t: 0, hip: p(0.48, 0.7), leftHand: p(0.38, 0.55), rightHand: p(0.56, 0.52), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 1.5, hip: p(0.47, 0.63), leftHand: p(0.42, 0.4), rightHand: p(0.56, 0.52), leftFoot: p(0.4, 0.86), rightFoot: p(0.58, 0.84) },
    { t: 2.7, hip: p(0.49, 0.62), leftHand: p(0.42, 0.4), rightHand: p(0.56, 0.52), leftFoot: p(0.4, 0.86), rightFoot: p(0.62, 0.62) },
    { t: 4.1, hip: p(0.54, 0.5), leftHand: p(0.42, 0.4), rightHand: p(0.66, 0.22), leftFoot: p(0.47, 0.78), rightFoot: p(0.62, 0.62) },
    { t: 5.2, hip: p(0.54, 0.46), leftHand: p(0.55, 0.1), rightHand: p(0.66, 0.22), leftFoot: p(0.47, 0.74), rightFoot: p(0.62, 0.62) },
    { t: 5.8, hip: p(0.54, 0.46), leftHand: p(0.55, 0.1), rightHand: p(0.66, 0.22), leftFoot: p(0.47, 0.74), rightFoot: p(0.62, 0.62) },
  ],
};

export const SAMPLE_OUTCOME: Record<SampleId, "sent" | "fell"> = { fall: "fell", send: "sent" };

/**
 * Two-bone inverse kinematics: where the middle joint (elbow or knee) sits
 * for a limb of lengths l1 and l2 running from `root` toward `target`.
 * A target out of reach is pulled in to full extension.
 */
function solveLimb(root: Point, target: Point, l1: number, l2: number, bendUp: boolean) {
  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let d = Math.hypot(dx, dy) || 1e-6;
  const max = l1 + l2 - 1e-4;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const theta = Math.atan2(dy, dx);
  const j1 = { x: root.x + l1 * Math.cos(theta + a), y: root.y + l1 * Math.sin(theta + a) };
  const j2 = { x: root.x + l1 * Math.cos(theta - a), y: root.y + l1 * Math.sin(theta - a) };
  const joint = (bendUp ? j1.y < j2.y : j1.y > j2.y) ? j1 : j2;
  return { joint, end: { x: root.x + dx, y: root.y + dy } };
}

/** Builds the 33-landmark array for a pose given the hips, hands and feet. */
function figure(k: Omit<Keyframe, "t">): Landmark[] {
  const lm: Landmark[] = [];
  const set = (index: number, point: Point) => {
    lm[index] = { x: point.x, y: point.y, visibility: 1 };
  };
  const torso = 0.2;
  const shoulderHalf = 0.06;
  const hipHalf = 0.045;
  const ls = { x: k.hip.x - shoulderHalf, y: k.hip.y - torso };
  const rs = { x: k.hip.x + shoulderHalf, y: k.hip.y - torso };
  const lh = { x: k.hip.x - hipHalf, y: k.hip.y };
  const rh = { x: k.hip.x + hipHalf, y: k.hip.y };
  set(LM.leftShoulder, ls);
  set(LM.rightShoulder, rs);
  set(LM.leftHip, lh);
  set(LM.rightHip, rh);

  let limb = solveLimb(ls, k.leftHand, 0.11, 0.11, false);
  set(LM.leftElbow, limb.joint);
  set(LM.leftWrist, limb.end);
  limb = solveLimb(rs, k.rightHand, 0.11, 0.11, false);
  set(LM.rightElbow, limb.joint);
  set(LM.rightWrist, limb.end);
  limb = solveLimb(lh, k.leftFoot, 0.15, 0.15, true);
  set(LM.leftKnee, limb.joint);
  set(LM.leftAnkle, limb.end);
  limb = solveLimb(rh, k.rightFoot, 0.15, 0.15, true);
  set(LM.rightKnee, limb.joint);
  set(LM.rightAnkle, limb.end);
  return lm;
}

/** The pose at time t, eased between the two surrounding keyframes. */
function poseAt(keys: Keyframe[], t: number): Omit<Keyframe, "t"> {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  let u = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
  u = u * u * (3 - 2 * u);
  const mix = (from: Point, to: Point): Point => ({
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u,
  });
  return {
    hip: mix(a.hip, b.hip),
    leftHand: mix(a.leftHand, b.leftHand),
    rightHand: mix(a.rightHand, b.rightHand),
    leftFoot: mix(a.leftFoot, b.leftFoot),
    rightFoot: mix(a.rightFoot, b.rightFoot),
  };
}

/** Pose frames for a sample attempt at 30 frames per second. */
export function sampleFrames(id: SampleId): PoseFrame[] {
  const keys = KEYFRAMES[id];
  const end = keys[keys.length - 1].t;
  const frames: PoseFrame[] = [];
  // Step by frame index so times do not drift from accumulated float error.
  for (let n = 0; n / FPS <= end; n++) {
    const t = n / FPS;
    frames.push({ t, landmarks: figure(poseAt(keys, t)) });
  }
  return frames;
}
