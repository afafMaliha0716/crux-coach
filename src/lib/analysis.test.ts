import { describe, expect, it } from "vitest";
import { analyze, angle } from "./analysis";
import { SAMPLE_SIZE, sampleFrames } from "./samples";

const { width, height } = SAMPLE_SIZE;

describe("angle", () => {
  it("measures a straight arm as 180 and a right angle as 90", () => {
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180);
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
  });
});

describe("attempt analysis", () => {
  it("acceptance 2: the fall sample is a full-extension reach with no high foot", () => {
    const a = analyze(sampleFrames("fall"), width, height)!;
    expect(a.findings).toEqual(["reach"]);
    expect(a.peakAngle).toBeGreaterThan(170);
    expect(Math.round(a.peakAngle)).toBe(177);
    expect(a.highFoot).toBe(false);
  });

  it("acceptance 3: the send sample has no findings and a high foot before the reach", () => {
    const a = analyze(sampleFrames("send"), width, height)!;
    expect(a.findings).toEqual([]);
    expect(a.highFoot).toBe(true);
    expect(a.peakAngle).toBeLessThan(160);
  });

  it("rejects a clip with no climber in it", () => {
    const empty = Array.from({ length: 40 }, (_, i) => ({ t: i / 30, lm: null }));
    expect(analyze(empty, width, height)).toBeNull();
  });

  it("rejects a clip where the climber is visible in too few frames", () => {
    const frames = sampleFrames("fall").map((f, i) => (i % 10 === 0 ? f : { t: f.t, lm: null }));
    expect(analyze(frames, width, height)).toBeNull();
  });

  it("ignores landmarks with low visibility", () => {
    const frames = sampleFrames("fall").map((f) => ({ t: f.t, lm: f.lm!.map((p) => (p ? { ...p, visibility: 0.2 } : p)) }));
    expect(analyze(frames, width, height)).toBeNull();
  });
});
