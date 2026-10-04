"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ApeField, FocusField, GradeField, HeightField } from "@/components/ProfileFields";
import { Button, SegmentedControl } from "@/components/ui";
import { spanIn } from "@/lib/reach";
import { resetState, setState, useAppState } from "@/lib/store";
import type { ClimberProfile } from "@/lib/types";

/** Edit body, grade and focus. Any change rebuilds the session straight away. */
export default function Profile() {
  const router = useRouter();
  const { state, ready } = useAppState();
  const { profile } = state;
  if (!ready || !profile) return <AppShell>{null}</AppShell>;

  const update = (change: Partial<ClimberProfile>) =>
    setState((s) => ({
      ...s,
      profile: { ...profile, ...change },
      // The session is rebuilt from the new profile, so nothing is "new since your last attempt".
      sessionBeforeLastAttempt: null,
    }));

  return (
    <AppShell>
      <h1 className="text-24 font-semibold text-ink">Profile</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-18 font-semibold text-ink">Body</h2>
        <HeightField value={profile.heightIn} onChange={(heightIn) => update({ heightIn })} />
        <ApeField value={profile.apeIn} onChange={(apeIn) => update({ apeIn })} />
        <p>
          Arm span: <span className="num font-medium text-ink">{spanIn(profile)} in</span>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-18 font-semibold text-ink">Grade you send most sessions</h2>
        <GradeField value={profile.grade} onChange={(grade) => update({ grade })} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-18 font-semibold text-ink">What you want to work on</h2>
        <FocusField value={profile.focusAreas} onChange={(focusAreas) => update({ focusAreas })} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-18 font-semibold text-ink">Appearance</h2>
        <SegmentedControl
          label="Theme"
          value={state.theme}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(theme) => setState((s) => ({ ...s, theme }))}
        />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <p className="text-13 text-muted">
          Your profile and attempts are stored in this browser only. Starting over erases them.
        </p>
        <Button
          onClick={() => {
            resetState();
            router.replace("/onboarding/");
          }}
        >
          Start over
        </Button>
      </section>
    </AppShell>
  );
}
