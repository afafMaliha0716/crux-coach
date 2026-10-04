import { FINDINGS } from "./catalog";
import type { Attempt, FindingId } from "./types";

export type FlagKind = "repeated_finding" | "repeated_falls" | "no_recent_send";

export interface Flag {
  kind: FlagKind;
  /** One sentence with the numbers behind the flag. */
  reason: string;
}

const REPEATED_FINDING_MIN = 2;
const FALLS_MIN = 3;
const FALLS_WINDOW_DAYS = 7;
const NO_SEND_DAYS = 21;
const DAY_MS = 86_400_000;

type FlagAttempt = Pick<Attempt, "routeId" | "createdAt" | "outcome" | "findings">;

/** Findings that appear on two or more attempts, most frequent first. */
export function repeatedFindings(
  attempts: Pick<Attempt, "findings">[],
): { finding: FindingId; count: number }[] {
  const counts = new Map<FindingId, number>();
  for (const attempt of attempts) {
    for (const finding of attempt.findings) counts.set(finding, (counts.get(finding) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= REPEATED_FINDING_MIN)
    .map(([finding, count]) => ({ finding, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Why a coach should look at this climber, if at all.
 *
 * Only attempts since the coach last marked the climber reviewed count, so
 * "Mark reviewed" clears the flags until something new happens.
 *
 * `routeLabel` turns a route id into the name shown to the coach.
 */
export function flagsFor(
  attempts: FlagAttempt[],
  options: { now: Date; reviewedAt?: Date | null; routeLabel?: (routeId: string) => string },
): Flag[] {
  const { now, reviewedAt = null, routeLabel = (id) => id } = options;
  const since = reviewedAt ? reviewedAt.getTime() : -Infinity;
  const recent = attempts.filter((a) => Date.parse(a.createdAt) > since);
  const flags: Flag[] = [];

  for (const { finding, count } of repeatedFindings(recent)) {
    flags.push({
      kind: "repeated_finding",
      reason: `${FINDINGS[finding].title} on ${count} attempts.`,
    });
  }

  const weekAgo = now.getTime() - FALLS_WINDOW_DAYS * DAY_MS;
  const falls = new Map<string, number>();
  for (const attempt of recent) {
    if (attempt.outcome === "fell" && Date.parse(attempt.createdAt) >= weekAgo) {
      falls.set(attempt.routeId, (falls.get(attempt.routeId) ?? 0) + 1);
    }
  }
  for (const [routeId, count] of falls) {
    if (count >= FALLS_MIN) {
      flags.push({
        kind: "repeated_falls",
        reason: `Fell on ${routeLabel(routeId)} ${count} times in the last ${FALLS_WINDOW_DAYS} days.`,
      });
    }
  }

  // "Still attending" means they logged an attempt inside the window. Someone
  // who has stopped coming is a different problem from someone who is stuck.
  const windowStart = now.getTime() - NO_SEND_DAYS * DAY_MS;
  const inWindow = recent.filter((a) => Date.parse(a.createdAt) >= windowStart);
  const everLoggedBefore = attempts.some((a) => Date.parse(a.createdAt) < windowStart);
  if (everLoggedBefore && inWindow.length > 0 && !inWindow.some((a) => a.outcome === "sent")) {
    flags.push({
      kind: "no_recent_send",
      reason: `No new send in ${NO_SEND_DAYS} days across ${inWindow.length} attempt${inWindow.length === 1 ? "" : "s"}.`,
    });
  }

  return flags;
}
