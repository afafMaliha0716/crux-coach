import type { Landmark } from "./lib/types";

/**
 * Loads MediaPipe Pose from this site's own files (public/pose, copied from
 * node_modules by scripts/copy-pose.mjs). Video is analyzed in the browser and
 * is never uploaded.
 */
interface PoseInstance {
  setOptions(o: Record<string, unknown>): void;
  onResults(cb: (r: { poseLandmarks?: Landmark[] }) => void): void;
  initialize(): Promise<void>;
  send(input: { image: HTMLVideoElement }): Promise<void>;
}
declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => PoseInstance;
  }
}

const BASE = import.meta.env.BASE_URL + "pose/";
let ready: Promise<PoseTracker> | null = null;

export interface PoseTracker {
  /** Runs the model on the video's current frame and returns its landmarks, or null if no body was found. */
  detect(video: HTMLVideoElement): Promise<Landmark[] | null>;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

export function getPoseTracker(): Promise<PoseTracker> {
  if (ready) return ready;
  ready = (async () => {
    if (!window.Pose) await loadScript(BASE + "pose.js");
    if (!window.Pose) throw new Error("Pose library did not load");
    const pose = new window.Pose({ locateFile: (f) => BASE + f });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    let last: Landmark[] | null = null;
    pose.onResults((r) => {
      last = r.poseLandmarks ?? null;
    });
    await Promise.race([
      pose.initialize(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Pose model timed out")), 40000)),
    ]);
    return {
      async detect(video) {
        last = null;
        await pose.send({ image: video });
        return last;
      },
    };
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}
