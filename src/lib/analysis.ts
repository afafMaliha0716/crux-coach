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

/**
 * Measures an attempt from pose frames. Landmarks are normalized (0 to 1), so the
 * video's pixel width and height are needed to measure true angles.
 * Returns null when the clip has too few usable frames.
 */
export function analyze(frames: Frame[], width: number, height: number): Analysis | null {
  const px = (p: Landmark): Pt => ({ x: p.x * width, y: p.y * height });
  let peak: { reach: number; ang: number; t: number } | null = null;
  let overhead = 0, bent = 0, usable = 0;
  const feet: { t: number; high: boolean }[] = [];

  for (const f of frames) {
    const m = f.lm;
    if (!m) continue;
    const ls0 = m[L.ls], rs0 = m[L.rs], lh0 = m[L.lh], rh0 = m[L.rh];
    if (!visible(ls0) || !visible(rs0) || !visible(lh0) || !visible(rh0)) continue;
    usable++;
    const ls = px(ls0), rs = px(rs0), lh = px(lh0), rh = px(rh0);
    const torso = Math.hypot((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2) || 1;

    let minOverhead: number | null = null;
    for (const [si, ei, wi] of [[L.ls, L.le, L.lw], [L.rs, L.re, L.rw]] as const) {
      const s0 = m[si], e0 = m[ei], w0 = m[wi];
      if (!visible(s0) || !visible(e0) || !visible(w0)) continue;
      const s = px(s0), e = px(e0), w = px(w0);
      const reach = (s.y - w.y) / torso;
      const ang = angle(s, e, w);
      if (!peak || reach > peak.reach) peak = { reach, ang, t: f.t };
      if (reach > RULES.overheadReach) minOverhead = minOverhead === null ? ang : Math.min(minOverhead, ang);
    }
    if (minOverhead !== null) {
      overhead++;
      if (minOverhead < RULES.bentAngle) bent++;
    }

    let high = false;
    for (const [hi, ki] of [[L.lh, L.lk], [L.rh, L.rk]] as const) {
      const h0 = m[hi], k0 = m[ki];
      if (visible(h0) && visible(k0) && px(k0).y < px(h0).y - RULES.highFootMargin * torso) high = true;
    }
    feet.push({ t: f.t, high });
  }

  if (!peak || usable < frames.length * RULES.minUsableShare || usable < RULES.minUsableFrames) return null;
  const pk = peak;
  const highFoot = feet.some((x) => x.high && x.t <= pk.t + 0.1 && x.t >= pk.t - RULES.highFootWindowS);
  const bentShare = overhead ? bent / overhead : 0;
  const findings: FindingId[] = [];
  if (pk.ang >= RULES.fullExtensionAngle && pk.reach >= RULES.fullExtensionReach) findings.push("reach");
  if (bentShare > RULES.bentShare) findings.push("bent");
  return { peakAngle: pk.ang, peakReach: pk.reach, peakT: pk.t, highFoot, bentShare, findings, usableFrames: usable };
}
