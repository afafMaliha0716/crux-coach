import type { Finding, FindingId, FocusArea } from "./types";

/** What Crux can detect in an attempt, and which route tags train it. */
export const FINDINGS: Record<FindingId, Finding> = {
  reach: {
    id: "reach",
    title: "Reached at full extension",
    tags: ["high foot", "lock-off"],
  },
  bent: {
    id: "bent",
    title: "Hanging on bent arms",
    tags: ["balance"],
  },
};

/** What a climber can say they want to work on. */
export const FOCUS_AREAS: FocusArea[] = [
  { id: "tension", label: "Steep body tension", tags: ["body tension"] },
  { id: "dynamic", label: "Dynamic moves", tags: ["dynamic"] },
  { id: "feet", label: "High feet", tags: ["high foot"] },
  { id: "balance", label: "Slab balance", tags: ["balance"] },
  { id: "lockoff", label: "Lock-offs", tags: ["lock-off"] },
  { id: "hooks", label: "Heel and toe hooks", tags: ["heel hook", "toe hook"] },
  { id: "compression", label: "Compression", tags: ["compression"] },
];
