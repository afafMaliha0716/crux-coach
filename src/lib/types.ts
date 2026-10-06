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

export const WALLS = ["Slab", "Vertical", "Arete", "Cave", "Overhang 20°", "Overhang 30°", "Overhang 45°"] as const;

export interface Route {
  id: string;
  colorName: string;
  colorHex: string;
  /** V scale as an integer: V0 = 0. */
  grade: number;
  wall: string;
  tags: Tag[];
  /** Hand-to-hand distance of the longest move, in inches. Entered by the setter. */
  longestMoveIn: number;
  status: "live" | "retired";
  setAt: number;
  retiredAt?: number;
}

export interface RouteBeta {
  id: string;
  routeId: string;
  heightMinIn: number;
  heightMaxIn: number;
  text: string;
  source: "setter" | "coach";
}

export type FocusId = "tension" | "dyn" | "feet" | "bal" | "lock" | "hooks" | "comp";

export interface Profile {
  id: string;
  name: string;
  heightIn: number;
  apeIn: number;
  grade: number;
  focus: FocusId[];
  /** Has the paid Crux add-on. */
  member: boolean;
  /** Seeded example person, labelled as such in the UI. */
  example: boolean;
  onboarded: boolean;
}

export type FindingId = "reach" | "bent";

export interface Metrics {
  /** Elbow angle in degrees at the furthest reach. */
  peakAngle: number;
  /** Reach height at the furthest reach, in torso lengths. */
  peakReach: number;
  /** Time of the furthest reach, in seconds. */
  peakT: number;
  /** A knee rose above its hip in the 3 seconds before the furthest reach. */
  highFoot: boolean;
  /** Share of hands-overhead frames spent with an elbow under 95 degrees. */
  bentShare: number;
}

export interface Attempt {
  id: string;
  climberId: string;
  routeId: string;
  at: number;
  source: "video" | "sample" | "seed";
  outcome: "sent" | "fell";
  metrics?: Metrics;
  findings: FindingId[];
  framesAnalyzed: number;
  sharedWithCoach: boolean;
  example: boolean;
}

export interface CoachNote {
  id: string;
  climberId: string;
  body: string;
  at: number;
  readAt?: number;
}

export interface Review {
  climberId: string;
  at: number;
}

export interface Staff {
  id: string;
  name: string;
  role: "coach" | "setter" | "admin";
  example: boolean;
}

export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

export interface Frame {
  t: number;
  lm: (Landmark | undefined)[] | null;
}
