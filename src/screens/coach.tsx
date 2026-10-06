import { useState } from "react";
import { getClip } from "../clips";
import { Playback } from "../components/Playback";
import { Empty, Example, HeightGrade, RouteName } from "../components/ui";
import { computeFlags, type Flag } from "../lib/flags";
import { timeAgo } from "../lib/format";
import { FINDINGS } from "../lib/session";
import type { Attempt, Profile } from "../lib/types";
import { lastReview, useStore, type State } from "../store";
import { Results, patternSummary } from "./climber";

const DAY = 24 * 60 * 60 * 1000;

function rosterRows(state: State, now: number): { p: Profile; attempts: Attempt[]; flags: Flag[] }[] {
  return state.profiles
    .filter((p) => p.member && p.onboarded)
    .map((p) => {
      const attempts = state.attempts.filter((a) => a.climberId === p.id);
      return { p, attempts, flags: computeFlags(attempts, state.routes, lastReview(state, p.id), now) };
    });
}

function trend(attempts: Attempt[], now: number): string {
  const recent = attempts.filter((a) => now - a.at <= 28 * DAY);
  if (!recent.length) return "No attempts in the last 4 weeks";
  const sends = recent.filter((a) => a.outcome === "sent").length;
  return `${recent.length} attempt${recent.length === 1 ? "" : "s"}, ${sends} send${sends === 1 ? "" : "s"}`;
}

function NoteBox({ climberId, suggestion }: { climberId: string; suggestion?: string }) {
  const { sendNote, markReviewed } = useStore();
  const [body, setBody] = useState(suggestion ?? "");
  const [sent, setSent] = useState(false);
  if (sent) return <span className="small" style={{ color: "var(--ok)", fontWeight: 500 }}>Note sent. It appears on their Today screen.</span>;
  return (
    <div className="row">
      <input
        className="input grow"
        style={{ flexBasis: 240 }}
        id={`note-${climberId}`}
        type="text"
        aria-label="Note to this climber"
        placeholder="Write a short note to this climber"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        className="btn primary"
        type="button"
        disabled={!body.trim()}
        onClick={() => {
          sendNote(climberId, body.trim());
          markReviewed(climberId);
          setSent(true);
        }}
      >
        Send note
      </button>
    </div>
  );
}

