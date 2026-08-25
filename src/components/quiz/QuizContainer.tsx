'use client';
import { useState, useCallback, useEffect } from 'react';
import type { QuizAnswers } from '@/types/quiz';
import { LOVE_LIFE_OPTIONS, PATTERN_OPTIONS, DESIRE_OPTIONS, IMPORTANCE_OPTIONS, PROGRESS_TARGETS } from '@/data/quizData';
import { goToCheckout } from '@/lib/checkout';
import { useAssetPrefetch } from '@/hooks/useAssetPrefetch';
import { trackFunnelEvent } from '@/lib/tracking';
import { readSession, writeSession } from '@/lib/session';

import { Step00Landing } from './steps/Step00Landing';
import { Step01Gender } from './steps/Step01Gender';
import { Step02Interest } from './steps/Step02Interest';
import { Step03Transition } from './steps/Step03Transition';
import { SingleSelect } from './steps/SingleSelect';
import { MultiSelect } from './steps/MultiSelect';
import { Step08Name } from './steps/Step08Name';
import { Step09Zodiac } from './steps/Step09Zodiac';
import { Step10BirthChart } from './steps/Step10BirthChart';
import { Step11Audio } from './steps/Step11Audio';
import { Step12Testimonials } from './steps/Step12Testimonials';
import { Step13Revelation } from './steps/Step13Revelation';
import { Step14Email } from './steps/Step14Email';
import { Step15Paywall } from './steps/Step15Paywall';
import { DevStepNav } from './DevStepNav';
import { VturbPreload } from './VturbPreload';

