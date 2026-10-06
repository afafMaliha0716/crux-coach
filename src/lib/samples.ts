import { L } from "./analysis";
import type { Frame, Landmark } from "./types";

/**
 * Two animated sample attempts on Blue V4. They are built from keyframes with simple
 * two-bone inverse kinematics and produce the same landmark format as real video,
 * so they run through exactly the same analysis.
 */
type Pt = { x: number; y: number };
interface Key { t: number; hip: Pt; lh: Pt; rh: Pt; lf: Pt; rf: Pt }

export const SAMPLE_SIZE = { width: 360, height: 480 };

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

const P = (x: number, y: number): Pt => ({ x, y });

const KEYS: Record<"fall" | "send", Key[]> = {
  fall: [
    { t: 0, hip: P(0.48, 0.7), lh: P(0.38, 0.55), rh: P(0.56, 0.52), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 1.5, hip: P(0.47, 0.63), lh: P(0.42, 0.4), rh: P(0.56, 0.52), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 3.0, hip: P(0.5, 0.63), lh: P(0.42, 0.4), rh: P(0.66, 0.22), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 3.9, hip: P(0.5, 0.63), lh: P(0.42, 0.4), rh: P(0.66, 0.22), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 4.6, hip: P(0.5, 0.9), lh: P(0.44, 0.62), rh: P(0.6, 0.6), lf: P(0.44, 1.12), rf: P(0.58, 1.12) },
    { t: 5.2, hip: P(0.5, 0.9), lh: P(0.44, 0.62), rh: P(0.6, 0.6), lf: P(0.44, 1.12), rf: P(0.58, 1.12) },
  ],
  send: [
    { t: 0, hip: P(0.48, 0.7), lh: P(0.38, 0.55), rh: P(0.56, 0.52), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 1.5, hip: P(0.47, 0.63), lh: P(0.42, 0.4), rh: P(0.56, 0.52), lf: P(0.4, 0.86), rf: P(0.58, 0.84) },
    { t: 2.7, hip: P(0.49, 0.62), lh: P(0.42, 0.4), rh: P(0.56, 0.52), lf: P(0.4, 0.86), rf: P(0.62, 0.62) },
    { t: 4.1, hip: P(0.54, 0.5), lh: P(0.42, 0.4), rh: P(0.66, 0.22), lf: P(0.47, 0.78), rf: P(0.62, 0.62) },
    { t: 5.2, hip: P(0.54, 0.46), lh: P(0.55, 0.1), rh: P(0.66, 0.22), lf: P(0.47, 0.74), rf: P(0.62, 0.62) },
    { t: 5.8, hip: P(0.54, 0.46), lh: P(0.55, 0.1), rh: P(0.66, 0.22), lf: P(0.47, 0.74), rf: P(0.62, 0.62) },
  ],
};

function ik(root: Pt, target: Pt, l1: number, l2: number, jointUp: boolean): { joint: Pt; end: Pt } {
  let dx = target.x - root.x, dy = target.y - root.y;
  let d = Math.hypot(dx, dy) || 1e-6;
  const max = l1 + l2 - 1e-4;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const th = Math.atan2(dy, dx);
  const j1 = { x: root.x + l1 * Math.cos(th + a), y: root.y + l1 * Math.sin(th + a) };
  const j2 = { x: root.x + l1 * Math.cos(th - a), y: root.y + l1 * Math.sin(th - a) };
  const joint = (jointUp ? j1.y < j2.y : j1.y > j2.y) ? j1 : j2;
  return { joint, end: { x: root.x + dx, y: root.y + dy } };
}

function figure(k: Omit<Key, "t">): (Landmark | undefined)[] {
  const m: (Landmark | undefined)[] = [];
  const T = 0.2, sw = 0.06, hw = 0.045;
  const set = (i: number, p: Pt) => {
    m[i] = { x: p.x, y: p.y, visibility: 1 };
  };
  const ls = { x: k.hip.x - sw, y: k.hip.y - T }, rs = { x: k.hip.x + sw, y: k.hip.y - T };
  const lh = { x: k.hip.x - hw, y: k.hip.y }, rh = { x: k.hip.x + hw, y: k.hip.y };
  set(L.ls, ls); set(L.rs, rs); set(L.lh, lh); set(L.rh, rh);
  let r = ik(ls, k.lh, 0.11, 0.11, false); set(L.le, r.joint); set(L.lw, r.end);
  r = ik(rs, k.rh, 0.11, 0.11, false); set(L.re, r.joint); set(L.rw, r.end);
  r = ik(lh, k.lf, 0.15, 0.15, true); set(L.lk, r.joint); set(L.la, r.end);
  r = ik(rh, k.rf, 0.15, 0.15, true); set(L.rk, r.joint); set(L.ra, r.end);
  return m;
}

function keyAt(keys: Key[], t: number): Omit<Key, "t"> {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  let u = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)));
  u = u * u * (3 - 2 * u);
  const mix = (p: Pt, q: Pt) => ({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u });
  return { hip: mix(a.hip, b.hip), lh: mix(a.lh, b.lh), rh: mix(a.rh, b.rh), lf: mix(a.lf, b.lf), rf: mix(a.rf, b.rf) };
}

export type SampleId = "fall" | "send";

export function sampleFrames(which: SampleId, fps = 30): Frame[] {
  const keys = KEYS[which];
  const end = keys[keys.length - 1].t;
  const frames: Frame[] = [];
  for (let t = 0; t <= end; t += 1 / fps) frames.push({ t, lm: figure(keyAt(keys, t)) });
  return frames;
}
