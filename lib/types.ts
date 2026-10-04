/** Shared types. Units are inches, degrees and seconds unless a name says otherwise. */

export const TAGS = [
  "balance",
  "high foot",
  "lock-off",
  "dynamic",
  "body tension",
  "heel hook",
  "toe hook",
  "compression",
  "crimps",
  "slopers",
  "mantle",
] as const;
export type Tag = (typeof TAGS)[number];

export interface Route {
  id: string;
  colorName: string;
  colorHex: string;
  /** V scale: V0 is 0. */
  grade: number;
  wall: string;
  tags: Tag[];
  /** Hand-to-hand distance of the route's longest move. */
  longestMoveIn: number;
  status: "live" | "retired";
}

export type BetaSource = "setter" | "coach" | "derived";

/** Beta written for climbers within a height band. */
export interface RouteBeta {
  routeId: string;
  heightMinIn: number;
  heightMaxIn: number;
  text: string;
  source: BetaSource;
}

export type FindingId = "reach" | "bent";

export interface Finding {
  id: FindingId;
  title: string;
  /** Route tags that train the weakness behind this finding. */
  tags: Tag[];
}

export interface FocusArea {
  id: string;
  label: string;
  tags: Tag[];
}

export type Outcome = "sent" | "fell";

/** What the analysis measured on one attempt. */
export interface AttemptMetrics {
  /** Elbow angle of the reaching arm at the furthest reach. */
  peakElbowAngle: number;
  /** Height of the wrist above the shoulder at the furthest reach, in torso lengths. */
  peakReach: number;
  /** When the furthest reach happened, in seconds from the start of the clip. */
  peakTime: number;
  /** Whether a knee came above its hip in the 3 seconds before the furthest reach. */
  highFootBeforeReach: boolean;
  /** Share of overhead time spent with the arm bent under 95 degrees, 0 to 1. */
  bentArmShare: number;
}

export interface Attempt {
  id: string;
  routeId: string;
  /** ISO timestamp. */
  createdAt: string;
  source: "video" | "sample";
  outcome: Outcome;
  metrics: AttemptMetrics;
  findings: FindingId[];
  framesAnalyzed: number;
}

export interface ClimberProfile {
  heightIn: number;
  /** Arm span minus height. */
  apeIn: number;
  /** The grade the climber sends most sessions. */
  grade: number;
  focusAreas: string[];
}

/** One pose landmark, normalized to the frame: x and y run 0 to 1 from the top left. */
export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface PoseFrame {
  /** Seconds from the start of the clip. */
  t: number;
  /** The 33 pose landmarks, or null when no pose was found in this frame. */
  landmarks: (Landmark | undefined)[] | null;
}
