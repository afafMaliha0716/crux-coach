import { describe, expect, it } from "vitest";
import { betaForHeight, formatHeight, isLongReach, longReachLine, spanIn } from "../lib/reach";
import { ROUTE_BETA, routeById } from "../lib/seed";

const short = { heightIn: 60, apeIn: 0 };
const blue = routeById("blue")!;

describe("span", () => {
  it("is height plus ape index", () => {
    expect(spanIn({ heightIn: 60, apeIn: 0 })).toBe(60);
    expect(spanIn({ heightIn: 60, apeIn: 2 })).toBe(62);
    expect(spanIn({ heightIn: 70, apeIn: -1 })).toBe(69);
  });
});

describe("long reach", () => {
  it("is a move longer than 93% of the climber's span", () => {
    // 93% of a 60 in span is 55.8 in.
    expect(isLongReach({ longestMoveIn: 56 }, short)).toBe(true);
    expect(isLongReach({ longestMoveIn: 55 }, short)).toBe(false);
  });

  it("depends on the climber, not just the route", () => {
    expect(isLongReach(blue, short)).toBe(true);
    expect(isLongReach(blue, { heightIn: 70, apeIn: 0 })).toBe(false);
  });

  it("a positive ape index can turn a long reach into a normal one", () => {
    expect(isLongReach(blue, { heightIn: 60, apeIn: 3 })).toBe(false);
  });

  it("states both numbers", () => {
    expect(longReachLine(blue, short)).toBe("Longest move is 58 in. Your span is 60 in.");
  });
});

describe("beta for a climber's height", () => {
  it("picks the band that contains the height", () => {
    expect(betaForHeight(ROUTE_BETA, "blue", 60)?.text).toMatch(/green jib/);
    expect(betaForHeight(ROUTE_BETA, "blue", 64)?.text).toMatch(/green jib/);
    expect(betaForHeight(ROUTE_BETA, "blue", 65)?.text).toMatch(/feet low/);
  });

  it("returns null when no beta exists for the route or the height", () => {
    expect(betaForHeight(ROUTE_BETA, "purple", 60)).toBeNull();
    expect(betaForHeight(ROUTE_BETA, "blue", 40)).toBeNull();
  });
});

describe("formatHeight", () => {
  it("writes feet and inches", () => {
    expect(formatHeight(60)).toBe(`5'0"`);
    expect(formatHeight(71)).toBe(`5'11"`);
  });
});
