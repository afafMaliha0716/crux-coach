"use client";

import { useSyncExternalStore } from "react";
import type { Attempt, ClimberProfile } from "./types";

/**
 * Everything the climber app remembers, kept in the browser's localStorage.
 * Milestone 3 replaces this with accounts and a database.
 */
export interface AppState {
  profile: ClimberProfile | null;
  attempts: Attempt[];
  /** The session's route ids just before the latest attempt, to mark what it changed. */
  sessionBeforeLastAttempt: string[] | null;
  theme: "light" | "dark";
}

const KEY = "crux:v1";
const EMPTY: AppState = {
  profile: null,
  attempts: [],
  sessionBeforeLastAttempt: null,
  theme: "light",
};

let state: AppState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...(JSON.parse(raw) as Partial<AppState>) };
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(update: (current: AppState) => AppState) {
  load();
  state = update(state);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing: the session still works, it just won't be remembered.
  }
  listeners.forEach((listener) => listener());
}

export function resetState() {
  setState((current) => ({ ...EMPTY, theme: current.theme }));
}

/** `ready` is false on the server and during the first client render. */
export function useAppState(): { state: AppState; ready: boolean } {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => null,
  );
  return { state: snapshot ?? EMPTY, ready: snapshot !== null };
}
