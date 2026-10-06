import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip } from "../clips";
import { drawSkeleton, drawWall } from "../draw";

/**
 * Replays an analyzed attempt with the skeleton overlay. The climber can scrub
 * through it and jump to the flagged moment.
 */
export function Playback({ clip, flaggedT, flagged }: { clip: Clip; flaggedT?: number; flagged: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const raf = useRef(0);
  const end = clip.frames.length ? clip.frames[clip.frames.length - 1].t : 0;
  const [t, setT] = useState(flaggedT ?? 0);
  const [playing, setPlaying] = useState(false);

  const frameAt = useCallback(
    (time: number) => {
      let best = clip.frames[0];
      for (const f of clip.frames) if (Math.abs(f.t - time) < Math.abs(best.t - time)) best = f;
      return best;
    },
    [clip],
  );

  const paint = useCallback(
    (time: number) => {
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      if (clip.kind === "video" && video.current) ctx.drawImage(video.current, 0, 0, c.width, c.height);
      else drawWall(ctx, c.width, c.height);
      const near = flagged && flaggedT !== undefined && Math.abs(time - flaggedT) < 0.25;
      drawSkeleton(ctx, frameAt(time)?.lm ?? null, c.width, c.height, near);
    },
    [clip, flagged, flaggedT, frameAt],
  );

  // Set up the hidden video element for uploaded clips.
  useEffect(() => {
    if (clip.kind !== "video" || !clip.videoUrl) return;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = clip.videoUrl;
    v.onseeked = () => paint(v.currentTime);
    v.onloadeddata = () => {
      v.currentTime = flaggedT ?? 0;
    };
    video.current = v;
    return () => {
      v.pause();
      video.current = null;
    };
  }, [clip, flaggedT, paint]);

  // Scrubbing.
  useEffect(() => {
    if (playing) return;
    const v = video.current;
    if (clip.kind === "video" && v && v.readyState >= 1) v.currentTime = t;
    else paint(t);
  }, [t, playing, clip, paint]);

  // Playing.
  useEffect(() => {
    if (!playing) return;
    const v = video.current;
    const startWall = performance.now();
    const startT = t >= end - 0.05 ? 0 : t;
    if (clip.kind === "video" && v) {
      v.currentTime = startT;
      void v.play();
    }
    const tick = (now: number) => {
      const time = clip.kind === "video" && v ? v.currentTime : startT + (now - startWall) / 1000;
      if (time >= end || (v && clip.kind === "video" && v.ended)) {
        setT(end);
        setPlaying(false);
        return;
      }
      paint(time);
      setT(time);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      v?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <div className="stack tight">
      <div className="stage">
        <canvas ref={canvas} width={clip.width} height={clip.height} aria-label="Attempt playback with the tracked skeleton" />
      </div>
      <div className="scrub">
        <button className="btn" type="button" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          id="scrubber"
          type="range"
          min={0}
          max={end}
          step={0.01}
          value={Math.min(t, end)}
          aria-label="Scrub through the attempt"
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
        />
        <span className="mono small">{t.toFixed(1)}s</span>
      </div>
      {flaggedT !== undefined && (
        <div>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setPlaying(false);
              setT(flaggedT);
            }}
          >
            <span>
              Jump to the furthest reach, <span className="mono">{flaggedT.toFixed(1)}s</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
