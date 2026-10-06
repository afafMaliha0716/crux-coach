import { useState } from "react";
import { Empty, Example, RouteName, Tags } from "../components/ui";
import { fmtHeight, routeLabel } from "../lib/format";
import { INSIGHT_RULES, routeInsight } from "../lib/insight";
import { TAGS, WALLS, type Tag } from "../lib/types";
import { go } from "../router";
import { useStore } from "../store";

const COLORS: [string, string][] = [
  ["Red", "#D9533F"], ["Orange", "#E8873A"], ["Yellow", "#E6B93A"], ["Green", "#4E9A5B"], ["Mint", "#8FD3B6"], ["Teal", "#3E9AA3"],
  ["Blue", "#4F7FC4"], ["Purple", "#8662B8"], ["Pink", "#E58FB1"], ["White", "#EDE9E0"], ["Gray", "#8D8F98"], ["Black", "#2B2B33"], ["Tan", "#C9A27A"], ["Lime", "#B5D23C"],
];

function TagPicker({ value, onChange }: { value: Tag[]; onChange: (t: Tag[]) => void }) {
  return (
    <div className="chips">
      {TAGS.map((t) => (
        <button key={t} type="button" className="chip" aria-pressed={value.includes(t)} onClick={() => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])}>
          {t}
        </button>
      ))}
    </div>
  );
}

