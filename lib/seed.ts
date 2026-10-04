import seed from "../data/seed.json";
import type { Route, RouteBeta } from "./types";

/**
 * The example gym. Its routes and beta are seed data, and every screen that
 * shows them labels them as an example.
 */
export const GYM = seed.gym;
/** In set order, which is the tie-break order for the session builder. */
export const ROUTES = seed.routes as Route[];
export const ROUTE_BETA = seed.beta as RouteBeta[];

export function routeById(id: string): Route | undefined {
  return ROUTES.find((route) => route.id === id);
}

/** "Blue V4" */
export function routeLabel(route: Pick<Route, "colorName" | "grade">): string {
  return `${route.colorName} V${route.grade}`;
}
