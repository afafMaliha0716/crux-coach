import type { ReactNode } from "react";
import { fmtHeight, routeLabel } from "../lib/format";
import type { SessionEntry } from "../lib/session";
import type { Route, Tag } from "../lib/types";

/** The route's hold color. Always shown beside the color name, never alone. */
export function HoldDot({ hex }: { hex: string }) {
  return <span className="dot" style={{ background: hex }} aria-hidden="true" />;
}

export function RouteName({ route }: { route: Pick<Route, "colorName" | "colorHex" | "grade"> }) {
  return (
    <span className="route-name">
      <HoldDot hex={route.colorHex} />
      <span>
        {route.colorName} <span className="mono">V{route.grade}</span>
      </span>
    </span>
  );
}

export function Tags({ tags, hits = [] }: { tags: Tag[]; hits?: Tag[] }) {
  return (
    <div className="chips">
      {tags.map((t) => (
        <span key={t} className={"chip" + (hits.includes(t) ? " hit" : "")}>
          {t}
        </span>
      ))}
    </div>
  );
}

export function Example() {
  return <span className="pill">example</span>;
}

export function RouteCard({ entry, spanIn, isNew }: { entry: SessionEntry; spanIn: number; isNew: boolean }) {
  const r = entry.route;
  return (
    <article className="card" aria-label={`${entry.slot}: ${routeLabel(r)}`}>
      <span className="slot">{entry.slot}</span>
      <RouteName route={r} />
      <span className="small muted">{r.wall}</span>
      <Tags tags={r.tags} hits={entry.hits} />
      <p>{entry.reason}</p>
      {entry.longReach && (
        <p className="reach-line">
          Longest move is <span className="mono">{r.longestMoveIn} in</span>. Your span is <span className="mono">{spanIn} in</span>, so Crux
          looks for beta written for your height.
        </p>
      )}
      {isNew && <span className="new">Added after your last attempt</span>}
    </article>
  );
}

export function Metric({ value, label, hero }: { value: ReactNode; label: string; hero?: boolean }) {
  return (
    <div className={"metric" + (hero ? " hero" : "")}>
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function HeightGrade({ heightIn, grade }: { heightIn: number; grade: number }) {
  return (
    <span className="mono small muted">
      {fmtHeight(heightIn)} · V{grade}
    </span>
  );
}
