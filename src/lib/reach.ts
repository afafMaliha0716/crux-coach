import type { Profile, Route } from "./types";

/** A route is a long reach when its longest move is more than this share of the climber's arm span. */
export const LONG_REACH_RATIO = 0.93;

export function spanIn(p: Pick<Profile, "heightIn" | "apeIn">): number {
  return p.heightIn + p.apeIn;
}

export function isLongReach(route: Pick<Route, "longestMoveIn">, p: Pick<Profile, "heightIn" | "apeIn">): boolean {
  return route.longestMoveIn > LONG_REACH_RATIO * spanIn(p);
}