export function CoachToday() {
  const { state, markReviewed } = useStore();
  const now = Date.now();
  const rows = rosterRows(state, now);
  const need = rows.filter((r) => r.flags.length);
  const ok = rows.filter((r) => !r.flags.length);
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Who needs you today</h1>
        <p>Crux reads every attempt and surfaces only the climbers where a coach makes the difference.</p>
      </div>
      <div className="sums">
        <div className="card">
          <span className="count alert">{need.length}</span>
          <span>need attention</span>
        </div>
        <div className="card">
          <span className="count">{ok.length}</span>
          <span>on track</span>
        </div>
        <div className="card">
          <span className="count">{rows.length}</span>
          <span>Crux members on your roster</span>
        </div>
      </div>
      <section className="stack tight" aria-labelledby="need">
        <h2 id="need">Needs attention</h2>
        {need.length === 0 ? (
          <Empty>Nobody is flagged. A climber appears here after the same pattern on two attempts, three falls on one route in a week, or 21 days without a send.</Empty>
        ) : (
          <div className="list">
            {need.map(({ p, flags }) => (
              <div key={p.id} className="flag-row">
                <div className="row between">
                  <a className="who" href={`#/coach/climber/${p.id}`}>
                    {p.name}
                  </a>
                  <span className="row">
                    {p.example && <Example />}
                    <HeightGrade heightIn={p.heightIn} grade={p.grade} />
                  </span>
                </div>
                {flags.map((f, i) => (
                  <p key={i} style={{ color: "var(--ink)" }}>{f.text}</p>
                ))}
                <NoteBox climberId={p.id} suggestion={p.example ? undefined : "Right foot to the green jib first. Find me Thursday and we will drill it."} />
                <div className="row">
                  <a className="btn" href={`#/coach/climber/${p.id}`}>
                    See attempts
                  </a>
                  <button className="btn quiet" type="button" onClick={() => markReviewed(p.id)}>
                    Mark reviewed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function Roster() {
  const { state } = useStore();
  const now = Date.now();
  const rows = rosterRows(state, now);
  return (
    <div className="stack">
      <div className="stack tight">
        <h1>Roster</h1>
        <p>Every Crux member at the gym, with the last four weeks at a glance.</p>
      </div>
      <div className="list">
        {rows.map(({ p, attempts, flags }) => (
          <a key={p.id} className="row-link between" href={`#/coach/climber/${p.id}`}>
            <span className="row">
              <span className="who">{p.name}</span>
              {p.example && <Example />}
              <HeightGrade heightIn={p.heightIn} grade={p.grade} />
            </span>
            <span className="small" style={{ color: flags.length ? "var(--accent)" : "var(--muted)", fontWeight: flags.length ? 500 : 400 }}>
              {flags.length ? "Needs attention" : trend(attempts, now)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function ClimberDetail({ id }: { id: string }) {
  const { state, me } = useStore();
  const now = Date.now();
  const p = state.profiles.find((x) => x.id === id);
  if (!p) return <Empty>That climber is not on the roster.</Empty>;
  const attempts = state.attempts.filter((a) => a.climberId === id).sort((a, b) => b.at - a.at);
  const flags = computeFlags(attempts, state.routes, lastReview(state, id), now);
  const patterns = patternSummary(attempts);
  const notes = state.notes.filter((n) => n.climberId === id).sort((a, b) => b.at - a.at);
  return (
    <div className="stack">
      <a className="small muted" href="#/coach/today">
        ← Back to today
      </a>
      <div className="row between">
        <h1>
          {p.name} {p.example && <Example />}
        </h1>
        <HeightGrade heightIn={p.heightIn} grade={p.grade} />
      </div>
      {flags.length > 0 && (
        <div className="finding">
          <b>Needs attention</b>
          {flags.map((f, i) => (
            <span key={i}>{f.text}</span>
          ))}
        </div>
      )}
      {patterns.length > 0 && (
        <p>
          Measured patterns:{" "}
          {patterns.map((x, i) => (
            <span key={x.id}>
              {i > 0 && "; "}
              {FINDINGS[x.id].title.toLowerCase()} (<span className="mono">{x.n}</span>)
            </span>
          ))}
          .
        </p>
      )}
      <section className="stack tight">
        <h2>Send a note</h2>
        <NoteBox climberId={id} />
        {notes.map((n) => (
          <div className="note" key={n.id}>
            <span className="label">
              Sent {timeAgo(n.at, now)} · {n.readAt ? "read" : "not read yet"}
            </span>
            <p>{n.body}</p>
          </div>
        ))}
      </section>
      <section className="stack tight">
        <h2>Attempts</h2>
        {attempts.length === 0 ? (
          <Empty>No attempts logged yet.</Empty>
        ) : (
          <div className="list">
            {attempts.map((a) => {
              const r = state.routes.find((x) => x.id === a.routeId);
              const clip = a.sharedWithCoach ? getClip(a.id) : undefined;
              return (
                <div key={a.id} className="stack tight">
                  <div className="row between">
                    <div className="stack" style={{ gap: 2 }}>
                      {r ? <RouteName route={r} /> : <span>Retired route</span>}
                      <span className="small muted">
                        {timeAgo(a.at, now)} · {a.outcome === "sent" ? "sent" : "fell"}
                        {a.source === "seed" ? " · logged without video" : ""}
                      </span>
                    </div>
                    <span className="small" style={{ color: a.findings.length ? "var(--accent)" : "var(--muted)", fontWeight: 500 }}>
                      {a.findings.length ? a.findings.map((f) => FINDINGS[f].title).join(", ") : a.metrics ? "Nothing flagged" : ""}
                    </span>
                  </div>
                  {a.metrics && (
                    <details>
                      <summary className="small" style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 500 }}>
                        Measurements{a.sharedWithCoach ? " and shared clip" : ""}
                      </summary>
                      <div className="cards2 attempt-grid" style={{ marginTop: 12 }}>
                        {clip ? (
                          <Playback clip={clip} flaggedT={a.metrics.peakT} flagged={a.findings.includes("reach")} />
                        ) : (
                          <Empty>
                            {a.sharedWithCoach
                              ? "This clip was shared, but it lives on the climber's device and is only available during the visit it was recorded in."
                              : "The climber has not shared this clip. You can still see what Crux measured."}
                          </Empty>
                        )}
                        <Results analysis={{ ...a.metrics, findings: a.findings }} route={r} beta={state.beta} heightIn={p.id === me.id ? me.heightIn : p.heightIn} />
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
