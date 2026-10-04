import { describe, expect, it } from "vitest";
import { flagsFor, repeatedFindings } from "../lib/flags";
import type { Attempt, FindingId, Outcome } from "../lib/types";

const NOW = new Date("2026-03-20T18:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

function attempt(days: number, outcome: Outcome, findings: FindingId[] = [], routeId = "blue") {
  return { routeId, createdAt: daysAgo(days), outcome, findings } satisfies Partial<Attempt>;
}
const kinds = (attempts: ReturnType<typeof attempt>[], reviewedAt?: Date) =>
  flagsFor(attempts, { now: NOW, reviewedAt }).map((f) => f.kind);

describe("repeated findings", () => {
  it("needs the same finding on two attempts", () => {
    expect(repeatedFindings([{ findings: ["reach"] }])).toEqual([]);
    expect(repeatedFindings([{ findings: ["reach"] }, { findings: ["reach", "bent"] }])).toEqual([
      { finding: "reach", count: 2 },
    ]);
  });
});

describe("coach flags", () => {
  it("does not flag a climber with nothing wrong", () => {
    expect(kinds([attempt(1, "sent")])).toEqual([]);
    expect(kinds([])).toEqual([]);
  });

  it("flags the same finding on two attempts, with the count", () => {
    // Acceptance check 4.
    const flags = flagsFor([attempt(2, "fell", ["reach"]), attempt(1, "fell", ["reach"])], { now: NOW });
    expect(flags).toEqual([
      { kind: "repeated_finding", reason: "Reached at full extension on 2 attempts." },
    ]);
  });

  it("flags three falls on one route within seven days", () => {
    const flags = flagsFor([attempt(6, "fell"), attempt(3, "fell"), attempt(1, "fell")], {
      now: NOW,
      routeLabel: () => "Blue V4",
    });
    expect(flags).toEqual([
      { kind: "repeated_falls", reason: "Fell on Blue V4 3 times in the last 7 days." },
    ]);
  });

  it("does not count falls on different routes or older than a week together", () => {
    expect(kinds([attempt(1, "fell", [], "blue"), attempt(1, "fell", [], "red"), attempt(1, "fell", [], "teal")])).toEqual([]);
    expect(kinds([attempt(9, "fell"), attempt(3, "fell"), attempt(1, "fell")])).toEqual([]);
  });

  it("flags no send in 21 days while still attending", () => {
    const flags = flagsFor([attempt(40, "sent"), attempt(15, "fell"), attempt(5, "fell", [], "red")], { now: NOW });
    expect(flags).toEqual([{ kind: "no_recent_send", reason: "No new send in 21 days across 2 attempts." }]);
  });

  it("does not flag a send drought for someone who stopped coming", () => {
    expect(kinds([attempt(40, "sent"), attempt(30, "fell")])).toEqual([]);
  });

  it("does not flag a send drought for a brand-new climber", () => {
    expect(kinds([attempt(3, "fell"), attempt(1, "fell", [], "red")])).toEqual([]);
  });

  it("clears when the coach marks the climber reviewed", () => {
    // Acceptance check 4, second half.
    const attempts = [attempt(2, "fell", ["reach"]), attempt(1, "fell", ["reach"])];
    expect(kinds(attempts, new Date(NOW.getTime() - 3_600_000))).toEqual([]);
  });

  it("comes back when the pattern repeats after the review", () => {
    const reviewedAt = new Date(daysAgo(3));
    const attempts = [
      attempt(5, "fell", ["reach"]),
      attempt(4, "fell", ["reach"]),
      attempt(2, "fell", ["reach"]),
      attempt(1, "sent", ["reach"]),
    ];
    expect(flagsFor(attempts, { now: NOW, reviewedAt })).toEqual([
      { kind: "repeated_finding", reason: "Reached at full extension on 2 attempts." },
    ]);
  });
});
