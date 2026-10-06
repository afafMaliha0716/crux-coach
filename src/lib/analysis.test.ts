import { describe, expect, it } from "vitest";
import { analyze, angle, onWallFrames } from "./analysis";
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

  it("ignores a straight-arm reach made while standing on the mat", () => {
    const fall = sampleFrames("fall");
    const reach = fall.reduce((b, f) => (Math.abs(f.t - 3.5) < Math.abs(b.t - 3.5) ? f : b));
    // The same straight-arm pose, lowered so the feet are on the mat: a climber grabbing the start holds.
    const standing = Array.from({ length: 60 }, (_, i) => ({ t: i / 30, lm: reach.lm!.map((p) => (p ? { ...p, y: p.y + 0.3 } : p)) }));
    const climb = sampleFrames("send").map((f) => ({ ...f, t: f.t + 2 }));
    const a = analyze([...standing, ...climb], width, height)!;
    expect(a.findings).toEqual([]);
    expect(a.peakT).toBeGreaterThan(2);
  });
});

describe("on-wall filter", () => {
  it("drops frames at mat level and keeps the climb", () => {
    const frames = [
      ...Array.from({ length: 10 }, () => ({ torso: 100, foot: 900 })),
      ...Array.from({ length: 30 }, () => ({ torso: 100, foot: 600 })),
    ];
    expect(onWallFrames(frames)).toHaveLength(30);
  });

  it("keeps every frame when the clip never leaves one level", () => {
    const frames = Array.from({ length: 40 }, (_, i) => ({ torso: 100, foot: 800 + (i % 3) }));
    expect(onWallFrames(frames)).toHaveLength(40);
  });

  it("keeps frames where the feet are out of view", () => {
    const frames = [{ torso: 100, foot: 900 }, { torso: 100 }, { torso: 100, foot: 500 }, { torso: 100, foot: 480 }];
    expect(onWallFrames(frames).some((f) => f.foot === undefined)).toBe(true);
  });
});
