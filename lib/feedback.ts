import type { AttemptMetrics, FindingId } from "./types";

export interface FeedbackLine {
  id: FindingId | "clean";
  title: string;
  /** One plain sentence that points at a number and a moment. */
  body: string;
}

/** Generic suggestion shown when a route has no beta written for the climber's height. */
export const GENERIC_SUGGESTION: Record<FindingId, string> = {
  reach: "Move a foot up to hip height before the long move, then reach with a bent arm.",
  bent: "Between moves, hang with straight arms and let your legs take the weight.",
};

/** Feedback for an attempt: every line states what was measured and when. */
export function feedbackFor(metrics: AttemptMetrics, findings: FindingId[]): FeedbackLine[] {
  const angle = Math.round(metrics.peakElbowAngle);
  const at = `${metrics.peakTime.toFixed(1)}s`;
  const lines: FeedbackLine[] = [];

  if (findings.includes("reach")) {
    lines.push({
      id: "reach",
      title: "Reached at full extension",
      body: metrics.highFootBeforeReach
        ? `At ${at} your arm was straight (${angle}°) with a high foot already set. The hold is at the edge of your span.`
        : `At ${at} your arm was straight (${angle}°) with both feet still low. There was no height left to gain.`,
    });
  }
  if (findings.includes("bent")) {
    lines.push({
      id: "bent",
      title: "Hanging on bent arms",
      body: `You held a bent-arm position for ${Math.round(metrics.bentArmShare * 100)}% of the time your hands were overhead. Straight arms between moves save energy.`,
    });
  }
  if (lines.length === 0) {
    lines.push({
      id: "clean",
      title: "Clean movement",
      body: `At ${at} you reached with a bent arm (${angle}°)${metrics.highFootBeforeReach ? " from a high foot" : ""}. Nothing flagged on this attempt.`,
    });
  }
  return lines;
}
