"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { RouteCard } from "@/components/cards";
import { EmptyState } from "@/components/ui";
import { ROUTES } from "@/lib/seed";
import { addedRoutes, buildSession } from "@/lib/session";
import { useAppState } from "@/lib/store";

/** Today: three routes from the wall right now, and one thing to do. */
export default function Today() {
  const router = useRouter();
  const { state, ready } = useAppState();
  const { profile } = state;

  useEffect(() => {
    if (ready && !profile) router.replace("/onboarding/");
  }, [ready, profile, router]);

  if (!ready || !profile) return <AppShell tabs={false}>{null}</AppShell>;

  const session = buildSession(profile, ROUTES, state.attempts);
  const added = addedRoutes(state.sessionBeforeLastAttempt, session);
  const live = ROUTES.filter((r) => r.status === "live").length;

  return (
    <AppShell>
      <div>
        <h1 className="text-24 font-semibold text-ink">Today</h1>
        <p>
          Three climbs from the <span className="num">{live}</span> routes on the wall right now.
        </p>
      </div>

      {session.length === 0 ? (
        <EmptyState title="The wall is empty">
          When the setters tag new routes, your session appears here.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {session.map((entry) => (
            <RouteCard
              key={entry.route.id}
              entry={entry}
              profile={profile}
              added={added.includes(entry.route.id)}
            />
          ))}
        </div>
      )}

      {/* The one primary action stays within thumb reach, on its own strip above the tabs. */}
      <div className="sticky bottom-14 -mx-4 -mb-8 mt-auto border-t border-line bg-bg px-4 py-3">
        <Link
          href="/attempt/"
          className="flex h-12 items-center justify-center rounded-[12px] bg-accent text-15 font-semibold text-accent-fg"
        >
          Log an attempt
        </Link>
      </div>
    </AppShell>
  );
}
