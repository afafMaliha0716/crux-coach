import { formatHeight, longReachLine } from "@/lib/reach";
import { routeLabel } from "@/lib/seed";
import type { SessionEntry } from "@/lib/session";
import type { ClimberProfile, Route, RouteBeta } from "@/lib/types";
import type { FeedbackLine } from "@/lib/feedback";
import { Chip, ExamplePill } from "./ui";

/** Route color, always with its name beside it: color alone never carries meaning. */
export function HoldDot({ route, size = 18 }: { route: Pick<Route, "colorHex">; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="hold"
      style={{ background: route.colorHex, width: size, height: size * 0.88 }}
    />
  );
}

export function RouteCard({
  entry,
  profile,
  added,
}: {
  entry: SessionEntry;
  profile: ClimberProfile;
  added?: boolean;
}) {
  const { route } = entry;
  return (
    <article className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-13 text-muted">{entry.slot}</p>
        {added && <p className="text-13 text-ok">Added after your last attempt</p>}
      </div>
      <h3 className="mt-1 flex items-center gap-2 text-18 font-semibold text-ink">
        <HoldDot route={route} />
        <span>
          {route.colorName} <span className="num">V{route.grade}</span>
        </span>
      </h3>
      <p className="text-13 text-muted">{route.wall}</p>
      <p className="mt-3">{entry.reason}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {route.tags.map((tag) => (
          <Chip key={tag} selected={entry.matchedTags.includes(tag)}>
            {tag}
          </Chip>
        ))}
      </div>
      {entry.longReach && (
        <p className="mt-3 border-t border-line pt-3 text-13">
          <span className="font-medium text-ink">Long reach for you.</span>{" "}
          <span className="num">{longReachLine(route, profile)}</span>
        </p>
      )}
    </article>
  );
}

export function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-3">
      <p className="num text-24 font-medium text-ink">{value}</p>
      <p className="text-13 text-muted">{label}</p>
    </div>
  );
}

export function FindingCard({ line }: { line: FeedbackLine }) {
  const clean = line.id === "clean";
  return (
    <div className={`rounded-[12px] p-4 ${clean ? "bg-ok-bg" : "bg-flag-bg"}`}>
      <p className="text-18 font-semibold text-ink">{line.title}</p>
      <p className="mt-1 text-ink">{line.body}</p>
    </div>
  );
}

export function BetaCard({
  route,
  beta,
  fallback,
  heightIn,
}: {
  route: Route;
  beta: RouteBeta | null;
  fallback: string;
  heightIn: number;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <p className="flex flex-wrap items-center gap-2 text-18 font-semibold text-ink">
        {beta ? "Beta for your body" : "Try this"}
        {beta && <ExamplePill>example beta</ExamplePill>}
      </p>
      {beta ? (
        <>
          <p className="mt-1">{beta.text}</p>
          <p className="mt-2 text-13 text-muted">
            Written by the setter for climbers{" "}
            <span className="num">
              {formatHeight(beta.heightMinIn)} to {formatHeight(beta.heightMaxIn)}
            </span>
            . You are <span className="num">{formatHeight(heightIn)}</span>.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1">{fallback}</p>
          <p className="mt-2 text-13 text-muted">
            No beta has been written for your height on {routeLabel(route)} yet, so this is the
            general suggestion.
          </p>
        </>
      )}
    </div>
  );
}
