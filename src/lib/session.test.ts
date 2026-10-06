import { describe, expect, it } from "vitest";
import { isLongReach, spanIn } from "./reach";
import { seedRoutes } from "./seed";
import { buildSession, tagWeights } from "./session";
import type { Profile } from "./types";

const routes = seedRoutes(Date.UTC(2026, 9, 1));
const me: Profile = { id: "me", name: "You", heightIn: 60, apeIn: 0, grade: 3, focus: ["tension", "dyn"], member: true, example: false, onboarded: true };
const names = (p: Profile, attempts: { findings: ("reach" | "bent")[] }[] = [], r = routes) =>
  buildSession(p, r, attempts).map((e) => `${e.route.colorName} V${e.route.grade}`);

describe("reach", () => {
  it("adds ape index to height", () => {
    expect(spanIn({ heightIn: 60, apeIn: 2 })).toBe(62);
  });
  it("flags Blue V4 (58 in) for a 60 in span and not for a 72 in span", () => {
    const blue = routes.find((r) => r.id === "blue")!;
    expect(isLongReach(blue, { heightIn: 60, apeIn: 0 })).toBe(true);
    expect(isLongReach(blue, { heightIn: 72, apeIn: 0 })).toBe(false);
  });
});

describe("session builder", () => {
  it("acceptance 1: 5'0\" V3 with body tension and dynamic gets Mint V1, Purple V3, Blue V4", () => {
    expect(names(me)).toEqual(["Mint V1", "Purple V3", "Blue V4"]);
    const project = buildSession(me, routes, [])[2];
    expect(project.longReach).toBe(true);
    expect(project.slot).toBe("Project");
  });

  it("acceptance 2: a full-extension finding swaps in Green V2 and Orange V3", () => {
    expect(names(me, [{ findings: ["reach"] }])).toEqual(["Green V2", "Orange V3", "Blue V4"]);
  });

  it("weights a measured finding above a self-reported focus area", () => {
    const w = tagWeights(me, [{ findings: ["reach"] }]);
    expect(w["high foot"]).toBe(3);
    expect(w["body tension"]).toBe(2);
  });

  it("acceptance 6: retiring a route rebuilds the session without it", () => {
    const afterReset = routes.map((r) => (r.id === "blue" ? { ...r, status: "retired" as const } : r));
    const s = names(me, [], afterReset);
    expect(s).not.toContain("Blue V4");
    expect(s).toHaveLength(3);
  });

  it("never repeats a route and explains each pick", () => {
    const s = buildSession({ ...me, grade: 0 }, routes, []);
    expect(new Set(s.map((e) => e.route.id)).size).toBe(s.length);
    s.forEach((e) => expect(e.reason.length).toBeGreaterThan(10));
  });
});
