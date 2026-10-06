import { useEffect, useMemo, useRef, useState } from "react";
import { getClip, saveClip, type Clip } from "../clips";
import { Playback } from "../components/Playback";
import { Empty, Metric, RouteCard, RouteName } from "../components/ui";
import { drawSkeleton, drawWall } from "../draw";
import { RULES, analyze } from "../lib/analysis";
import { fmtHeight, routeLabel, timeAgo } from "../lib/format";
import { spanIn } from "../lib/reach";
import { SAMPLE_SIZE, sampleFrames, type SampleId } from "../lib/samples";
import { FINDINGS, FOCUS, buildSession } from "../lib/session";
import type { Attempt, FindingId, FocusId, Frame, Metrics, Profile, Route, RouteBeta } from "../lib/types";
import { getPoseTracker } from "../pose";
import { go } from "../router";
import { clipKey, getSavedClip, listSavedClips, removeSavedClip, saveClipForLater, type SavedClip } from "../savedClips";
import { useStore } from "../store";

/* ---------- shared profile fields ---------- */

function BodyFields({ draft, set }: { draft: Profile; set: (p: Partial<Profile>) => void }) {
  const ft = Math.floor(draft.heightIn / 12), inch = draft.heightIn % 12;
  return (
    <div className="stack tight">
      <div className="field">
        <span>Height</span>
        <div className="row">
          <select id="height-ft" aria-label="Feet" className="input grow" value={ft} onChange={(e) => set({ heightIn: Number(e.target.value) * 12 + inch })}>
            {[4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} ft</option>
            ))}
          </select>
          <select id="height-in" aria-label="Inches" className="input grow" value={inch} onChange={(e) => set({ heightIn: ft * 12 + Number(e.target.value) })}>
            {Array.from({ length: 12 }, (_, n) => (
              <option key={n} value={n}>{n} in</option>
            ))}
          </select>
        </div>
      </div>
      <label className="field" htmlFor="ape">
        Ape index, in inches
        <input
          id="ape"
          type="number"
          min={-4}
          max={6}
          step={1}
          value={draft.apeIn}
          onChange={(e) => set({ apeIn: Math.max(-4, Math.min(6, Math.round(Number(e.target.value) || 0))) })}
        />
        <span className="hint">Your fingertip-to-fingertip arm span minus your height. Leave it at 0 if you have not measured.</span>
      </label>
    </div>
  );
}

function GradeField({ draft, set }: { draft: Profile; set: (p: Partial<Profile>) => void }) {
  return (
    <label className="field" htmlFor="grade">
      The grade you send most sessions
      <select id="grade" value={draft.grade} onChange={(e) => set({ grade: Number(e.target.value) })}>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>V{n}</option>
        ))}
      </select>
    </label>
  );
}

