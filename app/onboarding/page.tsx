"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApeField, DEFAULT_PROFILE, FocusField, GradeField, HeightField } from "@/components/ProfileFields";
import { Button } from "@/components/ui";
import { spanIn } from "@/lib/reach";
import { setState } from "@/lib/store";

const STEPS = ["Your body", "Your grade", "Your focus"];

/** Three short steps, one question per screen, ending on the first session. */
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  function finish() {
    setState((s) => ({ ...s, profile, attempts: [], sessionBeforeLastAttempt: null }));
    router.replace("/");
  }

  return (
    <AppShell tabs={false}>
      <p className="text-13 text-muted">
        Step <span className="num">{step + 1}</span> of <span className="num">{STEPS.length}</span>
      </p>

      {step === 0 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-24 font-semibold text-ink">How tall are you?</h1>
          <p>Crux fits every session and every piece of beta to your reach.</p>
          <HeightField value={profile.heightIn} onChange={(heightIn) => setProfile({ ...profile, heightIn })} />
          <ApeField value={profile.apeIn} onChange={(apeIn) => setProfile({ ...profile, apeIn })} />
          <p>
            Your arm span: <span className="num font-medium text-ink">{spanIn(profile)} in</span>
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-24 font-semibold text-ink">What grade do you send most sessions?</h1>
          <p>Not your best day. The grade you can usually finish.</p>
          <GradeField value={profile.grade} onChange={(grade) => setProfile({ ...profile, grade })} />
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-24 font-semibold text-ink">What do you want to work on?</h1>
          <p>Pick any that apply. Crux adjusts these as it measures your attempts.</p>
          <FocusField value={profile.focusAreas} onChange={(focusAreas) => setProfile({ ...profile, focusAreas })} />
        </section>
      )}

      <div className="mt-auto flex gap-3">
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        <Button variant="primary" full onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}>
          {step < STEPS.length - 1 ? "Continue" : "See my session"}
        </Button>
      </div>
    </AppShell>
  );
}
