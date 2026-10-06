import { describe, expect, it } from "vitest";
import { computeFlags } from "./flags";
import { routeInsight } from "./insight";
import { seedAttempts, seedProfiles, seedRoutes } from "./seed";
import type { Attempt } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 5);
const routes = seedRoutes(now);
const seeded = seedAttempts(now);
const of = (id: string) => seeded.filter((a) => a.climberId === id);
const att = (daysAgo: number, outcome: "sent" | "fell", findings: Attempt["findings"] = [], routeId = "blue"): Attempt => ({
  id: `t${daysAgo}-${Math.random()}`, climberId: "me", routeId, at: now - daysAgo * DAY, source: "sample", outcome,
  findings, framesAnalyzed: 100, sharedWithCoach: false, example: false,
});

describe("coach flags", () => {
  it("acceptance 4: the same finding on two attempts flags the climber", () => {
    expect(computeFlags([att(0.01, "fell", ["reach"])], routes, undefined, now)).toEqual([]);
    const flags = computeFlags([att(0.02, "fell", ["reach"]), att(0.01, "fell", ["reach"])], routes, undefined, now);
    expect(flags).toHaveLength(1);
    expect(flags[0].kind).toBe("repeated");
    expect(flags[0].text).toContain("2 attempts");
    expect(flags[0].text).toContain("Blue V4");
  });

  it("acceptance 4: marking reviewed clears the flag until it happens again", () => {
    const attempts = [att(0.02, "fell", ["reach"]), att(0.01, "fell", ["reach"])];
    expect(computeFlags(attempts, routes, now, now)).toEqual([]);
  });

  it("flags three falls on one route in seven days", () => {
    const kinds = computeFlags(of("maya"), routes, undefined, now).map((f) => f.kind);
    expect(kinds).toEqual(["falls"]);
  });

  it("flags no send in 21 days while still attending", () => {
    const kinds = computeFlags(of("sam"), routes, undefined, now).map((f) => f.kind);
    expect(kinds).toEqual(["plateau"]);
  });

  it("leaves climbers who are sending alone", () => {
    for (const id of ["dev", "lena", "chris", "priya"]) expect(computeFlags(of(id), routes, undefined, now)).toEqual([]);
  });

  it("does not call a brand new climber a plateau", () => {
    expect(computeFlags([att(1, "fell")], routes, undefined, now)).toEqual([]);
  });
});

describe("setter insight", () => {
  it("shows Blue V4 as harder for shorter members in the example data", () => {
    const i = routeInsight("blue", seeded, seedProfiles());
    expect(i.enoughData).toBe(true);
    expect(i.short.sends).toBe(0);
    expect(i.harderForShort).toBe(true);
  });

  it("stays quiet without five attempts in each height band", () => {
    const i = routeInsight("red", seeded, seedProfiles());
    expect(i.enoughData).toBe(false);
    expect(i.harderForShort).toBe(false);
  });
});
