import type { Route } from "./types";

export const fmtHeight = (inches: number) => `${Math.floor(inches / 12)}'${inches % 12}"`;
export const routeLabel = (r: Pick<Route, "colorName" | "grade">) => `${r.colorName} V${r.grade}`;

export function timeAgo(at: number, now: number): string {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

let n = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(n++).toString(36)}`;
