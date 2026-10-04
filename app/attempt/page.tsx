"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BetaCard, FindingCard, MetricTile } from "@/components/cards";
import { PlaybackStage } from "@/components/PlaybackStage";
import { Button, SegmentedControl, Select } from "@/components/ui";
import { NO_CLIMBER_MESSAGE, analyzeAttempt, type AnalysisResult } from "@/lib/analysis";
import { drawSkeleton, readPalette } from "@/lib/draw";
import { GENERIC_SUGGESTION, feedbackFor } from "@/lib/feedback";
import { PoseLoadError, trackVideo } from "@/lib/pose";
import { betaForHeight } from "@/lib/reach";
import { SAMPLE_HEIGHT, SAMPLE_OUTCOME, SAMPLE_WIDTH, sampleFrames, type SampleId } from "@/lib/samples";
import { ROUTES, ROUTE_BETA, routeById, routeLabel } from "@/lib/seed";
import { buildSession } from "@/lib/session";
import { setState, useAppState } from "@/lib/store";
import type { Attempt, Outcome, PoseFrame } from "@/lib/types";

interface Analyzed {
  attempt: Attempt;
  result: AnalysisResult;
  frames: PoseFrame[];
  width: number;
  height: number;
  videoUrl: string | null;
}

/** Log an attempt: pick the route, give Crux a clip, read what it measured. */
export default function AttemptPage() {
  const { state, ready } = useAppState();
  const { profile } = state;

  const [routeId, setRouteId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("fell");
  const [showSamples, setShowSamples] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState<Analyzed | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const videoUrlRef = useRef<string | null>(null);

  // Release the clip when leaving the screen. It was never anywhere but this device.
  useEffect(
    () => () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    },
    [],
  );

  if (!ready || !profile) return <AppShell tabs={false}>{null}</AppShell>;

  const session = buildSession(profile, ROUTES, state.attempts);
  const fallbackRoute = session[session.length - 1]?.route ?? ROUTES[0];
  const route = routeById(routeId ?? "") ?? fallbackRoute;
  const busy = status !== null;

  /** Runs the same analysis for samples and real clips, then saves the attempt. */
  function finish(
    frames: PoseFrame[],
    width: number,
    height: number,
    source: Attempt["source"],
    attemptOutcome: Outcome,
    videoUrl: string | null,
  ) {
    const result = analyzeAttempt(frames, width, height);
    setStatus(null);
    if (!result) {
      setError(NO_CLIMBER_MESSAGE);
      return;
    }
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      routeId: route.id,
      createdAt: new Date().toISOString(),
      source,
      outcome: attemptOutcome,
      metrics: result.metrics,
      findings: result.findings,
      framesAnalyzed: result.framesUsed,
    };
    setState((s) => ({
      ...s,
      attempts: [...s.attempts, attempt],
      sessionBeforeLastAttempt: session.map((entry) => entry.route.id),
    }));
    setAnalyzed({ attempt, result, frames, width, height, videoUrl });
  }

  function runSample(id: SampleId) {
    setError(null);
    finish(sampleFrames(id), SAMPLE_WIDTH, SAMPLE_HEIGHT, "sample", SAMPLE_OUTCOME[id], null);
  }

  async function runVideo(file: File) {
    setError(null);
    setStatus("Loading pose tracking. The first time takes a few seconds.");
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    const url = URL.createObjectURL(file);
    videoUrlRef.current = url;

    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("video"));
      });
      const palette = readPalette();
      const clip = await trackVideo(video, (frame, progress) => {
        setStatus(`Tracking your movement: ${Math.round(progress * 100)}%`);
        const canvas = previewRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawSkeleton(ctx, frame.landmarks, canvas.width, canvas.height, palette, { onVideo: true });
      });
      finish(clip.frames, clip.width, clip.height, "video", outcome, url);
    } catch (cause) {
      setStatus(null);
      setError(
        cause instanceof PoseLoadError
          ? "Pose tracking could not start in this browser. Try Chrome or Safari on a recent phone or laptop, or use a sample."
          : "That clip could not be played. Try an MP4 or MOV under a minute long.",
      );
    }
  }

  if (analyzed) {
    const { attempt, result } = analyzed;
    const m = result.metrics;
    const lines = feedbackFor(m, result.findings);
    const attemptRoute = routeById(attempt.routeId) ?? route;
    const mainFinding = result.findings[0];
    return (
      <AppShell tabs={false}>
        <div>
          <p className="text-13 text-muted">
            {routeLabel(attemptRoute)}, {attempt.outcome === "sent" ? "sent" : "fell"}
            {attempt.source === "sample" ? ", sample animation" : ""}
          </p>
          <h1 className="text-24 font-semibold text-ink">{lines[0].title}</h1>
        </div>

        <PlaybackStage
          frames={analyzed.frames}
          width={analyzed.width}
          height={analyzed.height}
          videoUrl={analyzed.videoUrl}
          peakTime={m.peakTime}
          flagged={result.findings.includes("reach")}
        />

        <div className="grid grid-cols-2 gap-3">
          <MetricTile value={`${Math.round(m.peakElbowAngle)}°`} label="Elbow angle at furthest reach" />
          <MetricTile value={`${m.peakReach.toFixed(1)}×`} label="Reach height, in torso lengths" />
          <MetricTile value={m.highFootBeforeReach ? "Yes" : "No"} label="High foot set before the reach" />
          <MetricTile value={`${Math.round(m.bentArmShare * 100)}%`} label="Overhead time on bent arms" />
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <FindingCard key={line.id} line={line} />
          ))}
        </div>

        {mainFinding && (
          <BetaCard
            route={attemptRoute}
            beta={mainFinding === "reach" ? betaForHeight(ROUTE_BETA, attemptRoute.id, profile.heightIn) : null}
            fallback={GENERIC_SUGGESTION[mainFinding]}
            heightIn={profile.heightIn}
          />
        )}

        <p className="text-13 text-muted">
          {attempt.source === "video"
            ? "This clip was analyzed on your device and was not uploaded. "
            : ""}
          Sharing a clip with a coach arrives when your gym connects its coaches.{" "}
          <span className="num">{attempt.framesAnalyzed}</span> frames analyzed.
        </p>

        <div className="mt-auto flex flex-col gap-3">
          <Link
            href="/"
            className="flex h-12 items-center justify-center rounded-[12px] bg-accent text-15 font-semibold text-accent-fg"
          >
            See my updated session
          </Link>
          <Button onClick={() => setAnalyzed(null)}>Log another attempt</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell tabs={false}>
      <div>
        <Link href="/" className="text-13 text-muted underline underline-offset-4">
          Back to Today
        </Link>
        <h1 className="mt-2 text-24 font-semibold text-ink">Log an attempt</h1>
      </div>

      <Select label="Route" value={route.id} onChange={(e) => setRouteId(e.target.value)} disabled={busy}>
        {session.map((entry) => (
          <option key={entry.route.id} value={entry.route.id}>
            {routeLabel(entry.route)}, {entry.slot}
          </option>
        ))}
        {/* The samples are filmed on Blue V4, which may not be in this climber's session. */}
        {!session.some((entry) => entry.route.id === route.id) && (
          <option value={route.id}>{routeLabel(route)}</option>
        )}
      </Select>

      <div className="flex flex-col gap-1">
        <p className="text-13 text-muted">How did it go?</p>
        <SegmentedControl
          label="Outcome"
          value={outcome}
          options={[
            { value: "fell", label: "Fell" },
            { value: "sent", label: "Sent" },
          ]}
          onChange={setOutcome}
        />
      </div>

      {busy && (
        <div className="flex flex-col gap-2">
          <canvas ref={previewRef} className="w-full rounded-[12px] border border-line bg-surface" />
          <p className="text-ink" aria-live="polite">
            {status}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-[12px] bg-flag-bg p-4 text-ink">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-4">
        <p className="text-13 text-muted">
          Film from behind with your whole body in frame, up to 45 seconds. The clip is analyzed on
          your device and is not uploaded.
        </p>
        <Button variant="primary" full disabled={busy} onClick={() => fileRef.current?.click()}>
          Choose a clip
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void runVideo(file);
          }}
        />

        {showSamples ? (
          <div className="flex flex-col gap-2">
            <p className="text-13 text-muted">
              Two animated attempts on Blue V4. They run through the same analysis as a real clip.
            </p>
            <Button disabled={busy} onClick={() => runSample("fall")}>
              Sample: fall at the crux
            </Button>
            <Button disabled={busy} onClick={() => runSample("send")}>
              Sample: with the new beta
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowSamples(true);
              setRouteId("blue");
            }}
            className="self-center text-13 font-medium text-ink underline underline-offset-4"
          >
            No clip yet? Try a sample
          </button>
        )}
      </div>
    </AppShell>
  );
}
