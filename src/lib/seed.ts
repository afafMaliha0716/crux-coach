import type { Attempt, Profile, Route, RouteBeta, Staff, Tag } from "./types";

/**
 * Example data for the demo gym. Everything created here is marked `example`
 * so the interface can label it. Nothing here is a real person or a real result.
 */
const DAY = 24 * 60 * 60 * 1000;

const R = (id: string, colorName: string, colorHex: string, grade: number, wall: string, tags: Tag[], longestMoveIn: number) => ({
  id, colorName, colorHex, grade, wall, tags, longestMoveIn,
});

const ROUTE_ROWS = [
  R("tan", "Tan", "#C9A27A", 0, "Slab", ["balance"], 40),
  R("yellow", "Yellow", "#E6B93A", 1, "Slab", ["balance", "high foot"], 44),
  R("mint", "Mint", "#8FD3B6", 1, "Vertical", ["dynamic"], 46),
  R("green", "Green", "#4E9A5B", 2, "Vertical", ["high foot", "lock-off"], 48),
  R("pink", "Pink", "#E58FB1", 2, "Slab", ["balance", "mantle"], 42),
  R("purple", "Purple", "#8662B8", 3, "Cave", ["body tension", "heel hook"], 50),
  R("orange", "Orange", "#E8873A", 3, "Vertical", ["high foot", "crimps"], 52),
  R("white", "White", "#EDE9E0", 3, "Overhang 20°", ["dynamic", "slopers"], 60),
  R("blue", "Blue", "#4F7FC4", 4, "Overhang 30°", ["body tension", "high foot", "lock-off"], 58),
  R("black", "Black", "#2B2B33", 4, "Arete", ["compression", "heel hook"], 54),
  R("red", "Red", "#D9533F", 4, "Vertical", ["crimps", "balance"], 50),
  R("teal", "Teal", "#3E9AA3", 5, "Cave", ["body tension", "toe hook"], 56),
  R("gray", "Gray", "#8D8F98", 5, "Overhang 30°", ["dynamic", "compression"], 64),
  R("lime", "Lime", "#B5D23C", 6, "Overhang 45°", ["body tension", "dynamic"], 62),
];

export function seedRoutes(now: number): Route[] {
  return ROUTE_ROWS.map((r, i) => ({ ...r, status: "live" as const, setAt: now - 12 * DAY + i * 60000 }));
}

export const SEED_BETA: RouteBeta[] = [
  {
    id: "beta-blue-short",
    routeId: "blue",
    heightMinIn: 56,
    heightMaxIn: 64,
    source: "setter",
    text: "Before the long move, bring your right foot up to the green jib at hip height. Stand on it, lock off with your left arm, then reach for the sloper with a bent arm.",
  },
  {
    id: "beta-blue-tall",
    routeId: "blue",
    heightMinIn: 65,
    heightMaxIn: 84,
    source: "setter",
    text: "Keep both feet low and reach the sloper static.",
  },
];

export const ME_ID = "me";

export function seedProfiles(): Profile[] {
  const ex = (id: string, name: string, heightIn: number, grade: number): Profile => ({
    id, name, heightIn, apeIn: 0, grade, focus: [], member: true, example: true, onboarded: true,
  });
  return [
    { id: ME_ID, name: "You", heightIn: 60, apeIn: 0, grade: 3, focus: [], member: true, example: false, onboarded: false },
    ex("maya", "Maya K.", 62, 4),
    ex("sam", "Sam R.", 71, 4),
    ex("dev", "Dev P.", 68, 3),
    ex("lena", "Lena W.", 65, 5),
    ex("chris", "Chris O.", 73, 2),
    ex("priya", "Priya N.", 64, 4),
  ];
}

export function seedAttempts(now: number): Attempt[] {
  let n = 0;
  const A = (climberId: string, routeId: string, daysAgo: number, outcome: "sent" | "fell"): Attempt => ({
    id: `seed-${n++}`, climberId, routeId, at: now - daysAgo * DAY, source: "seed", outcome,
    findings: [], framesAnalyzed: 0, sharedWithCoach: false, example: true,
  });
  return [
    // Maya: three falls on Blue V4 this week, a send elsewhere so she is not also a plateau.
    A("maya", "blue", 16, "fell"), A("maya", "blue", 12, "fell"), A("maya", "red", 10, "sent"),
    A("maya", "blue", 5, "fell"), A("maya", "blue", 3, "fell"), A("maya", "blue", 1, "fell"),
    // Sam: sent a month ago, nothing since.
    A("sam", "blue", 30, "sent"), A("sam", "red", 26, "sent"), A("sam", "black", 18, "fell"),
    A("sam", "teal", 12, "fell"), A("sam", "gray", 5, "fell"),
    // On track.
    A("dev", "green", 20, "sent"), A("dev", "purple", 9, "fell"), A("dev", "orange", 6, "sent"), A("dev", "purple", 2, "sent"),
    A("lena", "blue", 22, "sent"), A("lena", "blue", 15, "sent"), A("lena", "gray", 8, "fell"), A("lena", "teal", 3, "sent"),
    A("chris", "yellow", 19, "sent"), A("chris", "mint", 11, "sent"), A("chris", "green", 4, "sent"),
    A("priya", "blue", 17, "fell"), A("priya", "blue", 13, "sent"), A("priya", "black", 7, "sent"), A("priya", "red", 2, "sent"),
  ];
}

export const SEED_STAFF: Staff[] = [
  { id: "dana", name: "Dana (head coach)", role: "coach", example: true },
  { id: "jo", name: "Jo (setter)", role: "setter", example: true },
  { id: "alex", name: "Alex (gym manager)", role: "admin", example: true },
];

export const GYM_NAME = "Summit Bouldering";
