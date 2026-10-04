import { describe, expect, it } from "vitest";
import { LM, analyzeAttempt, angleAt, isVisible } from "../lib/analysis";
import { feedbackFor } from "../lib/feedback";
import { SAMPLE_HEIGHT, SAMPLE_WIDTH, sampleFrames } from "../lib/samples";
import type { Landmark, PoseFrame } from "../lib/types";

const analyzeSample = (id: "fall" | "send") =>
  analyzeAttempt(sampleFrames(id), SAMPLE_WIDTH, SAMPLE_HEIGHT)!;

describe("angleAt", () => {
  it("measures the angle at the middle point", () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180);
    expect(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(angleAt({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(0);
  });

  it("treats a zero-length limb as straight instead of dividing by zero", () => {
    expect(angleAt({ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBe(180);
  });
});

describe("visibility", () => {
  it("ignores landmarks under 0.5 and accepts ones with no score", () => {
    expect(isVisible({ x: 0, y: 0, visibility: 0.49 })).toBe(false);
    expect(isVisible({ x: 0, y: 0, visibility: 0.51 })).toBe(true);
    expect(isVisible({ x: 0, y: 0 })).toBe(true);
    expect(isVisible(undefined)).toBe(false);
  });
});

describe("sample: fall at the crux", () => {
  // Acceptance check 2.
  const result = analyzeSample("fall");

  it("finds the straight-arm reach", () => {
    expect(result.findings).toEqual(["reach"]);
    expect(Math.round(result.metrics.peakElbowAngle)).toBe(177);
  });

  it("measures no high foot before the reach", () => {
    expect(result.metrics.highFootBeforeReach).toBe(false);
  });

  it("places the reach when the hand arrives at the crux hold", () => {
    // The spec's example sentence reads "At 4.0s".
    expect(result.metrics.peakTime.toFixed(1)).toBe("4.0");
    expect(result.metrics.peakReach).toBeGreaterThanOrEqual(0.9);
  });

  it("uses every frame", () => {
    expect(result.framesUsed).toBe(sampleFrames("fall").length);
  });

  it("words the feedback around the measurement", () => {
    const [line] = feedbackFor(result.metrics, result.findings);
    expect(line.title).toBe("Reached at full extension");
    expect(line.body).toMatch(/^At \d\.\ds your arm was straight \(177°\) with both feet still low\./);
  });
});

describe("sample: with the new beta", () => {
  // Acceptance check 3.
  const result = analyzeSample("send");

  it("finds nothing to flag", () => {
    expect(result.findings).toEqual([]);
  });

  it("measures a bent-arm reach from a high foot", () => {
    expect(result.metrics.peakElbowAngle).toBeLessThan(160);
    expect(result.metrics.highFootBeforeReach).toBe(true);
  });

  it("reports clean movement", () => {
    const [line] = feedbackFor(result.metrics, result.findings);
    expect(line.id).toBe("clean");
    expect(line.body).toMatch(/from a high foot/);
  });
});

describe("clips Crux cannot use", () => {
  it("rejects a clip with no pose at all", () => {
    const frames: PoseFrame[] = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, landmarks: null }));
    expect(analyzeAttempt(frames, 360, 480)).toBeNull();
  });

  it("rejects a clip where under 30% of frames have a pose", () => {
    const good = sampleFrames("fall").slice(0, 20);
    const empty: PoseFrame[] = Array.from({ length: 80 }, (_, i) => ({ t: 10 + i / 30, landmarks: null }));
    expect(analyzeAttempt([...good, ...empty], 360, 480)).toBeNull();
  });

  it("rejects a clip with fewer than 5 usable frames", () => {
    expect(analyzeAttempt(sampleFrames("fall").slice(0, 4), 360, 480)).toBeNull();
  });

  it("skips frames where the torso is not visible", () => {
    const frames = sampleFrames("fall").map((frame, i) => {
      if (i % 2) return frame;
      const landmarks = [...frame.landmarks!];
      landmarks[LM.leftHip] = { ...(landmarks[LM.leftHip] as Landmark), visibility: 0.1 };
      return { ...frame, landmarks };
    });
    const result = analyzeAttempt(frames, SAMPLE_WIDTH, SAMPLE_HEIGHT)!;
    expect(result.framesUsed).toBe(Math.floor(frames.length / 2));
    expect(result.findings).toEqual(["reach"]);
  });
});

describe("pixel conversion", () => {
  it("measures angles in pixels, so a wide frame gives a different elbow angle", () => {
    const portrait = analyzeAttempt(sampleFrames("send"), 360, 480)!;
    const landscape = analyzeAttempt(sampleFrames("send"), 960, 480)!;
    expect(Math.abs(portrait.metrics.peakElbowAngle - landscape.metrics.peakElbowAngle)).toBeGreaterThan(1);
  });
});

describe("hanging on bent arms", () => {
  /** A figure hanging still with both hands overhead and the elbows at a set bend. */
  function hang(elbowBendOut: number): PoseFrame[] {
    const lm: Landmark[] = [];
    const set = (i: number, x: number, y: number) => (lm[i] = { x, y, visibility: 1 });
    set(LM.leftShoulder, 0.44, 0.5);
    set(LM.rightShoulder, 0.56, 0.5);
    set(LM.leftHip, 0.455, 0.7);
    set(LM.rightHip, 0.545, 0.7);
    set(LM.leftKnee, 0.45, 0.85);
    set(LM.rightKnee, 0.55, 0.85);
    // Wrists straight above the shoulders; elbows pushed outward by `elbowBendOut`.
    set(LM.leftWrist, 0.44, 0.38);
    set(LM.rightWrist, 0.56, 0.38);
    set(LM.leftElbow, 0.44 - elbowBendOut, 0.44);
    set(LM.rightElbow, 0.56 + elbowBendOut, 0.44);
    return Array.from({ length: 30 }, (_, i) => ({ t: i / 30, landmarks: lm }));
  }

  it("flags a climber who stays locked off", () => {
    const result = analyzeAttempt(hang(0.09), 480, 480)!;
    expect(result.metrics.bentArmShare).toBe(1);
    expect(result.findings).toEqual(["bent"]);
    expect(feedbackFor(result.metrics, result.findings)[0].body).toMatch(/100% of the time/);
  });

  it("does not flag straight arms", () => {
    const result = analyzeAttempt(hang(0), 480, 480)!;
    expect(result.metrics.bentArmShare).toBe(0);
    expect(result.findings).toEqual([]);
  });
});
