import type { Attempt, Profile } from "./types";

export const INSIGHT_RULES = {
  /** Climbers shorter than this (inches) are the short band. 64 in = 5'4". */
  shortBelowIn: 64,
  /** Attempts needed in each band before a comparison is shown. */
  minAttemptsPerBand: 5,
  /** Send-rate gap, in percentage points, that flags a route as harder for shorter members. */
  gapPoints: 25,
} as const;

export interface RouteInsight {
  short: { attempts: number; sends: number };
  rest: { attempts: number; sends: number };
  enoughData: boolean;
  harderForShort: boolean;
}

export function routeInsight(routeId: string, attempts: Attempt[], profiles: Profile[]): RouteInsight {
  const height = new Map(profiles.map((p) => [p.id, p.heightIn]));
  const short = { attempts: 0, sends: 0 }, rest = { attempts: 0, sends: 0 };
  for (const a of attempts) {
    // Sample attempts are animations, not climbs, so they never count toward route statistics.
    if (a.routeId !== routeId || a.source === "sample") continue;
    const h = height.get(a.climberId);
    if (h === undefined) continue;
    const band = h < INSIGHT_RULES.shortBelowIn ? short : rest;
    band.attempts++;
    if (a.outcome === "sent") band.sends++;
  }
  const enoughData = short.attempts >= INSIGHT_RULES.minAttemptsPerBand && rest.attempts >= INSIGHT_RULES.minAttemptsPerBand;
  const rate = (b: { attempts: number; sends: number }) => (b.attempts ? (100 * b.sends) / b.attempts : 0);
  return { short, rest, enoughData, harderForShort: enoughData && rate(rest) - rate(short) >= INSIGHT_RULES.gapPoints };
}
