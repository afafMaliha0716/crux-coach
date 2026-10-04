"use client";

import { AppShell } from "@/components/AppShell";
import { HoldDot } from "@/components/cards";
import { EmptyState, ExamplePill, ListRow } from "@/components/ui";
import { FINDINGS } from "@/lib/catalog";
import { repeatedFindings } from "@/lib/flags";
import { routeById } from "@/lib/seed";
import { useAppState } from "@/lib/store";

/** Every attempt, newest first, under a summary of what repeats. */
export default function History() {
  const { state, ready } = useAppState();
  if (!ready) return <AppShell>{null}</AppShell>;

  const attempts = [...state.attempts].reverse();
  const repeated = repeatedFindings(state.attempts);

  return (
    <AppShell>
      <h1 className="text-24 font-semibold text-ink">History</h1>

      {attempts.length === 0 ? (
        <EmptyState title="No attempts yet">
          Log one from Today. Each attempt updates your next session.
        </EmptyState>
      ) : (
        <>
          <section className="rounded-[12px] border border-line bg-surface p-4">
            <h2 className="text-18 font-semibold text-ink">What Crux has learned about you</h2>
            {repeated.length ? (
              <ul className="mt-2 flex flex-col gap-1">
                {repeated.map(({ finding, count }) => (
                  <li key={finding}>
                    {FINDINGS[finding].title} on <span className="num">{count}</span> attempts. Your
                    sessions now lean toward {FINDINGS[finding].tags.join(" and ")} routes.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">
                Nothing repeats yet. A pattern needs to show up on two attempts before Crux treats it
                as yours.
              </p>
            )}
          </section>

          <ul>
            {attempts.map((attempt) => {
              const route = routeById(attempt.routeId);
              const date = new Date(attempt.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <ListRow key={attempt.id}>
                  {route && <HoldDot route={route} />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {route ? route.colorName : "Retired route"}{" "}
                      {route && <span className="num">V{route.grade}</span>}{" "}
                      {attempt.source === "sample" && <ExamplePill>sample</ExamplePill>}
                    </p>
                    <p className="text-13 text-muted">
                      {attempt.findings.length
                        ? attempt.findings.map((f) => FINDINGS[f].title).join(", ")
                        : "Clean movement"}
                    </p>
                  </div>
                  <div className="text-right text-13">
                    <p className={attempt.outcome === "sent" ? "font-medium text-ok" : "text-ink"}>
                      {attempt.outcome === "sent" ? "Sent" : "Fell"}
                    </p>
                    <p className="num text-muted">{date}</p>
                  </div>
                </ListRow>
              );
            })}
          </ul>
        </>
      )}
    </AppShell>
  );
}
