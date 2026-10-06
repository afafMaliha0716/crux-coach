import type { FindingId, Frame, Landmark, Metrics } from "./types";

/** MediaPipe Pose landmark indices used by the analysis. */
export const L = { ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 } as const;

export const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

export const RULES = {
  /** Ignore a landmark below this visibility. */
  minVisibility: 0.5,
  /** Elbow angle (degrees) at the furthest reach that counts as full extension. */
  fullExtensionAngle: 160,
  /** Reach height (torso lengths) the furthest reach must exceed to count. */
  fullExtensionReach: 0.9,
  /** Seconds before the furthest reach in which a high foot counts. */
  highFootWindowS: 3,
  /** A knee counts as high when it is above its hip by this share of the torso. */
  highFootMargin: 0.05,
  /** A hand counts as overhead above this reach height. */
  overheadReach: 0.3,
  /** Elbow angle (degrees) below which an overhead arm counts as bent. */
  bentAngle: 95,
  /** Share of overhead time on bent arms that flags the attempt. */
  bentShare: 0.65,
  /** Reject the clip when fewer than this share of frames have a usable pose. */
  minUsableShare: 0.3,
  minUsableFrames: 5,
  /** The mat level is this percentile of how low the feet get during the clip. */
  groundPercentile: 0.95,
  /** The climber is on the wall when their lowest foot is this many torso lengths above the mat. */
  offGroundMargin: 0.5,
  /** If fewer than this share of frames are off the mat, the clip has no mat level and every frame counts. */
  minOnWallShare: 0.3,
} as const;

export interface Analysis extends Metrics {
  findings: FindingId[];
  usableFrames: number;
}

type Pt = { x: number; y: number };

export function visible(p: Landmark | undefined): p is Landmark {
  return !!p && (p.visibility === undefined || p.visibility > RULES.minVisibility);
}

/** Angle at b, in degrees, between the segments b-a and b-c. */
export function angle(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!d) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))) * 180) / Math.PI;
}

interface Measured {
  t: number;
  torso: number;
  /** Lowest foot in the frame, in pixels (larger = lower on screen). Undefined when no ankle is visible. */
  foot?: number;
  arms: { reach: number; ang: number }[];
  high: boolean;
}

/**
 * Keeps only the frames where the climber is on the wall. Real clips usually start
 * with the climber standing on the mat, often with straight arms on the start holds,
 * and end with them back on the mat. Those frames must not count as a reach.
 * The mat level is taken as the lowest the feet get during the clip.
 */
export function onWallFrames<T extends { torso: number; foot?: number }>(frames: T[]): T[] {
  const feet = frames.map((f) => f.foot).filter((y): y is number => y !== undefined).sort((p, q) => p - q);
  if (!feet.length) return frames;
  const ground = feet[Math.min(feet.length - 1, Math.floor(feet.length * RULES.groundPercentile))];
  const on = frames.filter((f) => f.foot === undefined || f.foot < ground - RULES.offGroundMargin * f.torso);
  // A clip filmed entirely on the wall (or entirely on the ground) has no mat level to find: use every frame.
  return on.length >= frames.length * RULES.minOnWallShare ? on : frames;
}

/**
 * Measures an attempt from pose frames. Landmarks are normalized (0 to 1), so the
 * video's pixel width and height are needed to measure true angles.
 * Returns null when the clip has too few usable frames.
 */
export function analyze(frames: Frame[], width: number, height: number): Analysis | null {
  const px = (p: Landmark): Pt => ({ x: p.x * width, y: p.y * height });
  const measured: Measured[] = [];

  for (const f of frames) {
    const m = f.lm;
    if (!m) continue;
    const ls0 = m[L.ls], rs0 = m[L.rs], lh0 = m[L.lh], rh0 = m[L.rh];
    if (!visible(ls0) || !visible(rs0) || !visible(lh0) || !visible(rh0)) continue;
    const ls = px(ls0), rs = px(rs0), lh = px(lh0), rh = px(rh0);
    const torso = Math.hypot((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2) || 1;

    const arms: Measured["arms"] = [];
    for (const [si, ei, wi] of [[L.ls, L.le, L.lw], [L.rs, L.re, L.rw]] as const) {
      const s0 = m[si], e0 = m[ei], w0 = m[wi];
      if (!visible(s0) || !visible(e0) || !visible(w0)) continue;
      const s = px(s0), e = px(e0), w = px(w0);
      arms.push({ reach: (s.y - w.y) / torso, ang: angle(s, e, w) });
    }

    let high = false;
    for (const [hi, ki] of [[L.lh, L.lk], [L.rh, L.rk]] as const) {
      const h0 = m[hi], k0 = m[ki];
      if (visible(h0) && visible(k0) && px(k0).y < px(h0).y - RULES.highFootMargin * torso) high = true;
    }

    const ankles = [m[L.la], m[L.ra]].filter(visible).map((p) => px(p).y);
    measured.push({ t: f.t, torso, foot: ankles.length ? Math.max(...ankles) : undefined, arms, high });
  }

  const usable = measured.length;
  if (usable < frames.length * RULES.minUsableShare || usable < RULES.minUsableFrames) return null;

  let peak: { reach: number; ang: number; t: number } | null = null;
  let overhead = 0, bent = 0;
  const climbing = onWallFrames(measured);
  for (const f of climbing) {
    let minOverhead: number | null = null;
    for (const a of f.arms) {
      if (!peak || a.reach > peak.reach) peak = { reach: a.reach, ang: a.ang, t: f.t };
      if (a.reach > RULES.overheadReach) minOverhead = minOverhead === null ? a.ang : Math.min(minOverhead, a.ang);
    }
    if (minOverhead !== null) {
      overhead++;
      if (minOverhead < RULES.bentAngle) bent++;
    }
  }
  if (!peak) return null;
  const pk = peak;
  const highFoot = climbing.some((x) => x.high && x.t <= pk.t + 0.1 && x.t >= pk.t - RULES.highFootWindowS);
  const bentShare = overhead ? bent / overhead : 0;
  const findings: FindingId[] = [];
  if (pk.ang >= RULES.fullExtensionAngle && pk.reach >= RULES.fullExtensionReach) findings.push("reach");
  if (bentShare > RULES.bentShare) findings.push("bent");
  return { peakAngle: pk.ang, peakReach: pk.reach, peakT: pk.t, highFoot, bentShare, findings, usableFrames: usable };
}
