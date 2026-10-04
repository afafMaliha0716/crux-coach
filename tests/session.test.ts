import { describe, expect, it } from "vitest";
import { ROUTES, routeLabel } from "../lib/seed";
import { addedRoutes, buildSession, tagWeights } from "../lib/session";
import type { ClimberProfile, FindingId, Route } from "../lib/types";

// Acceptance check 1: 5'0", ape index 0, V3, steep body tension and dynamic moves.
const founder: ClimberProfile = { heightIn: 60, apeIn: 0, grade: 3, focusAreas: ["tension", "dynamic"] };
const labels = (profile: ClimberProfile, attempts: { findings: FindingId[] }[] = [], routes = ROUTES) =>
  buildSession(profile, routes, attempts).map((e) => routeLabel(e.route));

describe("tag weights", () => {
  it("gives +2 per tag in a chosen focus area", () => {
    expect(tagWeights(["tension", "hooks"], [])).toEqual({
      "body tension": 2,
      "heel hook": 2,
      "toe hook": 2,
    });
  });

  it("gives +3 per linked tag for each attempt with a finding", () => {
    expect(tagWeights([], [{ findings: ["reach"] }, { findings: ["reach"] }])).toEqual({
      "high foot": 6,
      "lock-off": 6,
    });
  });

  it("adds focus and findings together", () => {
    expect(tagWeights(["feet"], [{ findings: ["reach"] }])["high foot"]).toBe(5);
  });

  it("ignores an unknown focus area", () => {
    expect(tagWeights(["nope"], [])).toEqual({});
  });
});

describe("session builder", () => {
  it("builds the founder's first session", () => {
    expect(labels(founder)).toEqual(["Mint V1", "Purple V3", "Blue V4"]);
  });

  it("fills the three slots in order", () => {
    expect(buildSession(founder, ROUTES).map((e) => e.slot)).toEqual(["Warm-up", "Technique", "Project"]);
  });

  it("marks the long reach on Blue V4 for a 60 in span", () => {
    const project = buildSession(founder, ROUTES)[2];
    expect(project.longReach).toBe(true);
    expect(buildSession({ ...founder, heightIn: 70 }, ROUTES)[2].longReach).toBe(false);
  });

  it("adapts after a fall at full extension", () => {
    // Acceptance check 2: the reach finding pulls in high-foot and lock-off routes.
    expect(labels(founder, [{ findings: ["reach"] }])).toEqual(["Green V2", "Orange V3", "Blue V4"]);
  });

  it("explains each pick from the matched tags", () => {
    const [warmUp, technique, project] = buildSession(founder, ROUTES);
    expect(warmUp.reason).toBe("Practice dynamic well under your limit.");
    expect(technique.reason).toBe("Trains body tension at a grade you can repeat.");
    expect(project.reason).toBe("Your next grade, with body tension.");
    expect(project.matchedTags).toEqual(["body tension"]);
  });

  it("falls back to the route's first tag when nothing matches", () => {
    const [warmUp] = buildSession({ ...founder, focusAreas: [] }, ROUTES);
    expect(warmUp.matchedTags).toEqual([]);
    expect(warmUp.reason).toMatch(/^Practice \w/);
  });

  it("breaks ties by set order", () => {
    // With no focus areas every route scores 0, so the first-set route in each band wins.
    expect(labels({ ...founder, focusAreas: [] })).toEqual(["Yellow V1", "Purple V3", "Blue V4"]);
  });

  it("never repeats a route", () => {
    for (let grade = 0; grade <= 6; grade++) {
      const ids = buildSession({ ...founder, grade }, ROUTES).map((e) => e.route.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("avoids a long reach for the warm-up when another route scores the same", () => {
    const routes: Route[] = [
      { id: "far", colorName: "Far", colorHex: "#000", grade: 2, wall: "A", tags: ["dynamic"], longestMoveIn: 59, status: "live" },
      { id: "near", colorName: "Near", colorHex: "#000", grade: 2, wall: "A", tags: ["dynamic"], longestMoveIn: 40, status: "live" },
    ];
    const [warmUp] = buildSession(founder, routes);
    expect(warmUp.route.id).toBe("near");
  });

  it("falls back to nearby grades at the ends of the scale", () => {
    expect(labels({ ...founder, grade: 0 })).toEqual(["Tan V0", "Mint V1"]);
    const top = buildSession({ ...founder, grade: 6 }, ROUTES);
    expect(top.map((e) => e.slot)).toEqual(["Warm-up", "Technique", "Project"]);
    expect(top[1].route.grade).toBe(6);
  });

  it("rebuilds without a route that was retired", () => {
    // Acceptance check 6.
    const afterReset = ROUTES.map((r) => (r.id === "blue" ? { ...r, status: "retired" as const } : r));
    const session = labels(founder, [], afterReset);
    expect(session).not.toContain("Blue V4");
    expect(session).toHaveLength(3);
    expect(session[2]).toBe("Black V4");
  });

  it("returns an empty session when the wall is empty", () => {
    expect(buildSession(founder, [])).toEqual([]);
  });
});

describe("added routes", () => {
  it("lists routes that were not in the previous session", () => {
    const next = buildSession(founder, ROUTES, [{ findings: ["reach"] }]);
    expect(addedRoutes(["mint", "purple", "blue"], next)).toEqual(["green", "orange"]);
  });

  it("is empty for a first session", () => {
    expect(addedRoutes(null, buildSession(founder, ROUTES))).toEqual([]);
  });
});
