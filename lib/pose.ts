"use client";

import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { PoseFrame } from "./types";

/**
 * Pose tracking for a climber's clip, entirely in the browser.
 *
 * The video is read from the device, frame by frame, and never uploaded.
 * The only network requests are for the tracking code and the model file.
 */
const WASM_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/mediapipe/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export const MAX_CLIP_SECONDS = 45;

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })();
    // A failed load should be retried on the next clip, not cached.
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}

export class PoseLoadError extends Error {}
export class VideoPlayError extends Error {}

export interface TrackedClip {
  frames: PoseFrame[];
  width: number;
  height: number;
}

/**
 * Plays `video` once and records the pose in every frame it shows.
 * `onFrame` is called as it goes, for a live preview and a progress figure.
 */
export async function trackVideo(
  video: HTMLVideoElement,
  onFrame: (frame: PoseFrame, progress: number) => void,
): Promise<TrackedClip> {
  let landmarker: PoseLandmarker;
  try {
    landmarker = await getLandmarker();
  } catch {
    throw new PoseLoadError();
  }

  const limit = Math.min(video.duration || MAX_CLIP_SECONDS, MAX_CLIP_SECONDS);
  const frames: PoseFrame[] = [];
  video.currentTime = 0;
  video.muted = true;
  try {
    await video.play();
  } catch {
    throw new VideoPlayError();
  }

  let lastTime = -1;
  while (!video.ended && video.currentTime < limit) {
    // Only run the model when the video has moved on to a new frame.
    if (video.currentTime !== lastTime) {
      lastTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      const frame: PoseFrame = { t: video.currentTime, landmarks: result.landmarks[0] ?? null };
      frames.push(frame);
      onFrame(frame, Math.min(1, video.currentTime / limit));
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  video.pause();

  return { frames, width: video.videoWidth, height: video.videoHeight };
}