export function QuizContainer() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ name: '' });
  const [patterns, setPatterns] = useState<string[]>([]);
  const [desires, setDesires] = useState<string[]>([]);
  const [importance, setImportance] = useState<string[]>([]);

  // Spends the question steps' idle bandwidth on the media the later steps will
  // ask for. See useAssetPrefetch for the measurements behind the schedule.
  useAssetPrefetch(step);

  /**
   * Restores a session left behind when the TikTok bottom sheet was dismissed.
   *
   * In an effect rather than a `useState` initializer, and that is not a style
   * choice: this page is statically prerendered, so the server render and the
   * first client render must agree. Reading `localStorage` while seeding state
   * would make them disagree and break hydration.
   *
   * The cost is one frame on step 0 before the jump. The alternative — holding
   * the first paint until the restore runs — would delay the landing page for
   * every first-time visitor to spare returning ones a flicker, and this funnel
   * is served over mobile data into an in-app WebView where first paint is the
   * expensive thing. One frame is the cheaper trade.
   */
  useEffect(() => {
    const saved = readSession();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync restore is intentional: post-paint by design, the one-frame cost is the accepted trade documented above.
    setStep(saved.step);
    // Spread over a default rather than trusting the blob's shape: `name` is a
    // required prop downstream, and a hand-edited or future-schema payload that
    // omits it would throw on `name.trim()` in step 15. Widened to `Partial`
    // here because that is what `isSession` actually guarantees at runtime —
    // TS only believes `name` is always present.
    setAnswers({ name: '', ...(saved.answers as Partial<QuizAnswers>) });
    setPatterns(saved.patterns);
    setDesires(saved.desires);
    setImportance(saved.importance);
  }, []);

  /**
   * Mirrors every state change into storage.
   *
   * Covers both cases the spec asks for at once: a step change, and an answer
   * recorded on a step the reader has not left yet. Step 0 with untouched
   * answers is skipped so that merely opening the funnel does not write a blob
   * that would later be restored into the same state it already had.
   */
  useEffect(() => {
    const untouched =
      step === 0 &&
      !answers.gender &&
      !answers.interest &&
      patterns.length === 0 &&
      desires.length === 0 &&
      importance.length === 0;
    if (untouched) return;

    writeSession({ step, answers, patterns, desires, importance });
  }, [step, answers, patterns, desires, importance]);

  /**
   * StartQuiz: the reader left the landing page and the gender screen is up.
   *
   * This is the step the dashboard means by "clicaram para iniciar o quiz", and
   * the producer fires it at the same place — their `handleStepChange` reads
   * `s === 0 && i === 1`, the landing-to-gender transition, not an answer. An
   * earlier pass moved it onto the gender answer instead; that measured a
   * harder step than theirs and would have made the two funnels' rates
   * incomparable, which is the trap this file already fell into once with
   * EndQuiz.
   *
   * Driven from `step` rather than from the button so it cannot end up
   * half-wired: every route into the gender screen passes through here, the dev
   * navigator and a restored session included. Firing on a restore is correct —
   * that reader did start the quiz — and the sessionStorage guard in
   * `trackFunnelEvent` keeps a reload from reporting it twice.
   */
  useEffect(() => {
    if (step >= 1) trackFunnelEvent('StartQuiz');
  }, [step]);

  const next = useCallback(() => setStep(s => s + 1), []);
  const back = useCallback(() => setStep(s => Math.max(0, s - 1)), []);
  /** The original's bar is hand-tuned per step, not step/total — see PROGRESS_TARGETS. */
  const pct = (step: number) => PROGRESS_TARGETS[step] ?? 0;

  const saveResults = async (data: QuizAnswers) => {
    try { await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
    catch { /* ponytail: fire-and-forget, no blocking on network errors */ }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Step00Landing onStart={next} />;

      case 1:
        return (
          <Step01Gender
            onSelect={g => { setAnswers(a => ({ ...a, gender: g })); next(); }}
            onBack={back}
            progressPct={pct(1)}
          />
        );

      case 2:
        return (
          <Step02Interest
            onSelect={i => { setAnswers(a => ({ ...a, interest: i })); next(); }}
            onBack={back}
            progressPct={pct(2)}
          />
        );

      case 3:
        return <Step03Transition interest={answers.interest} onContinue={next} />;

      case 4:
        return (
          <SingleSelect
            title="Cosa descrive meglio la tua vita sentimentale in questo momento?"
            options={LOVE_LIFE_OPTIONS}
            onSelect={v => { setAnswers(a => ({ ...a, loveLife: v })); next(); }}
            progressPct={pct(4)}
          />
        );

      case 5:
        return (
          <MultiSelect
            title="Ti riconosci in qualcuno di questi schemi?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={PATTERN_OPTIONS}
            values={patterns}
            onChange={setPatterns}
            onNext={() => { setAnswers(a => ({ ...a, patterns })); next(); }}
            progressPct={pct(5)}
          />
        );

      case 6:
        return (
          <MultiSelect
            title="Cosa desideri di più dalla tua anima gemella?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={DESIRE_OPTIONS}
            values={desires}
            onChange={setDesires}
            onNext={() => { setAnswers(a => ({ ...a, desires })); next(); }}
            progressPct={pct(6)}
          />
        );

      case 7:
        return (
          <MultiSelect
            title="Cosa conta di più per te in un partner?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={IMPORTANCE_OPTIONS}
            values={importance}
            onChange={setImportance}
            onNext={() => { setAnswers(a => ({ ...a, importance })); next(); }}
            progressPct={pct(7)}
          />
        );

      case 8:
        return (
          <Step08Name
            onSubmit={n => { setAnswers(a => ({ ...a, name: n })); next(); }}
            progressPct={pct(8)}
          />
        );

      case 9:
        return (
          <Step09Zodiac
            onSelect={z => { setAnswers(a => ({ ...a, zodiac: z })); next(); }}
            progressPct={pct(9)}
          />
        );

      case 10:
        return (
          <Step10BirthChart
            zodiac={answers.zodiac || 'Vergine'}
            onContinue={next}
            progressPct={pct(10)}
          />
        );

      case 11:
        return <Step11Audio onContinue={next} progressPct={pct(11)} />;

      case 12:
        return <Step12Testimonials onContinue={next} progressPct={pct(12)} />;

      case 13:
        return (
          <Step13Revelation
            name={answers.name}
            zodiac={answers.zodiac || 'Ariete'}
            onContinue={next}
            progressPct={pct(13)}
          />
        );

      case 14:
        return (
          <Step14Email
            name={answers.name}
            // Endquiz used to report here, on a validated email. It moved to
            // the paywall's own mount so the dashboard column means "saw the
            // offer" rather than "left an address" — see Step15Paywall.
            onSubmit={e => {
              const final = { ...answers, email: e, patterns, desires, importance };
              setAnswers(final);
              saveResults(final);
              next();
            }}
            progressPct={pct(14)}
          />
        );

      case 15:
        return (
          <Step15Paywall
            name={answers.name}
            zodiac={answers.zodiac || 'Ariete'}
            interest={answers.interest}
            // The handoff is assembled here rather than inside the paywall so
            // the step stays a presentational unit that only reports intent —
            // `answers` is already the single source of truth for the name from
            // step 8 and the email from step 14, and threading either of them
            // down as another prop would just duplicate it.
            onCheckout={() => goToCheckout({ name: answers.name, email: answers.email })}
          />
        );

      default:
        return <Step00Landing onStart={() => setStep(0)} />;
    }
  };

  /**
   * Head start for the step-15 player. Four steps, not the two the iframe got.
   *
   * The player's component library is 964KB — the largest single file in the
   * funnel by a distance, and on the throttled profile the rest of this was
   * tuned against that is roughly twenty seconds of transfer. Two steps of
   * warning was enough when preloading barely worked anyway; now that it does,
   * the file is big enough to need the room.
   *
   * Step 11 is where it starts because that screen holds a reader still for a
   * 34-second audio message — the longest voluntary pause in the funnel, and
   * the only one long enough to matter. See VturbPreload.
   */
  const PRELOAD_VSL_FROM = 11;

  return (
    <>
      {step >= PRELOAD_VSL_FROM && <VturbPreload />}
      {renderStep()}
      {/* Dev-only page jumper — stripped from production builds. See DevStepNav. */}
      {process.env.NODE_ENV === 'development' && (
        <DevStepNav step={step} onStep={setStep} />
      )}
    </>
  );
}
