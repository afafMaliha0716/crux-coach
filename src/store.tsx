import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { newId } from "./lib/format";
import { ME_ID, SEED_BETA, SEED_STAFF, seedAttempts, seedProfiles, seedRoutes } from "./lib/seed";
import { buildSession } from "./lib/session";
import type { Attempt, CoachNote, Profile, Review, Route, RouteBeta, Staff } from "./lib/types";

/**
 * All app data lives here and is saved to this browser's localStorage, so the
 * demo needs no account and no server. Swapping this file for a real backend is
 * the main step from demo to product (see README).
 */
export interface State {
  v: 1;
  profiles: Profile[];
  routes: Route[];
  beta: RouteBeta[];
  attempts: Attempt[];
  notes: CoachNote[];
  reviews: Review[];
  staff: Staff[];
  prices: { member: number; crux: number };
  /** The session's route ids just before the latest attempt, used to mark what changed. */
  sessionBefore: string[] | null;
}

const KEY = "crux:v1";

function fresh(): State {
  const now = Date.now();
  return {
    v: 1,
    profiles: seedProfiles(),
    routes: seedRoutes(now),
    beta: SEED_BETA,
    attempts: seedAttempts(now),
    notes: [],
    reviews: [],
    staff: SEED_STAFF,
    prices: { member: 15, crux: 5 },
    sessionBefore: null,
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s && s.v === 1 && Array.isArray(s.routes)) return s;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return fresh();
}

interface Store {
  state: State;
  me: Profile;
  myAttempts: Attempt[];
  updateMe: (patch: Partial<Profile>) => void;
  logAttempt: (a: Omit<Attempt, "id" | "climberId" | "example" | "sharedWithCoach">) => Attempt;
  setShared: (attemptId: string, shared: boolean) => void;
  sendNote: (climberId: string, body: string) => void;
  markNoteRead: (id: string) => void;
  markReviewed: (climberId: string) => void;
  addRoute: (r: Omit<Route, "id" | "status" | "setAt">) => string;
  updateRoute: (id: string, patch: Partial<Route>) => void;
  retireRoute: (id: string) => void;
  resetWall: (wall: string) => void;
  addBeta: (b: Omit<RouteBeta, "id">) => void;
  removeBeta: (id: string) => void;
  setMember: (profileId: string, member: boolean) => void;
  setPrices: (p: { member: number; crux: number }) => void;
  addStaff: (name: string, role: Staff["role"]) => void;
  removeStaff: (id: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore: the app still works for this visit */
    }
  }, [state]);

  const up = useCallback((fn: (s: State) => State) => setState(fn), []);

  const store = useMemo<Store>(() => {
    const me = state.profiles.find((p) => p.id === ME_ID)!;
    const myAttempts = state.attempts.filter((a) => a.climberId === ME_ID);
    return {
      state,
      me,
      myAttempts,
      updateMe: (patch) =>
        up((s) => ({ ...s, sessionBefore: null, profiles: s.profiles.map((p) => (p.id === ME_ID ? { ...p, ...patch } : p)) })),
      logAttempt: (a) => {
        const attempt: Attempt = { ...a, id: newId("att"), climberId: ME_ID, example: false, sharedWithCoach: false };
        up((s) => {
          const mine = s.attempts.filter((x) => x.climberId === ME_ID);
          const meNow = s.profiles.find((p) => p.id === ME_ID)!;
          const before = buildSession(meNow, s.routes, mine).map((e) => e.route.id);
          return { ...s, sessionBefore: before, attempts: [...s.attempts, attempt] };
        });
        return attempt;
      },
      setShared: (attemptId, shared) =>
        up((s) => ({ ...s, attempts: s.attempts.map((a) => (a.id === attemptId ? { ...a, sharedWithCoach: shared } : a)) })),
      sendNote: (climberId, body) =>
        up((s) => ({ ...s, notes: [...s.notes, { id: newId("note"), climberId, body, at: Date.now() }] })),
      markNoteRead: (id) => up((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, readAt: Date.now() } : n)) })),
      markReviewed: (climberId) =>
        up((s) => ({ ...s, reviews: [...s.reviews.filter((r) => r.climberId !== climberId), { climberId, at: Date.now() }] })),
      addRoute: (r) => {
        const id = newId("route");
        up((s) => ({ ...s, sessionBefore: null, routes: [...s.routes, { ...r, id, status: "live", setAt: Date.now() }] }));
        return id;
      },
      updateRoute: (id, patch) => up((s) => ({ ...s, routes: s.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      retireRoute: (id) =>
        up((s) => ({ ...s, sessionBefore: null, routes: s.routes.map((r) => (r.id === id ? { ...r, status: "retired", retiredAt: Date.now() } : r)) })),
      resetWall: (wall) =>
        up((s) => ({
          ...s,
          sessionBefore: null,
          routes: s.routes.map((r) => (r.wall === wall && r.status === "live" ? { ...r, status: "retired", retiredAt: Date.now() } : r)),
        })),
      addBeta: (b) => up((s) => ({ ...s, beta: [...s.beta, { ...b, id: newId("beta") }] })),
      removeBeta: (id) => up((s) => ({ ...s, beta: s.beta.filter((b) => b.id !== id) })),
      setMember: (profileId, member) =>
        up((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, member } : p)) })),
      setPrices: (prices) => up((s) => ({ ...s, prices })),
      addStaff: (name, role) => up((s) => ({ ...s, staff: [...s.staff, { id: newId("staff"), name, role, example: false }] })),
      removeStaff: (id) => up((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== id) })),
      resetDemo: () => setState(fresh()),
    };
  }, [state, up]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

/** The time a coach last marked this climber reviewed, if ever. */
export function lastReview(state: State, climberId: string): number | undefined {
  return state.reviews.find((r) => r.climberId === climberId)?.at;
}