function FocusField({ draft, set }: { draft: Profile; set: (p: Partial<Profile>) => void }) {
  const toggle = (id: FocusId) => set({ focus: draft.focus.includes(id) ? draft.focus.filter((x) => x !== id) : [...draft.focus, id] });
  return (
    <div className="field">
      <span>What you want to work on</span>
      <div className="chips">
        {FOCUS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={draft.focus.includes(f.id)} onClick={() => toggle(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- onboarding ---------- */

export function Onboarding() {
  const { me, updateMe } = useStore();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(me);
  const set = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }));
  const finish = (p: Profile) => {
    updateMe({ ...p, onboarded: true });
    go("climber/today");
  };
  const titles = ["Your body", "Your grade", "Your focus"];
  return (
    <div className="stack" style={{ maxWidth: 440 }}>
      <div className="stack tight">
        <span className="steps">Step {step + 1} of 3</span>
        <h1>{titles[step]}</h1>
        <p>
          {step === 0 && "Crux fits every recommendation to your height and reach."}
          {step === 1 && "Your session is built around this grade: one climb below it, one at it, one above."}
          {step === 2 && "Pick anything you want to get better at. You can change it later."}
        </p>
      </div>
      {step === 0 && <BodyFields draft={draft} set={set} />}
      {step === 1 && <GradeField draft={draft} set={set} />}
      {step === 2 && <FocusField draft={draft} set={set} />}
      <div className="row">
        {step > 0 && (
          <button className="btn" type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {step < 2 ? (
          <button className="btn primary" type="button" onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <button className="btn primary" type="button" onClick={() => finish(draft)}>
            Build my session
          </button>
        )}
      </div>
      <button className="btn quiet" type="button" style={{ alignSelf: "flex-start" }} onClick={() => finish({ ...me, heightIn: 60, apeIn: 0, grade: 3, focus: ["tension", "dyn"] })}>
        Skip with an example profile (5'0", V3)
      </button>
    </div>
  );
}

/* ---------- today ---------- */

export function Today() {
  const { state, me, myAttempts, markNoteRead } = useStore();
  const session = useMemo(() => buildSession(me, state.routes, myAttempts), [me, state.routes, myAttempts]);
  const note = [...state.notes].reverse().find((n) => n.climberId === me.id && !n.readAt);
  const before = state.sessionBefore;
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Today's session</h1>
        <p>
          Three climbs from the {state.routes.filter((r) => r.status === "live").length} routes on the wall right now, picked for someone{" "}
          <span className="mono">{fmtHeight(me.heightIn)}</span> climbing <span className="mono">V{me.grade}</span>.
        </p>
      </div>
      {note && (
        <div className="note" role="status">
          <span className="label">Note from your coach · {timeAgo(note.at, Date.now())}</span>
          <p style={{ color: "var(--ink)" }}>{note.body}</p>
          <button className="btn quiet" type="button" style={{ alignSelf: "flex-start", paddingInline: 0 }} onClick={() => markNoteRead(note.id)}>
            Got it
          </button>
        </div>
      )}
      {session.length ? (
        <div className="cards3">
          {session.map((e) => (
            <RouteCard key={e.route.id} entry={e} spanIn={spanIn(me)} isNew={!!before && !before.includes(e.route.id)} />
          ))}
        </div>
      ) : (
        <Empty>No live routes match your grade yet. Ask a setter to add some on the Setter view.</Empty>
      )}
      <a className="btn primary big" href="#/climber/attempt">
        Log an attempt
      </a>
    </div>
  );
}

/* ---------- attempt ---------- */

function betaFor(route: Route, beta: RouteBeta[], heightIn: number): RouteBeta | undefined {
  return beta.find((b) => b.routeId === route.id && heightIn >= b.heightMinIn && heightIn <= b.heightMaxIn);
}

export function Results({ analysis, route, beta, heightIn }: { analysis: Metrics & { findings: FindingId[] }; route?: Route; beta: RouteBeta[]; heightIn: number }) {
  const a = analysis;
  const b = route ? betaFor(route, beta, heightIn) : undefined;
  return (
    <div className="stack tight">
      <div className="metrics">
        <Metric value={`${Math.round(a.peakAngle)}°`} label="Elbow angle at furthest reach" />
        <Metric value={`${a.peakReach.toFixed(1)}×`} label="Reach height, in torso lengths" />
        <Metric value={a.highFoot ? "Yes" : "No"} label="High foot set before the reach" />
        <Metric value={`${Math.round(a.bentShare * 100)}%`} label="Time locked off on bent arms" />
      </div>
      {a.findings.includes("reach") && (
        <div className="finding">
          <b>{FINDINGS.reach.title}</b>
          <span>
            At <span className="mono">{a.peakT.toFixed(1)}s</span> your arm was straight (<span className="mono">{Math.round(a.peakAngle)}°</span>){" "}
            {a.highFoot ? "with a high foot already set. The hold is at the edge of your span." : "with both feet still low. There was no height left to gain."}
          </span>
        </div>
      )}
      {a.findings.includes("bent") && (
        <div className="finding">
          <b>{FINDINGS.bent.title}</b>
          <span>
            You held a bent-arm position for <span className="mono">{Math.round(a.bentShare * 100)}%</span> of the time your hands were overhead.{" "}
            {FINDINGS.bent.suggestion}
          </span>
        </div>
      )}
      {a.findings.length === 0 && (
        <div className="finding ok">
          <b>Clean movement</b>
          {a.peakAngle >= RULES.fullExtensionAngle ? (
            <span>
              Your arm was straight (<span className="mono">{Math.round(a.peakAngle)}°</span>) at the furthest reach, but your hand was only{" "}
              <span className="mono">{a.peakReach.toFixed(1)}</span> torso lengths above your shoulder, so you were not stretched out. Nothing flagged on this attempt.
            </span>
          ) : (
            <span>
              You reached with a bent arm (<span className="mono">{Math.round(a.peakAngle)}°</span>){a.highFoot ? " from a high foot" : ""}. Nothing flagged on this
              attempt.
            </span>
          )}
        </div>
      )}
      {a.findings.includes("reach") &&
        (b ? (
          <div className="beta">
            <span className="label">
              Beta for climbers {fmtHeight(b.heightMinIn)} to {fmtHeight(b.heightMaxIn)} · written by the {b.source}
            </span>
            <p style={{ color: "var(--ink)" }}>{b.text}</p>
          </div>
        ) : (
          <div className="beta">
            <span className="label">Try this</span>
            <p style={{ color: "var(--ink)" }}>{FINDINGS.reach.suggestion}</p>
            <span className="small muted">No beta has been written for your height on this route yet.</span>
          </div>
        ))}
    </div>
  );
}

/** Only the first part of a long clip is analyzed. */
const MAX_CLIP_S = 45;
/** Pose is sampled this many times per second of video. */
const SAMPLE_FPS = 10;
/** On a slow device the sampling rate drops, but never below this. */
const MIN_FPS = 3;
/** Target for how long analysis of one clip should take, in seconds. */
const TIME_BUDGET_S = 75;

type Phase = { kind: "idle" } | { kind: "working"; status: string } | { kind: "error"; message: string } | { kind: "done"; attemptId: string; saved: boolean };

export function AttemptScreen() {
  const { state, me, myAttempts, logAttempt, setShared } = useStore();
  const session = useMemo(() => buildSession(me, state.routes, myAttempts), [me, state.routes, myAttempts]);
  const live = state.routes.filter((r) => r.status === "live");
  const [routeId, setRouteId] = useState(() => session[session.length - 1]?.route.id ?? live[0]?.id ?? "");
  const [outcome, setOutcome] = useState<"fell" | "sent">("fell");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<SavedClip[]>([]);
  const refreshSaved = () => void listSavedClips().then((list) => alive.current && setSaved(list));
  const alive = useRef(true);
  const cancelled = useRef(false);
  useEffect(() => {
    alive.current = true;
    refreshSaved();
    return () => {
      alive.current = false;
    };
  }, []);

  // A resting frame so the stage is never blank.
  useEffect(() => {
    if (phase.kind !== "idle") return;
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = SAMPLE_SIZE.width;
    c.height = SAMPLE_SIZE.height;
    drawWall(ctx, c.width, c.height);
    drawSkeleton(ctx, sampleFrames("fall")[0].lm, c.width, c.height);
  }, [phase.kind]);

  const finish = (frames: Frame[], clip: Clip, source: "video" | "sample", result: "fell" | "sent", onRoute: string, trimmed = false, fromSaved = false): boolean => {
    const a = analyze(frames, clip.width, clip.height);
    if (!a) {
      if (clip.videoUrl) URL.revokeObjectURL(clip.videoUrl);
      setPhase({
        kind: "error",
        message: "Crux could not find a climber in this clip. Film from behind, keep the whole body in frame, and stand close enough that the climber fills at least a third of the height.",
      });
      return false;
    }
    const { findings, usableFrames, ...metrics } = a;
    const attempt = logAttempt({ routeId: onRoute, at: Date.now(), source, outcome: result, metrics, findings, framesAnalyzed: usableFrames, framesSampled: frames.length, trimmed });
    saveClip(attempt.id, clip);
    setPhase({ kind: "done", attemptId: attempt.id, saved: fromSaved });
    return true;
  };

  /** Opens a clip that was analyzed earlier on this device. No tracking is needed. */
  const openSaved = (rec: SavedClip) => {
    const url = URL.createObjectURL(rec.file);
    finish(rec.frames, { kind: "video", frames: rec.frames, width: rec.width, height: rec.height, videoUrl: url }, "video", outcome, routeId, rec.trimmed, true);
  };

  const runSample = (which: SampleId) => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    c.width = SAMPLE_SIZE.width;
    c.height = SAMPLE_SIZE.height;
    const frames = sampleFrames(which);
    const end = frames[frames.length - 1].t;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    setPhase({ kind: "working", status: "Tracking pose…" });
    const step = (now: number) => {
      if (!alive.current) return;
      const t = reduce ? end : Math.min(end, (now - t0) / 1000);
      const f = frames[Math.min(frames.length - 1, Math.round(t * 30))];
      drawWall(ctx, c.width, c.height);
      drawSkeleton(ctx, f.lm, c.width, c.height);
      if (t < end) requestAnimationFrame(step);
      else finish(frames, { kind: "sample", frames, ...SAMPLE_SIZE }, "sample", which === "fall" ? "fell" : "sent", "blue");
    };
    requestAnimationFrame(step);
  };

  const runVideo = async (f: File) => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    cancelled.current = false;
    const known = await getSavedClip(clipKey(f));
    if (known) {
      openSaved(known);
      return;
    }
    setPhase({ kind: "working", status: "Loading the pose model. The first time takes a few seconds…" });
    let tracker;
    try {
      tracker = await getPoseTracker();
    } catch {
      setPhase({ kind: "error", message: "Pose tracking could not start in this browser. Try Chrome on a laptop, or use a sample attempt." });
      return;
    }
    const url = URL.createObjectURL(f);
    try {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      await new Promise<void>((res, rej) => {
        v.onloadeddata = () => res();
        v.onerror = () => rej(new Error("video"));
      });
      const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
      const width = Math.round(v.videoWidth * scale), height = Math.round(v.videoHeight * scale);
      c.width = width;
      c.height = height;
      const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : MAX_CLIP_S;
      const limit = Math.min(duration, MAX_CLIP_S);

      // Step through the clip frame by frame instead of playing it, so a slow laptop
      // samples the same moments as a fast one. It just takes longer.
      const seek = (t: number) =>
        new Promise<void>((res) => {
          const done = () => {
            v.removeEventListener("seeked", done);
            clearTimeout(timer);
            res();
          };
          const timer = setTimeout(done, 2000);
          v.addEventListener("seeked", done);
          v.currentTime = t;
        });

      const frames: Frame[] = [];
      let fps = SAMPLE_FPS;
      const started = performance.now();
      for (let t = 0.001; t < limit; t += 1 / fps) {
        if (!alive.current || cancelled.current) {
          URL.revokeObjectURL(url);
          if (alive.current) setPhase({ kind: "idle" });
          return;
        }
        await seek(t);
        const lm = await tracker.detect(v);
        ctx.drawImage(v, 0, 0, width, height);
        drawSkeleton(ctx, lm, width, height);
        frames.push({ t, lm });
        if (frames.length === 5) {
          // Slow device: sample less often so the whole clip still finishes in about a minute.
          const perFrame = (performance.now() - started) / 5000;
          if (perFrame * limit * fps > TIME_BUDGET_S) fps = Math.max(MIN_FPS, TIME_BUDGET_S / (perFrame * limit));
        }
        setPhase({ kind: "working", status: `Tracking pose… ${Math.round((100 * t) / limit)}%` });
        await new Promise((r) => requestAnimationFrame(r));
      }
      const trimmed = duration > MAX_CLIP_S;
      if (finish(frames, { kind: "video", frames, width, height, videoUrl: url }, "video", outcome, routeId, trimmed)) {
        await saveClipForLater({ key: clipKey(f), name: f.name, file: f, frames, width, height, trimmed, savedAt: Date.now() });
        refreshSaved();
      }
    } catch {
      URL.revokeObjectURL(url);
      setPhase({
        kind: "error",
        message:
          "This browser could not play that video. Try Chrome, or an MP4 file. iPhone clips play if you set Settings → Camera → Formats to Most Compatible before filming.",
      });
    }
  };

  if (phase.kind === "done") {
    const attempt = state.attempts.find((a) => a.id === phase.attemptId);
    const clip = getClip(phase.attemptId);
    const route = state.routes.find((r) => r.id === attempt?.routeId);
    if (!attempt || !attempt.metrics || !clip) return null;
    const analysis = { ...attempt.metrics, findings: attempt.findings };
    return (
      <div className="stack">
        <div className="row between">
          <div className="stack tight">
            <span className="label">
              {attempt.source === "sample" ? "Sample attempt" : "Your video"} · climber tracked in <span className="mono">{attempt.framesAnalyzed}</span> of{" "}
              <span className="mono">{attempt.framesSampled ?? attempt.framesAnalyzed}</span> frames · {attempt.outcome === "sent" ? "sent" : "fell"}
            </span>
            {route && <RouteName route={route} />}
          </div>
          <button className="btn" type="button" onClick={() => setPhase({ kind: "idle" })}>
            Log another attempt
          </button>
        </div>
        {phase.saved && (
          <p className="small muted">This clip was analyzed earlier on this device, so Crux opened the saved measurements instead of tracking it again.</p>
        )}
        {attempt.trimmed && <p className="small muted">This clip is longer than {MAX_CLIP_S} seconds, so Crux analyzed the first {MAX_CLIP_S}.</p>}
        {attempt.framesSampled !== undefined && attempt.framesAnalyzed < attempt.framesSampled * 0.6 && (
          <p className="small" style={{ color: "var(--accent)", fontWeight: 500 }}>
            Crux lost sight of the climber in {Math.round(100 - (100 * attempt.framesAnalyzed) / attempt.framesSampled)}% of the frames, so treat these numbers with care. Filming closer
            and from directly behind helps.
          </p>
        )}
        <div className="cards2 attempt-grid">
          <Playback clip={clip} flaggedT={attempt.metrics.peakT} flagged={attempt.findings.includes("reach")} />
          <Results analysis={analysis} route={route} beta={state.beta} heightIn={me.heightIn} />
        </div>
        <div className="card">
          <label className="row" htmlFor="share">
            <input id="share" type="checkbox" checked={attempt.sharedWithCoach} onChange={(e) => setShared(attempt.id, e.target.checked)} />
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>Share this clip with my coach</span>
          </label>
          <span className="small muted">
            The clip was analyzed on this device and has not been uploaded. Your coach sees the measurements either way, and the clip only if you tick this.
          </span>
        </div>
        <a className="btn primary big" href="#/climber/today">
          See my updated session
        </a>
      </div>
    );
  }

  const busy = phase.kind === "working";
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Log an attempt</h1>
        <p>Film from behind with your whole body in frame. Crux tracks your joints through the climb and measures the move where you reached furthest.</p>
      </div>
      <div className="cards2 attempt-grid">
        <div className="stack tight">
          <div className="stage">
            <canvas ref={canvas} width={SAMPLE_SIZE.width} height={SAMPLE_SIZE.height} aria-label="Attempt video with the tracked skeleton" />
          </div>
          <p className="small" aria-live="polite" style={{ minHeight: 20, color: phase.kind === "error" ? "var(--accent)" : "var(--ink)", fontWeight: 500 }}>
            {phase.kind === "working" && phase.status}
            {phase.kind === "error" && phase.message}
          </p>
        </div>
        <div className="stack tight">
          <label className="field" htmlFor="route">
            Route
            <select id="route" value={routeId} onChange={(e) => setRouteId(e.target.value)} disabled={busy}>
              {live.map((r) => {
                const slot = session.find((e) => e.route.id === r.id)?.slot;
                return (
                  <option key={r.id} value={r.id}>
                    {routeLabel(r)} · {r.wall}
                    {slot ? ` · ${slot}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="field">
            <span>How did it go?</span>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={outcome === "fell"} onClick={() => setOutcome("fell")} disabled={busy}>
                I fell
              </button>
              <button type="button" className="chip" aria-pressed={outcome === "sent"} onClick={() => setOutcome("sent")} disabled={busy}>
                I sent it
              </button>
            </div>
          </div>
          {busy && phase.kind === "working" && phase.status.startsWith("Tracking") ? (
            <button className="btn big" type="button" onClick={() => (cancelled.current = true)}>
              Cancel
            </button>
          ) : (
            <button className="btn primary big" type="button" disabled={busy} onClick={() => file.current?.click()}>
              Upload or record a video
            </button>
          )}
          <span className="small muted">
            Up to {MAX_CLIP_S} seconds. Analysis takes about as long as the clip. The video stays on this device.
          </span>
          <input
            ref={file}
            id="video-file"
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void runVideo(f);
            }}
          />
          {saved.length > 0 && (
            <div className="card">
              <span className="label">Clips analyzed on this device</span>
              <span className="small muted">These open instantly, because the tracking is already done. They are stored in this browser only.</span>
              {saved.map((rec) => (
                <div className="row between" key={rec.key}>
                  <button className="btn" type="button" disabled={busy} onClick={() => openSaved(rec)} style={{ minWidth: 0, overflowWrap: "anywhere", textAlign: "left" }}>
                    Open {rec.name}
                  </button>
                  <button
                    className="btn quiet"
                    type="button"
                    disabled={busy}
                    aria-label={`Remove ${rec.name}`}
                    onClick={() => void removeSavedClip(rec.key).then(refreshSaved)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="card">
            <span className="label">No clip yet? Try a sample on Blue V4</span>
            <span className="small muted">Samples are animations. They run through the same measurement code as a real video.</span>
            <div className="row">
              <button className="btn" type="button" disabled={busy} onClick={() => { setRouteId("blue"); runSample("fall"); }}>
                Sample: fall at the crux
              </button>
              <button className="btn" type="button" disabled={busy} onClick={() => { setRouteId("blue"); runSample("send"); }}>
                Sample: with the new beta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- history ---------- */

export function patternSummary(attempts: Attempt[]): { id: FindingId; n: number }[] {
  const c = new Map<FindingId, number>();
  attempts.forEach((a) => a.findings.forEach((f) => c.set(f, (c.get(f) ?? 0) + 1)));
  return [...c].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n);
}

export function History() {
  const { state, myAttempts } = useStore();
  const patterns = patternSummary(myAttempts);
  const now = Date.now();
  const rows = [...myAttempts].reverse();
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>What Crux has learned about you</h1>
        {myAttempts.length === 0 ? (
          <p>Nothing yet. Each attempt you log updates your session and what your coach sees.</p>
        ) : patterns.length === 0 ? (
          <p>
            <span className="mono">{myAttempts.length}</span> attempt{myAttempts.length === 1 ? "" : "s"} logged and no patterns flagged.
          </p>
        ) : (
          <div className="stack tight">
            {patterns.map((p) => (
              <div className="finding" key={p.id}>
                <b>
                  {FINDINGS[p.id].title} on <span className="mono">{p.n}</span> attempt{p.n === 1 ? "" : "s"}
                </b>
                <span>
                  Your session now favors routes tagged {FINDINGS[p.id].tags.join(" and ")}.
                  {p.n >= 2 ? " Because it has happened twice, your coach has been notified." : " If it happens again, your coach is notified."}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <Empty>
          No attempts logged. <a href="#/climber/attempt">Log your first one</a>.
        </Empty>
      ) : (
        <div className="list">
          {rows.map((a) => {
            const r = state.routes.find((x) => x.id === a.routeId);
            return (
              <div key={a.id} className="row between">
                <div className="stack" style={{ gap: 2 }}>
                  {r ? <RouteName route={r} /> : <span>Retired route</span>}
                  <span className="small muted">
                    {timeAgo(a.at, now)} · {a.source === "sample" ? "sample" : "video"} · {a.outcome === "sent" ? "sent" : "fell"}
                    {a.sharedWithCoach ? " · shared with coach" : ""}
                  </span>
                </div>
                <span className="small" style={{ color: a.findings.length ? "var(--accent)" : "var(--ok)", fontWeight: 500 }}>
                  {a.findings.length ? a.findings.map((f) => FINDINGS[f].title).join(", ") : "Nothing flagged"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- profile ---------- */

export function ProfileScreen() {
  const { me, updateMe } = useStore();
  return (
    <div className="stack" style={{ maxWidth: 440 }}>
      <div className="stack tight">
        <h1>Your profile</h1>
        <p>Changing anything here rebuilds your session straight away.</p>
      </div>
      <BodyFields draft={me} set={updateMe} />
      <GradeField draft={me} set={updateMe} />
      <FocusField draft={me} set={updateMe} />
      <div className="list">
        <div className="row between">
          <span>Arm span</span>
          <span className="mono" style={{ color: "var(--ink)" }}>{spanIn(me)} in</span>
        </div>
        <div className="row between">
          <span>Goal</span>
          <span style={{ color: "var(--ink)" }}>
            Send <span className="mono">V{me.grade + 1}</span> consistently
          </span>
        </div>
      </div>
    </div>
  );
}
