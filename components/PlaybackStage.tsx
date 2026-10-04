"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawSampleWall, drawSkeleton, readPalette, reachingArm } from "@/lib/draw";
import type { PoseFrame } from "@/lib/types";

interface Props {
  frames: PoseFrame[];
  width: number;
  height: number;
  /** An object URL for the climber's clip, or null for a sample animation. */
  videoUrl: string | null;
  /** When the furthest reach happened. */
  peakTime: number;
  /** Whether that reach was flagged; if so the reaching arm is drawn in the accent color. */
  flagged: boolean;
}

/** How close to the peak, in seconds, the highlight shows. */
const HIGHLIGHT_WINDOW = 0.35;

/**
 * Attempt playback with the skeleton overlaid: the one place in the app with
 * expressive motion. The climber can scrub, play, or jump to the flagged moment.
 */
export function PlaybackStage({ frames, width, height, videoUrl, peakTime, flagged }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const duration = frames[frames.length - 1]?.t ?? 0;
  const [time, setTime] = useState(peakTime);
  const [playing, setPlaying] = useState(false);

  const draw = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const palette = readPalette();
      // The frame nearest to t.
      let frame = frames[0];
      for (const f of frames) if (Math.abs(f.t - t) < Math.abs(frame.t - t)) frame = f;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!videoUrl) drawSampleWall(ctx, canvas.width, canvas.height, palette);
      const hot = flagged && Math.abs(t - peakTime) <= HIGHLIGHT_WINDOW;
      drawSkeleton(ctx, frame?.landmarks ?? null, canvas.width, canvas.height, palette, {
        highlight: hot ? reachingArm(frame?.landmarks ?? null) : [],
        onVideo: !!videoUrl,
      });
    },
    [frames, videoUrl, flagged, peakTime],
  );

  useEffect(() => {
    draw(time);
  }, [draw, time]);

  // Sample animations are driven by a clock; real clips follow the video element.
  useEffect(() => {
    if (!playing) return;
    if (videoUrl) {
      const video = videoRef.current;
      if (!video) return;
      let raf = 0;
      const tick = () => {
        setTime(video.currentTime);
        if (video.ended) setPlaying(false);
        else raf = requestAnimationFrame(tick);
      };
      void video.play();
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        video.pause();
      };
    }
    const startedAt = performance.now();
    const from = time >= duration ? 0 : time;
    let raf = 0;
    const tick = (now: number) => {
      const t = from + (now - startedAt) / 1000;
      if (t >= duration) {
        setTime(duration);
        setPlaying(false);
        return;
      }
      setTime(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `time` is read once when playback starts; including it would restart every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, videoUrl, duration]);

  function seek(t: number) {
    setPlaying(false);
    setTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  return (
    <div className="-mx-4 flex flex-col gap-3">
      <div className="relative bg-surface" style={{ aspectRatio: `${width} / ${height}`, maxHeight: "70dvh" }}>
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedData={() => {
              if (videoRef.current) videoRef.current.currentTime = peakTime;
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          aria-label="Attempt playback with the skeleton overlaid"
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

      <div className="flex items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="h-10 w-16 rounded-[8px] border border-line bg-surface text-13 font-medium text-ink"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={Math.min(time, duration)}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Scrub through the attempt"
          className="h-10 flex-1"
        />
        <span className="num w-12 text-right text-13 text-muted">{time.toFixed(1)}s</span>
      </div>
      <div className="px-4">
        <button
          type="button"
          onClick={() => seek(peakTime)}
          className="text-13 font-medium text-ink underline underline-offset-4"
        >
          Jump to your furthest reach at <span className="num">{peakTime.toFixed(1)}s</span>
        </button>
      </div>
    </div>
  );
}