function AddRoute({ onDone }: { onDone: () => void }) {
  const { addRoute } = useStore();
  const [color, setColor] = useState(0);
  const [grade, setGrade] = useState(3);
  const [wall, setWall] = useState<string>(WALLS[1]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [move, setMove] = useState(50);
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        addRoute({ colorName: COLORS[color][0], colorHex: COLORS[color][1], grade, wall, tags, longestMoveIn: move });
        onDone();
      }}
    >
      <h2>Add a route</h2>
      <div className="row">
        <label className="field grow" htmlFor="new-color">
          Hold color
          <select id="new-color" value={color} onChange={(e) => setColor(Number(e.target.value))}>
            {COLORS.map(([name], i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
        </label>
        <label className="field grow" htmlFor="new-grade">
          Grade
          <select id="new-grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>V{n}</option>
            ))}
          </select>
        </label>
        <label className="field grow" htmlFor="new-wall">
          Wall
          <select id="new-wall" value={wall} onChange={(e) => setWall(e.target.value)}>
            {WALLS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className="field grow" htmlFor="new-move">
          Longest move, inches
          <input id="new-move" type="number" min={20} max={90} value={move} onChange={(e) => setMove(Number(e.target.value) || 0)} />
        </label>
      </div>
      <div className="field">
        <span>Movement tags</span>
        <TagPicker value={tags} onChange={setTags} />
      </div>
      <div className="row">
        <button className="btn primary" type="submit" disabled={tags.length === 0}>
          Add to the wall
        </button>
        <button className="btn quiet" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function Wall() {
  const { state, resetWall } = useStore();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const live = state.routes.filter((r) => r.status === "live");
  const walls = [...new Set(live.map((r) => r.wall))];
  const retired = state.routes.filter((r) => r.status === "retired").length;
  return (
    <div className="stack">
      <div className="row between">
        <div className="stack tight">
          <h1>The wall</h1>
          <p>
            <span className="mono">{live.length}</span> live routes. Every member's session is built from this list, so a reset updates every plan.
          </p>
        </div>
        {!adding && (
          <button className="btn primary" type="button" onClick={() => setAdding(true)}>
            Add a route
          </button>
        )}
      </div>
      {adding && <AddRoute onDone={() => setAdding(false)} />}
      {walls.length === 0 && <Empty>The wall is empty. Add a route to give members something to climb.</Empty>}
      {walls.map((w) => (
        <section key={w} className="stack tight" aria-label={w}>
          <div className="row between">
            <h2>{w}</h2>
            {confirm === w ? (
              <span className="row">
                <span className="small">Retire every route on {w}?</span>
                <button className="btn primary" type="button" onClick={() => { resetWall(w); setConfirm(null); }}>
                  Yes, reset
                </button>
                <button className="btn quiet" type="button" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button className="btn quiet" type="button" onClick={() => setConfirm(w)}>
                Reset this wall
              </button>
            )}
          </div>
          <div className="list">
            {live
              .filter((r) => r.wall === w)
              .map((r) => {
                const insight = routeInsight(r.id, state.attempts, state.profiles);
                return (
                  <a key={r.id} className="row-link between" href={`#/setter/route/${r.id}`}>
                    <span className="row">
                      <RouteName route={r} />
                      <Tags tags={r.tags} />
                    </span>
                    <span className="row small">
                      {insight.harderForShort && <span style={{ color: "var(--accent)", fontWeight: 500 }}>Harder for shorter members</span>}
                      <span className="mono muted">{r.longestMoveIn} in</span>
                    </span>
                  </a>
                );
              })}
          </div>
        </section>
      ))}
      {retired > 0 && (
        <p className="small muted">
          <span className="mono">{retired}</span> retired route{retired === 1 ? "" : "s"} kept for history.
        </p>
      )}
    </div>
  );
}

export function RouteDetail({ id }: { id: string }) {
  const { state, updateRoute, retireRoute, addBeta, removeBeta } = useStore();
  const r = state.routes.find((x) => x.id === id);
  const [lo, setLo] = useState(56);
  const [hi, setHi] = useState(64);
  const [text, setText] = useState("");
  if (!r) return <Empty>That route does not exist.</Empty>;
  const beta = state.beta.filter((b) => b.routeId === id);
  const insight = routeInsight(id, state.attempts, state.profiles);
  const usesExample = state.attempts.some((a) => a.routeId === id && a.example);
  const pct = (b: { attempts: number; sends: number }) => (b.attempts ? Math.round((100 * b.sends) / b.attempts) : 0);
  return (
    <div className="stack">
      <a className="small muted" href="#/setter/wall">
        ← Back to the wall
      </a>
      <div className="row between">
        <h1 className="row">
          <RouteName route={r} />
        </h1>
        <span className="small muted">
          {r.wall} · {r.status === "live" ? "live" : "retired"}
        </span>
      </div>

      <section className="card">
        <h2>Tags</h2>
        <TagPicker value={r.tags} onChange={(tags) => updateRoute(id, { tags })} />
        <label className="field" htmlFor="move" style={{ maxWidth: 220 }}>
          Longest move, inches
          <input id="move" type="number" min={20} max={90} value={r.longestMoveIn} onChange={(e) => updateRoute(id, { longestMoveIn: Number(e.target.value) || 0 })} />
        </label>
      </section>

      <section className="card">
        <h2>
          How it climbs by height {usesExample && <Example />}
        </h2>
        {insight.enoughData ? (
          <>
            {([["Under 5'4\"", insight.short], ["5'4\" and over", insight.rest]] as const).map(([label, b]) => (
              <div key={label} className="stack" style={{ gap: 4 }}>
                <div className="row between small">
                  <span>{label}</span>
                  <span className="mono">
                    {b.sends} of {b.attempts} sent ({pct(b)}%)
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct(b)}%` }} />
                </div>
              </div>
            ))}
            {insight.harderForShort && (
              <p style={{ color: "var(--ink)", fontWeight: 500 }}>
                This route climbs harder for shorter members: their send rate is at least {INSIGHT_RULES.gapPoints} points lower. Consider a foot option before the long move, or
                add beta for their height below.
              </p>
            )}
          </>
        ) : (
          <p className="muted">
            Crux compares send rates once there are {INSIGHT_RULES.minAttemptsPerBand} attempts in each height band. So far: {insight.short.attempts} under 5'4", {insight.rest.attempts}{" "}
            at 5'4" and over.
          </p>
        )}
      </section>

      <section className="card">
        <h2>Beta by height</h2>
        {beta.length === 0 && <p className="muted">No beta written yet. Climbers get a general suggestion until you add some.</p>}
        {beta.map((b) => (
          <div key={b.id} className="note">
            <div className="row between">
              <span className="label">
                {fmtHeight(b.heightMinIn)} to {fmtHeight(b.heightMaxIn)} · written by the {b.source}
              </span>
              <button className="btn quiet" type="button" onClick={() => removeBeta(b.id)} aria-label={`Remove beta for ${fmtHeight(b.heightMinIn)} to ${fmtHeight(b.heightMaxIn)}`}>
                Remove
              </button>
            </div>
            <p>{b.text}</p>
          </div>
        ))}
        <form
          className="stack tight"
          onSubmit={(e) => {
            e.preventDefault();
            addBeta({ routeId: id, heightMinIn: Math.min(lo, hi), heightMaxIn: Math.max(lo, hi), text: text.trim(), source: "setter" });
            setText("");
          }}
        >
          <div className="row">
            <label className="field grow" htmlFor="beta-lo">
              From height, inches
              <input id="beta-lo" type="number" min={48} max={84} value={lo} onChange={(e) => setLo(Number(e.target.value) || 0)} />
            </label>
            <label className="field grow" htmlFor="beta-hi">
              To height, inches
              <input id="beta-hi" type="number" min={48} max={84} value={hi} onChange={(e) => setHi(Number(e.target.value) || 0)} />
            </label>
          </div>
          <label className="field" htmlFor="beta-text">
            Beta for {routeLabel(r)}
            <textarea id="beta-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the sequence for climbers in this height range" />
          </label>
          <div>
            <button className="btn" type="submit" disabled={!text.trim()}>
              Add beta
            </button>
          </div>
        </form>
      </section>

      {r.status === "live" && (
        <div>
          <button
            className="btn"
            type="button"
            onClick={() => {
              retireRoute(id);
              go("setter/wall");
            }}
          >
            Retire this route
          </button>
        </div>
      )}
    </div>
  );
}
