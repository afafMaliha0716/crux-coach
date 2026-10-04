import { FINDINGS, FOCUS_AREAS } from "./catalog";
import { isLongReach } from "./reach";
import type { Attempt, ClimberProfile, Route, Tag } from "./types";

export type Slot = "Warm-up" | "Technique" | "Project";

export interface SessionEntry {
  slot: Slot;
  route: Route;
  /** The route's tags that match what this climber needs to work on. */
  matchedTags: Tag[];
  reason: string;
  longReach: boolean;
}

const FOCUS_WEIGHT = 2;
/** Measured behavior outweighs what the climber says about themselves. */
const FINDING_WEIGHT = 3;
const LONG_REACH_PENALTY = 2;

/**
 * How much each tag matters for this climber: +2 for each tag in a focus area
 * they chose, +3 for each tag linked to a finding, once per attempt with it.
 */
export function tagWeights(
  focusAreas: string[],
  attempts: Pick<Attempt, "findings">[],
): Partial<Record<Tag, number>> {
  const weights: Partial<Record<Tag, number>> = {};
  const add = (tag: Tag, amount: number) => {
    weights[tag] = (weights[tag] ?? 0) + amount;
  };
  for (const id of focusAreas) {
    FOCUS_AREAS.find((area) => area.id === id)?.tags.forEach((tag) => add(tag, FOCUS_WEIGHT));
  }
  for (const attempt of attempts) {
    for (const finding of attempt.findings) {
      FINDINGS[finding].tags.forEach((tag) => add(tag, FINDING_WEIGHT));
    }
  }
  return weights;
}

function joinTags(tags: string[]): string {
  if (tags.length <= 2) return tags.join(" and ");
  return `${tags.slice(0, -1).join(", ")} and ${tags[tags.length - 1]}`;
}

function reasonFor(slot: Slot, route: Route, matched: Tag[]): string {
  const what = joinTags(matched.length ? matched : route.tags.slice(0, 1));
  if (slot === "Warm-up") return `Practice ${what} well under your limit.`;
  if (slot === "Technique") return `Trains ${what} at a grade you can repeat.`;
  return `Your next grade, with ${what}.`;
}

/**
 * Builds a three-route session from the routes on the wall right now.
 *
 * `routes` must be in set order: ties go to the route set first. Retired
 * routes are ignored, so a wall reset rebuilds the session on the next call.
 */
export function buildSession(
  profile: ClimberProfile,
  routes: Route[],
  attempts: Pick<Attempt, "findings">[] = [],
): SessionEntry[] {
  const weights = tagWeights(profile.focusAreas, attempts);
  const live = routes.filter((route) => route.status === "live");
  const taken = new Set<string>();
  const session: SessionEntry[] = [];
  const g = profile.grade;

  const best = (grades: number[], avoidLongReach: boolean): Route | null => {
    let winner: Route | null = null;
    let top = -Infinity;
    for (const route of live) {
      if (!grades.includes(route.grade) || taken.has(route.id)) continue;
      let score = route.tags.reduce((sum, tag) => sum + (weights[tag] ?? 0), 0);
      if (avoidLongReach && isLongReach(route, profile)) score -= LONG_REACH_PENALTY;
      // Strictly greater, so the earliest-set route wins a tie.
      if (score > top) {
        top = score;
        winner = route;
      }
    }
    return winner;
  };

  const add = (slot: Slot, gradeBands: number[][], avoidLongReach: boolean) => {
    for (const grades of gradeBands) {
      const route = best(grades, avoidLongReach);
      if (!route) continue;
      taken.add(route.id);
      const matchedTags = route.tags.filter((tag) => weights[tag]);
      session.push({
        slot,
        route,
        matchedTags,
        reason: reasonFor(slot, route, matchedTags),
        longReach: isLongReach(route, profile),
      });
      return;
    }
  };

  add("Warm-up", [[g - 2, g - 1], [g - 3], [g]], true);
  add("Technique", [[g], [g - 1]], false);
  add("Project", [[g + 1], [g], [g - 1]], false);
  return session;
}

/** Route ids in `next` that were not in `previous`: shown as "Added after your last attempt". */
export function addedRoutes(previous: string[] | null, next: SessionEntry[]): string[] {
  if (!previous) return [];
  return next.map((entry) => entry.route.id).filter((id) => !previous.includes(id));
}
