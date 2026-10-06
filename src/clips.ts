import type { Frame } from "./lib/types";

/**
 * Clips and their pose frames are kept in memory only, for this visit.
 * Video never leaves the device and is never written to storage.
 */
export interface Clip {
  kind: "video" | "sample";
  frames: Frame[];
  width: number;
  height: number;
  videoUrl?: string;
}

const clips = new Map<string, Clip>();
export const saveClip = (attemptId: string, clip: Clip) => void clips.set(attemptId, clip);
export const getClip = (attemptId: string) => clips.get(attemptId);
