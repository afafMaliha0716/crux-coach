import { FINDINGS } from "./session";
import type { Attempt, FindingId, Route } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const FLAG_RULES = {
  /** The same finding on this many attempts flags the climber. */
  repeatedFinding: 2,
  /** This many falls on one route inside the window flags the climber. */
  fallsOnRoute: 3,
  fallsWindowDays: 7,
  /** No send in this many days, while still attending, flags the climber. */
  plateauDays: 21,
} as const;

export interface Flag {
  kind: "repeated" | "falls" | "plateau";
  text: string;
}

const routeName = (routes: Route[], id: string) => {
  const r = routes.find((x) => x.id === id);
  return r ? `${r.colorName} V${r.grade}` : "a retired route";
};

/**
 * Why a coach should look at this climber, if at all.
 * Only attempts made after the coach last marked the climber reviewed count.
 */
export function computeFlags(attempts: Attempt[], routes: Route[], lastReviewAt: number | undefined, now: number): Flag[] {
  const since = lastReviewAt ?? 0;
  const fresh = attempts.filter((a) => a.at > since);
  const flags: Flag[] = [];

  const counts = new Map<FindingId, { n: number; routes: Set<string> }>();
  for (const a of fresh)
    for (const f of a.findings) {
      const c = counts.get(f) ?? { n: 0, routes: new Set<string>() };
      c.n++;
      c.routes.add(a.routeId);
      counts.set(f, c);
    }
  for (const [f, c] of counts)
    if (c.n >= FLAG_RULES.repeatedFinding)
      flags.push({
        kind: "repeated",
        text: `${FINDINGS[f].title} on ${c.n} attempts (${[...c.routes].map((id) => routeName(routes, id)).join(", ")}).`,
      });

  const falls = new Map<string, number>();
  for (const a of fresh)
    if (a.outcome === "fell" && now - a.at <= FLAG_RULES.fallsWindowDays * DAY) falls.set(a.routeId, (falls.get(a.routeId) ?? 0) + 1);
  for (const [routeId, n] of falls)
    if (n >= FLAG_RULES.fallsOnRoute)
      flags.push({ kind: "falls", text: `Fell on ${routeName(routes, routeId)} ${n} times in the last ${FLAG_RULES.fallsWindowDays} days.` });

  if (attempts.length) {
    const window = FLAG_RULES.plateauDays * DAY;
    const latest = Math.max(...attempts.map((a) => a.at));
    const earliest = Math.min(...attempts.map((a) => a.at));
    const recent = attempts.filter((a) => now - a.at <= window);
    const reviewedSinceLatest = since >= latest;
    if (recent.length && !recent.some((a) => a.outcome === "sent") && now - earliest > window && !reviewedSinceLatest)
      flags.push({
        kind: "plateau",
        text: `No send in ${FLAG_RULES.plateauDays} days, across ${recent.length} attempt${recent.length === 1 ? "" : "s"}.`,
      });
  }
  return flags;
}
