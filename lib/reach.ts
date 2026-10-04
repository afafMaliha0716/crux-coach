import type { ClimberProfile, Route, RouteBeta } from "./types";

/** A move longer than this share of a climber's span is a long reach for them. */
export const LONG_REACH_RATIO = 0.93;

export function spanIn(profile: Pick<ClimberProfile, "heightIn" | "apeIn">): number {
  return profile.heightIn + profile.apeIn;
}

export function isLongReach(
  route: Pick<Route, "longestMoveIn">,
  profile: Pick<ClimberProfile, "heightIn" | "apeIn">,
): boolean {
  return route.longestMoveIn > LONG_REACH_RATIO * spanIn(profile);
}

/** "Longest move is 58 in. Your span is 60 in." */
export function longReachLine(
  route: Pick<Route, "longestMoveIn">,
  profile: Pick<ClimberProfile, "heightIn" | "apeIn">,
): string {
  return `Longest move is ${route.longestMoveIn} in. Your span is ${spanIn(profile)} in.`;
}

/** The beta written for this climber's height on this route, if any exists. */
export function betaForHeight(
  betas: RouteBeta[],
  routeId: string,
  heightIn: number,
): RouteBeta | null {
  return (
    betas.find(
      (b) => b.routeId === routeId && heightIn >= b.heightMinIn && heightIn <= b.heightMaxIn,
    ) ?? null
  );
}

/** 62 -> 5'2" */
export function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}
