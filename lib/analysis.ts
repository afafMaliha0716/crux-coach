import type { AttemptMetrics, FindingId, Landmark, PoseFrame } from "./types";

/** Indices into the 33 pose landmarks (the same in MediaPipe Pose and Pose Landmarker). */
export const LM = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Landmark pairs to draw as the skeleton. */
export const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23],
  [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

export const MIN_VISIBILITY = 0.5;
/** A wrist this far above the shoulder, in torso lengths, counts as overhead. */
const OVERHEAD_REACH = 0.3;
const BENT_ELBOW_DEG = 95;
const STRAIGHT_ELBOW_DEG = 160;
const FULL_REACH = 0.9;
const BENT_SHARE_LIMIT = 0.65;
/** A knee this far above its hip, in torso lengths, counts as a high foot. */
const HIGH_FOOT_MARGIN = 0.05;
const HIGH_FOOT_WINDOW_S = 3;
const MIN_USABLE_SHARE = 0.3;
const MIN_USABLE_FRAMES = 5;

export const NO_CLIMBER_MESSAGE =
  "Crux could not find a climber in this clip. Film from behind with your whole body in frame.";

export interface AnalysisResult {
  metrics: AttemptMetrics;
  findings: FindingId[];
  /** Frames where a usable pose was found. */
  framesUsed: number;
}

interface Point {
  x: number;
  y: number;
}

export function isVisible(landmark: Landmark | undefined): landmark is Landmark {
  return !!landmark && (landmark.visibility === undefined || landmark.visibility > MIN_VISIBILITY);
}

/** The angle at `b`, in degrees, between the segments b-a and b-c. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const lengths = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!lengths) return 180;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Measures one attempt from its pose frames.
 *
 * `width` and `height` are the clip's pixel size. Landmarks are normalized,
 * so they are converted to pixels first: angles measured in normalized space
 * are wrong for any frame that is not square.
 *
 * Returns null when too few frames have a usable pose (see NO_CLIMBER_MESSAGE).
 */
export function analyzeAttempt(
  frames: PoseFrame[],
  width: number,
  height: number,
): AnalysisResult | null {
  const px = (p: Landmark): Point => ({ x: p.x * width, y: p.y * height });

  let peak: { reach: number; angle: number; t: number } | null = null;
  let overheadFrames = 0;
  let bentFrames = 0;
  let framesUsed = 0;
  const highFootAt: { t: number; high: boolean }[] = [];

  for (const frame of frames) {
    const lm = frame.landmarks;
    if (!lm) continue;
    const core = [LM.leftShoulder, LM.rightShoulder, LM.leftHip, LM.rightHip].map((i) => lm[i]);
    if (!core.every(isVisible)) continue;
    framesUsed += 1;

    const [ls, rs, lh, rh] = (core as Landmark[]).map(px);
    const torso =
      Math.hypot((ls.x + rs.x) / 2 - (lh.x + rh.x) / 2, (ls.y + rs.y) / 2 - (lh.y + rh.y) / 2) || 1;

    let smallestOverheadAngle: number | null = null;
    const arms = [
      [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
      [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
    ];
    for (const arm of arms) {
      const joints = arm.map((i) => lm[i]);
      if (!joints.every(isVisible)) continue;
      const [shoulder, elbow, wrist] = (joints as Landmark[]).map(px);
      // y grows downward, so a wrist above the shoulder has the smaller y.
      const reach = (shoulder.y - wrist.y) / torso;
      const angle = angleAt(shoulder, elbow, wrist);
      if (!peak || reach > peak.reach) peak = { reach, angle, t: frame.t };
      if (reach > OVERHEAD_REACH) {
        smallestOverheadAngle =
          smallestOverheadAngle === null ? angle : Math.min(smallestOverheadAngle, angle);
      }
    }
    if (smallestOverheadAngle !== null) {
      overheadFrames += 1;
      if (smallestOverheadAngle < BENT_ELBOW_DEG) bentFrames += 1;
    }

    let high = false;
    const legs = [
      [LM.leftHip, LM.leftKnee],
      [LM.rightHip, LM.rightKnee],
    ];
    for (const [hipIndex, kneeIndex] of legs) {
      const hip = lm[hipIndex];
      const knee = lm[kneeIndex];
      if (isVisible(hip) && isVisible(knee) && px(knee).y < px(hip).y - HIGH_FOOT_MARGIN * torso) {
        high = true;
      }
    }
    highFootAt.push({ t: frame.t, high });
  }

  if (!peak || framesUsed < frames.length * MIN_USABLE_SHARE || framesUsed < MIN_USABLE_FRAMES) {
    return null;
  }

  const peakTime = peak.t;
  const highFootBeforeReach = highFootAt.some(
    (f) => f.high && f.t <= peakTime + 0.1 && f.t >= peakTime - HIGH_FOOT_WINDOW_S,
  );
  const bentArmShare = overheadFrames ? bentFrames / overheadFrames : 0;

  const findings: FindingId[] = [];
  if (peak.angle >= STRAIGHT_ELBOW_DEG && peak.reach >= FULL_REACH) findings.push("reach");
  if (bentArmShare > BENT_SHARE_LIMIT) findings.push("bent");

  return {
    metrics: {
      peakElbowAngle: peak.angle,
      peakReach: peak.reach,
      peakTime,
      highFootBeforeReach,
      bentArmShare,
    },
    findings,
    framesUsed,
  };
}
