// Janus — App shell
// Holds: persona toggle (applicant ↔ reviewer), flow state, tweaks panel wiring.

const { useState: uState, useEffect: uEffect } = React;

const APPLICANT_SCREENS = [
  { key: 'landing', label: 'Landing', Comp: A0Landing },
  { key: 'section8', label: 'Section 8', Comp: A1Section8 },
  { key: 'form', label: 'Form step', Comp: A2Form },
  { key: 'household', label: 'Household', Comp: A2bHousehold },
  { key: 'coapp', label: 'Co-applicants', Comp: A3CoApplicants },
  { key: 'income', label: 'Income choice', Comp: A4Income },
  { key: 'docs', label: 'Documents', Comp: A5Documents },
  { key: 'identity', label: 'Identity', Comp: A6Identity },
  { key: 'payment', label: 'Payment', Comp: A7Payment },
  { key: 'submitted', label: 'Submitted', Comp: A8Submitted },
  { key: 'decision', label: 'Decision', Comp: A9Decision },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#1e3a5f",
  "decision": "conditional",
  "reviewerView": "detail",
  "applicantStep": 0,
  "dark": false,
  "density": "comfortable"
}/*EDITMODE-END*/;

function App() {
  const [persona, setPersona] = uState('applicant'); // 'applicant' | 'reviewer'
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = uState(false);

  // Applicant flow state
  const [appStep, setAppStep] = uState(t.applicantStep || 0);
  const [flow, setFlow] = uState({});

  // Reviewer flow state
  const [reviewerView, setReviewerView] = uState(t.reviewerView || 'detail');
  const [density, setDensity] = uState(t.density || 'comfortable');
  const [activeAppId, setActiveAppId] = uState('AP-10428');

  // Sync persisted tweaks → state
  uEffect(() => { setAppStep(t.applicantStep || 0); }, [t.applicantStep]);
  uEffect(() => { setReviewerView(t.reviewerView || 'detail'); }, [t.reviewerView]);
  uEffect(() => { setDensity(t.density || 'comfortable'); }, [t.density]);

  // Apply primary color via CSS custom property (overrides token)
  uEffect(() => {
    document.documentElement.style.setProperty('--primary', t.primary);
    // derive hover / soft variants from primary
    const hex = t.primary || '#1e3a5f';
    const { r, g, b } = hexToRgb(hex);
    document.documentElement.style.setProperty('--primary-soft', `rgba(${r}, ${g}, ${b}, 0.07)`);
    document.documentElement.style.setProperty('--primary-soft-2', `rgba(${r}, ${g}, ${b}, 0.14)`);
    document.documentElement.style.setProperty('--primary-hover', lighten(hex, 0.10));
    document.documentElement.style.setProperty('--primary-press', darken(hex, 0.10));
  }, [t.primary]);

  function goNext() { setAppStep(s => Math.min(APPLICANT_SCREENS.length - 1, s + 1)); }
  function goBack() { setAppStep(s => Math.max(0, s - 1)); }
  function jumpTo(i) { setAppStep(i); }

  return (
    <div className="janus-root" style={{
      width: '100%', minHeight: '100vh',
      background: '#e8e3d8',
      padding: '24px 32px 32px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      {/* Top chrome: brand + persona toggle */}
      <Header persona={persona} setPersona={setPersona}
        tweaksOpen={tweaksOpen} setTweaksOpen={setTweaksOpen} />

      {/* Stage */}
      <div data-screen-label={persona === 'applicant' ? `Applicant — ${APPLICANT_SCREENS[appStep].label}` : `Reviewer — ${reviewerView}`}
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          gap: 24, flex: 1,
        }}>
        {persona === 'applicant' ? (
          <ApplicantStage
            step={appStep} jumpTo={jumpTo} goNext={goNext} goBack={goBack}
            flow={flow} setFlow={setFlow}
            decision={t.decision}
          />
        ) : (
          <ReviewerStage
            view={reviewerView} setView={(v) => { setReviewerView(v); setTweak('reviewerView', v); }}
            density={density} setDensity={(d) => { setDensity(d); setTweak('density', d); }}
            dark={t.dark}
            activeAppId={activeAppId} setActiveAppId={setActiveAppId}
            decisionOverride={t.decision}
          />
        )}
      </div>

      {/* Tweaks panel */}
      {tweaksOpen && (
        <JanusTweaks
          t={t} setTweak={setTweak}
          persona={persona} setPersona={setPersona}
          appStep={appStep} setAppStep={(i) => { setAppStep(i); setTweak('applicantStep', i); }}
          reviewerView={reviewerView} setReviewerView={(v) => { setReviewerView(v); setTweak('reviewerView', v); }}
          onClose={() => setTweaksOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────
function Header({ persona, setPersona, tweaksOpen, setTweaksOpen }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px 10px 18px',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(20,23,31,0.07)',
      borderRadius: 14,
      boxShadow: '0 1px 2px rgba(20,23,31,0.04)',
    }}>
      <Row gap={12}>
        <JanusMark size={24} />
        <Stack gap={0}>
          <Row gap={8}>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.012em' }}>Janus</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', padding: '1px 6px', background: 'var(--surface-2)', borderRadius: 999 }}>
              Prototype · v0.4
            </span>
          </Row>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Rental application reviewer · two faces, one product</span>
        </Stack>
      </Row>

      <Row gap={2} style={{
        padding: 3, background: 'var(--surface-2)', borderRadius: 10,
        border: '1px solid var(--hairline)',
      }}>
        {[
          { k: 'applicant', l: 'Applicant', i: I.user(14) },
          { k: 'reviewer', l: 'Reviewer', i: I.building(14) },
        ].map(p => (
          <button key={p.k} onClick={() => setPersona(p.k)} style={{
            padding: '7px 14px', borderRadius: 7,
            fontSize: 13, fontWeight: 500,
            color: persona === p.k ? 'var(--ink)' : 'var(--ink-3)',
            background: persona === p.k ? 'var(--surface)' : 'transparent',
            boxShadow: persona === p.k ? '0 1px 2px rgba(20,23,31,0.06)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            transition: 'all 140ms',
          }}>
            {p.i}
            {p.l}
          </button>
        ))}
      </Row>

      <Row gap={8}>
        <button onClick={() => setTweaksOpen(o => !o)} style={{
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: tweaksOpen ? 'var(--primary-soft)' : 'transparent',
          color: tweaksOpen ? 'var(--primary)' : 'var(--ink-2)',
          border: '1px solid var(--hairline)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {I.settings(13)} Tweaks
        </button>
      </Row>
    </div>
  );
}

// ─── Applicant stage — iPhone frame + step navigator ─────────
function ApplicantStage({ step, jumpTo, goNext, goBack, flow, setFlow, decision }) {
  const ScreenComp = APPLICANT_SCREENS[step].Comp;

  // The iOS frame's status bar would conflict with our header; the
  // ATopBar inside each screen provides the in-app top chrome below it.
  return (
    <Row gap={28} align="flex-start">
      {/* Step rail (left) */}
      <Stack gap={4} style={{
        width: 200, paddingTop: 8,
      }}>
        <SectionLabel style={{ padding: '0 4px 8px' }}>Applicant flow</SectionLabel>
        {APPLICANT_SCREENS.map((s, i) => (
          <button key={s.key} onClick={() => jumpTo(i)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 7, fontSize: 12,
            color: step === i ? 'var(--ink)' : 'var(--ink-3)',
            background: step === i ? 'rgba(255,255,255,0.9)' : 'transparent',
            border: step === i ? '1px solid var(--hairline)' : '1px solid transparent',
            textAlign: 'left',
          }}>
            <span className="tnum" style={{
              width: 18, height: 18, borderRadius: 9,
              background: step === i ? 'var(--primary)' : (step > i ? 'var(--ok)' : 'var(--surface-3)'),
              color: step >= i ? '#fff' : 'var(--ink-3)',
              fontSize: 10, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {step > i ? '✓' : i}
            </span>
            <span style={{ flex: 1, fontWeight: step === i ? 600 : 500 }}>{s.label}</span>
          </button>
        ))}
      </Stack>

      {/* iPhone frame */}
      <div style={{ position: 'relative' }}>
        <IOSDevice width={402} height={830}>
          <ScreenComp
            next={goNext} back={step === 0 ? null : goBack}
            flow={flow} setFlow={setFlow}
            decision={decision}
          />
        </IOSDevice>
        {/* phone caption */}
        <div style={{
          position: 'absolute', top: -2, left: 0,
          fontSize: 11, color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}>
          {/* empty for now */}
        </div>
      </div>

      {/* Annotations on the right */}
      <Annotations step={step} />
    </Row>
  );
}

function Annotations({ step }) {
  const notes = [
    // 0 Landing
    { title: 'The trust moment', body: 'Honest about time, money, and what the fee covers — before the applicant types anything. The trust strip and itemized expectation block exist to lower the temperature before SSN-level data is requested.' },
    // 1 S8
    { title: 'Section 8 as a parallel path', body: 'Same UI weight as any other question. Three choices (incl. "not sure"), neutral copy. The legal note reminds applicants their voucher is protected — they should not feel othered.' },
    // 2 Form
    { title: 'One decision per screen', body: 'Mobile-first: large fields, smart keyboards (inputMode), inline save. "Save and finish later" is always visible because applicants on lunch breaks abandon long forms.' },
    // 3 Household
    { title: 'Dependents, vehicles, pets — in one place', body: 'Pets carry the most complexity: $35/mo rent per pet, plus a one-time deposit, all charged to the card on file. ESA pets with valid documentation are waived. The toggle + inline upload makes the exemption path obvious without making non-ESA applicants feel boxed out.' },
    // 4 Co-applicants
    { title: 'Status board, not a list', body: 'Each invitee gets a card with avatar, progress bar, current step, and resend. The primary applicant can see at a glance who\'s stuck. Submission is gated on everyone completing.' },
    // 5 Income choice
    { title: 'Honest tradeoffs', body: 'Plaid is faster but requires a bank connection. Upload is slower but no credentials shared. Both options are shown as equally valid — not "the easy way" vs "the hard way."' },
    // 6 Documents
    { title: 'Drag, drop, preview, verify', body: 'Each required category shows its completion count. File mini-previews use the document\'s "type stripe" color (paystub=navy, statement=teal) so the applicant can scan their uploads.' },
    // 7 Identity
    { title: 'Hand-off, not abandonment', body: 'Persona handles the actual ID capture. Janus surrounds that handoff with our calm chrome so the applicant doesn\'t feel dumped into a third-party flow.' },
    // 8 Payment
    { title: 'Itemized $75 + the monthly gate', body: 'Where the screening fee goes, line by line. Below it: explicit authorization for the recurring $25/mo management fee (plus $35/pet/mo) — applicants must affirmatively check before the Pay button enables. No silent monthly charges.' },
    // 9 Submitted
    { title: 'What happens next', body: 'A real timeline with expected durations. Applicants stop emailing support when they know exactly when to expect a decision.' },
    // 10 Decision
    { title: 'The hardest screen', body: 'The Approved / Conditional / Denied variants share structure but feel completely different in tone. The Denied screen surfaces FCRA rights inline — not in a footer. Toggle the variant in Tweaks.' },
  ];
  const n = notes[step];
  if (!n) return null;
  return (
    <Stack gap={10} style={{
      width: 280, paddingTop: 8,
    }}>
      <SectionLabel>Design note</SectionLabel>
      <div style={{
        padding: '16px 16px', borderRadius: 12,
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid var(--hairline)',
        backdropFilter: 'blur(6px)',
      }}>
        <Stack gap={8}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>{n.body}</div>
        </Stack>
      </div>

      {step === 9 && (
        <Stack gap={6}>
          <SectionLabel>Try other outcomes</SectionLabel>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Switch the decision state in Tweaks (top-right).</span>
        </Stack>
      )}
    </Stack>
  );
}

// ─── Reviewer stage — browser frame ──────────────────────────
function ReviewerStage({ view, setView, density, setDensity, dark, activeAppId, setActiveAppId, decisionOverride }) {
  const tabs = [
    { title: 'Janus · Applications — Larkin Holdings' },
    { title: 'findigs.com', },
  ];
  const url = view === 'queue' ? 'janus.app/applications' :
              view === 'detail' ? `janus.app/applications/${activeAppId}` :
              view === 'properties' ? 'janus.app/properties/the-larkin-3b' :
              'janus.app';
  return (
    <ChromeWindow tabs={tabs} activeIndex={0} url={url} width={1280} height={830}>
      <RShell view={view} setView={setView} dark={dark} density={density}>
        {view === 'queue' && <RQueue density={density} setDensity={setDensity}
          setView={setView} setActiveAppId={setActiveAppId} />}
        {view === 'detail' && <RDetail density={density} setDensity={setDensity}
          setView={setView} decisionOverride={decisionOverride} />}
        {view === 'properties' && <RProperty density={density} setDensity={setDensity} setView={setView} />}
        {view === 'audit' && <RPlaceholder title="Audit log" />}
        {view === 'settings' && <RPlaceholder title="Settings" />}
      </RShell>
    </ChromeWindow>
  );
}

function RPlaceholder({ title }) {
  return (
    <Stack gap={14} style={{ padding: '40px 28px', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>{title} — coming after v1 hi-fi sweep</span>
    </Stack>
  );
}

// ─── Tweaks panel ─────────────────────────────────────────────
function JanusTweaks({ t, setTweak, persona, setPersona, appStep, setAppStep, reviewerView, setReviewerView, onClose }) {
  return (
    <TweaksPanel title="Janus tweaks" onClose={onClose}>
      <TweakSection title="Persona">
        <TweakRadio label="View"
          value={persona}
          onChange={setPersona}
          options={[
            { value: 'applicant', label: 'Applicant' },
            { value: 'reviewer', label: 'Reviewer' },
          ]}
        />
      </TweakSection>

      {persona === 'applicant' && (
        <TweakSection title="Applicant flow">
          <TweakSelect label="Step"
            value={appStep}
            onChange={(v) => setAppStep(+v)}
            options={APPLICANT_SCREENS.map((s, i) => ({ value: i, label: `${i}. ${s.label}` }))}
          />
          <TweakRadio label="Decision outcome"
            value={t.decision}
            onChange={(v) => setTweak('decision', v)}
            options={[
              { value: 'approve', label: 'Approved' },
              { value: 'conditional', label: 'Conditional' },
              { value: 'deny', label: 'Denied' },
            ]}
          />
        </TweakSection>
      )}

      {persona === 'reviewer' && (
        <TweakSection title="Reviewer view">
          <TweakRadio label="Screen"
            value={reviewerView}
            onChange={setReviewerView}
            options={[
              { value: 'queue', label: 'Queue' },
              { value: 'detail', label: 'Detail' },
              { value: 'properties', label: 'Property' },
            ]}
          />
          <TweakRadio label="Density"
            value={t.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
          <TweakToggle label="Dark mode"
            value={t.dark}
            onChange={(v) => setTweak('dark', v)}
          />
          <TweakRadio label="Recommendation override"
            value={t.decision}
            onChange={(v) => setTweak('decision', v)}
            options={[
              { value: 'approve', label: 'Approve' },
              { value: 'conditional', label: 'Conditional' },
              { value: 'deny', label: 'Deny' },
            ]}
          />
        </TweakSection>
      )}

      <TweakSection title="Brand">
        <TweakColor label="Primary"
          value={t.primary}
          onChange={(v) => setTweak('primary', v)}
          options={['#1e3a5f', '#2d5a4f', '#3f4a3a', '#4a3a52', '#1a1a1a']}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ─── color utils ──────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.min(255, Math.round(c + (255 - c) * amt));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.round(c * (1 - amt)));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

// Boot
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
