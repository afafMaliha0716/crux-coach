import { isLongReach } from "./reach";
import type { Attempt, FindingId, FocusId, Profile, Route, Tag } from "./types";

export const FOCUS: { id: FocusId; label: string; tags: Tag[] }[] = [
  { id: "tension", label: "Steep body tension", tags: ["body tension"] },
  { id: "dyn", label: "Dynamic moves", tags: ["dynamic"] },
  { id: "feet", label: "High feet", tags: ["high foot"] },
  { id: "bal", label: "Slab balance", tags: ["balance"] },
  { id: "lock", label: "Lock-offs", tags: ["lock-off"] },
  { id: "hooks", label: "Heel and toe hooks", tags: ["heel hook", "toe hook"] },
  { id: "comp", label: "Compression", tags: ["compression"] },
];

export const FINDINGS: Record<FindingId, { title: string; tags: Tag[]; suggestion: string }> = {
  reach: {
    title: "Reached at full extension",
    tags: ["high foot", "lock-off"],
    suggestion: "Move a foot up to hip height before the long move, then reach with a bent arm.",
  },
  bent: {
    title: "Hanging on bent arms",
    tags: ["balance"],
    suggestion: "Between moves, let your arms go straight and push through your feet.",
  },
};

/** A self-reported focus area adds this much to each of its tags. */
export const FOCUS_WEIGHT = 2;
/** A measured finding adds this much to each linked tag, once per attempt. Measured behavior outweighs self-report. */
export const FINDING_WEIGHT = 3;

export type Slot = "Warm-up" | "Technique" | "Project";

export interface SessionEntry {
  slot: Slot;
  route: Route;
  /** Tags on this route that match what the climber is working on. */
  hits: Tag[];
  longReach: boolean;
  reason: string;
}

export function tagWeights(profile: Pick<Profile, "focus">, attempts: Pick<Attempt, "findings">[]): Partial<Record<Tag, number>> {
  const w: Partial<Record<Tag, number>> = {};
  const add = (t: Tag, n: number) => {
    w[t] = (w[t] ?? 0) + n;
  };
  for (const id of profile.focus) {
    const f = FOCUS.find((x) => x.id === id);
    if (f) f.tags.forEach((t) => add(t, FOCUS_WEIGHT));
  }
  for (const a of attempts) for (const f of a.findings) FINDINGS[f].tags.forEach((t) => add(t, FINDING_WEIGHT));
  return w;
}

function joinWords(words: string[]): string {
  if (words.length <= 2) return words.join(" and ");
  return words.slice(0, -1).join(", ") + " and " + words[words.length - 1];
}

function reason(slot: Slot, route: Route, hits: Tag[]): string {
  const h = joinWords(hits.length ? hits : [route.tags[0] ?? "movement"]);
  if (slot === "Warm-up") return `Practice ${h} well under your limit.`;
  if (slot === "Technique") return `Trains ${h} at a grade you can repeat.`;
  return `Your next grade, with ${h}.`;
}

/**
 * Picks a Warm-up, a Technique climb and a Project from the live routes.
 * `routes` must be in set order; earlier routes win ties.
 */
export function buildSession(
  profile: Pick<Profile, "heightIn" | "apeIn" | "grade" | "focus">,
  routes: Route[],
  attempts: Pick<Attempt, "findings">[],
): SessionEntry[] {
  const live = routes.filter((r) => r.status === "live");
  const w = tagWeights(profile, attempts);
  const g = profile.grade;
  const taken = new Set<string>();
  const out: SessionEntry[] = [];

  const pick = (grades: number[], avoidReach: boolean): Route | null => {
    let best: Route | null = null;
    let bestScore = -Infinity;
    live.forEach((r, i) => {
      if (!grades.includes(r.grade) || taken.has(r.id)) return;
      let s = r.tags.reduce((a, t) => a + (w[t] ?? 0), 0) - i * 0.01;
      if (avoidReach && isLongReach(r, profile)) s -= 2;
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    });
    return best;
  };

  const add = (slot: Slot, tiers: number[][], avoidReach: boolean) => {
    for (const grades of tiers) {
      const r = pick(grades, avoidReach);
      if (r) {
        taken.add(r.id);
        const hits = r.tags.filter((t) => w[t]);
        out.push({ slot, route: r, hits, longReach: isLongReach(r, profile), reason: reason(slot, r, hits) });
        return;
      }
    }
  };

  add("Warm-up", [[g - 2, g - 1], [g - 3], [g]], true);
  add("Technique", [[g], [g - 1]], false);
  add("Project", [[g + 1], [g], [g - 1]], false);
  return out;
}
