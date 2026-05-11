// Janus — Applicant flow (10 screens, mobile-first inside iOS frame)
// All screens are self-contained components that read/write a shared `flow` state
// passed from the App shell. Navigation is via `next`/`back` props.
//
// Screens (in order):
//  0. Landing            — property hero + "Start application"
//  1. Section 8          — voucher question, neutral & equal-weight
//  2. Form step          — representative employment step (1 of 8) with progress
//  3. Co-applicant       — invite + status board
//  4. Income choice      — Plaid vs document upload, honest tradeoffs
//  5. Documents          — drag/drop with previews
//  6. Identity handoff   — Persona placeholder
//  7. Payment            — itemized $75 with Stripe summary
//  8. Submitted          — what happens next
//  9. Decision           — Approved / Conditional / Denied (Tweak-switchable)

const A_BG = 'var(--paper)';

// ─── Shared applicant-screen scaffold ────────────────────────
function AScreen({ children, top, bottom, scroll = true, bg = A_BG, pad = 20 }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg }}>
      {top && <div style={{ flexShrink: 0 }}>{top}</div>}
      <div style={{
        flex: 1, overflow: scroll ? 'auto' : 'hidden',
        padding: pad, paddingBottom: bottom ? 12 : 28,
        display: 'flex', flexDirection: 'column', gap: 16,
      }} className="fade-in ascreen-content">{children}</div>
      {bottom && (
        <div style={{
          flexShrink: 0, padding: '12px 20px 32px',
          background: bg, borderTop: '1px solid var(--hairline)',
        }}>{bottom}</div>
      )}
    </div>
  );
}

// Header used inside applicant screens (not the iOS status bar)
function ATopBar({ back, brand = 'Janus', step, total, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px 12px', background: A_BG,
      borderBottom: '1px solid var(--hairline)',
    }}>
      <div style={{ width: 44 }}>
        {back && (
          <button onClick={back} style={{
            width: 36, height: 36, borderRadius: 18,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-2)',
          }}>{I.arrowL(18)}</button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <JanusMark size={18} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{brand}</span>
      </div>
      <div style={{ width: 44, textAlign: 'right', fontSize: 12, color: 'var(--ink-3)' }}>
        {step != null && total != null ? <span className="tnum">{step} / {total}</span> : right}
      </div>
    </div>
  );
}

// Brand mark: two stacked half-circles, the Janus dual-face hint.
function JanusMark({ size = 20, color = 'var(--primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill={color} />
      <path d="M12 2a10 10 0 010 20V2z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 0. Landing
// ─────────────────────────────────────────────────────────────
function A0Landing({ next, flow }) {
  const p = DEMO.property;
  return (
    <AScreen
      pad={0}
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full onClick={next} trailingIcon={I.arrowR(18)}>
            Start application
          </Btn>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
            About 15 minutes · Save and resume anytime
          </div>
        </Stack>
      }
    >
      {/* Hero photo placeholder — confident, calm */}
      <div style={{
        height: 220, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #d4cab4 0%, #c5b596 40%, #a8946f 100%)',
      }}>
        {/* Building silhouette — placeholder for a real photo */}
        <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}>
          <rect x="40" y="60" width="80" height="160" fill="#3d3225" />
          <rect x="130" y="40" width="120" height="180" fill="#2a2218" />
          <rect x="260" y="80" width="100" height="140" fill="#403427" />
          {[0,1,2,3,4].map(r => [0,1,2].map(c => (
            <rect key={`a-${r}-${c}`} x={50 + c*22} y={75 + r*28} width="14" height="18" fill="#c9b78b" opacity="0.85" />
          )))}
          {[0,1,2,3,4,5].map(r => [0,1,2,3,4].map(c => (
            <rect key={`b-${r}-${c}`} x={140 + c*22} y={55 + r*28} width="14" height="18" fill="#d2c192" opacity="0.85" />
          )))}
          {[0,1,2,3,4].map(r => [0,1,2,3].map(c => (
            <rect key={`c-${r}-${c}`} x={270 + c*22} y={95 + r*26} width="14" height="18" fill="#c4b283" opacity="0.85" />
          )))}
        </svg>
        <div style={{
          position: 'absolute', top: 12, left: 12,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)',
          fontSize: 11, fontWeight: 500, color: 'var(--ink)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />
          Currently accepting applications
        </div>
      </div>

      <Stack gap={24} style={{ padding: '20px 20px 28px' }}>
        <Stack gap={6}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {p.name} · Unit {p.unit}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.015em' }}>
            {p.address}, {p.city}
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
            {p.bed} bed · {p.bath} bath · {p.sqft.toLocaleString()} sq ft · Move-in {p.move_in}
          </div>
        </Stack>

        {/* Key facts grid — quiet, factual */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          border: '1px solid var(--hairline)', borderRadius: 14,
          overflow: 'hidden', background: 'var(--surface)',
        }}>
          {[
            { label: 'Monthly rent', value: <span className="tnum">{fmt.money(p.rent)}</span> },
            { label: 'Security deposit', value: <span className="tnum">{fmt.money(p.deposit)}</span> },
            { label: 'Application fee', value: <span className="tnum">{fmt.money(p.fee)}</span> },
            { label: 'Listed', value: p.listed },
          ].map((c, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              borderBottom: i < 2 ? '1px solid var(--hairline)' : 0,
              borderRight: i % 2 === 0 ? '1px solid var(--hairline)' : 0,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Honest "what to expect" */}
        <Stack gap={12}>
          <SectionLabel>What to expect</SectionLabel>
          {[
            { i: I.user(16), t: 'Personal info, address history, employer', d: '~3 minutes' },
            { i: I.bank(16), t: 'Income verification', d: 'Connect a bank account or upload statements' },
            { i: I.shield(16), t: 'Government ID + selfie', d: 'Handled by Persona — 1 minute' },
            { i: I.card(16), t: <span><span className="tnum">$75</span> screening fee</span>, d: 'Covers credit, background, eviction, references' },
          ].map((row, i) => (
            <Row key={i} gap={12} align="flex-start">
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--primary-soft)', color: 'var(--primary)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{row.i}</div>
              <Stack gap={2} style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{row.t}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{row.d}</div>
              </Stack>
            </Row>
          ))}
        </Stack>

        {/* Trust strip */}
        <div style={{
          display: 'flex', gap: 16, padding: '14px 16px',
          background: 'var(--surface-2)', borderRadius: 12,
          fontSize: 12, color: 'var(--ink-2)',
        }}>
          <Row gap={6}>{I.lock(14)}<span>Encrypted in transit</span></Row>
          <Row gap={6}>{I.shield(14)}<span>SOC 2 Type II</span></Row>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Listed by {p.landlord}. By starting, you agree to our terms and acknowledge that your $75 fee
          is non-refundable once a screening report has been generated.
        </div>
      </Stack>
    </AScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Section 8 — parallel path, never othering
// ─────────────────────────────────────────────────────────────
function A1Section8({ next, back, flow, setFlow }) {
  const set = (v) => { setFlow(f => ({ ...f, voucher: v })); next(); };
  return (
    <AScreen
      top={<ATopBar back={back} step={1} total={8} />}
    >
      <Stack gap={6}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
          Are you applying with a Housing Choice Voucher?
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Sometimes called Section 8. This routes your application correctly so the
          right income calculation is used. Your answer doesn't affect whether you can apply.
        </div>
      </Stack>

      <Stack gap={10} style={{ marginTop: 8 }}>
        <ChoiceCard
          title="Yes, I have a voucher"
          desc="We'll use the tenant-rent portion for income ratio and request your voucher documentation."
          onClick={() => set(true)}
        />
        <ChoiceCard
          title="No"
          desc="We'll use standard gross income calculation."
          onClick={() => set(false)}
        />
        <ChoiceCard
          title="I'm not sure"
          desc="We'll guide you on the next screen."
          onClick={() => set(null)}
          subdued
        />
      </Stack>

      <div style={{
        marginTop: 12, padding: 14, background: 'var(--surface-2)',
        borderRadius: 10, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ color: 'var(--ink-3)', marginTop: 1 }}>{I.info(15)}</span>
        <div>
          <strong style={{ color: 'var(--ink)' }}>Source of income is protected.</strong>{' '}
          California, San Francisco, and most jurisdictions prohibit landlords from refusing
          applicants because they hold a housing voucher.
        </div>
      </div>
    </AScreen>
  );
}

function ChoiceCard({ title, desc, onClick, subdued, selected }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        textAlign: 'left', padding: '16px 16px',
        background: selected ? 'var(--primary-soft)' : (hov ? 'var(--surface-2)' : 'var(--surface)'),
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--hairline-strong)'}`,
        borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 120ms, border-color 120ms, transform 80ms',
        transform: hov ? 'translateY(-0.5px)' : 'none',
        opacity: subdued ? 0.85 : 1,
      }}>
      <Stack gap={4} style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>{desc}</div>}
      </Stack>
      <span style={{ color: 'var(--ink-3)' }}>{I.chevR(18)}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Form step — representative employment step
// ─────────────────────────────────────────────────────────────
function A2Form({ next, back, flow, setFlow }) {
  const [employer, setEmployer] = useState(flow.employer || 'Open Field Studio');
  const [title, setTitle] = useState(flow.title || 'Senior Product Designer');
  const [income, setIncome] = useState(flow.income || '8,200');
  const [start, setStart] = useState(flow.start || 'Apr 2024');
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const advance = () => {
    setFlow(f => ({ ...f, employer, title, income, start }));
    next();
  };

  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={3} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={3} total={8} label="Employment" />
          </div>
        </Stack>
      }
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full onClick={advance} trailingIcon={I.arrowR(18)}>
            Continue
          </Btn>
          <Row justify="center" gap={6}>
            <button onClick={save} style={{ fontSize: 13, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {saved ? <><span style={{ color: 'var(--ok)' }}>{I.check(14)}</span> Saved — pick up by email link</> : <>Save and finish later</>}
            </button>
          </Row>
        </Stack>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Your current employment
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          We'll verify income separately. This helps us cross-check.
        </div>
      </Stack>

      <Stack gap={14} style={{ marginTop: 8 }}>
        <Field label="Employer">
          <Input value={employer} onChange={e => setEmployer(e.target.value)} />
        </Field>
        <Field label="Job title">
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </Field>
        <Field label="Gross monthly income" hint="Before taxes. We verify this against your bank or paystubs.">
          <Input value={income} onChange={e => setIncome(e.target.value)} prefix="$" inputMode="decimal" />
        </Field>
        <Field label="Started working there">
          <Input value={start} onChange={e => setStart(e.target.value)} placeholder="Month and year" />
        </Field>

        {/* Self-employed / different scenarios */}
        <button style={{
          padding: '12px 14px', background: 'var(--surface)',
          border: '1px dashed var(--hairline-strong)', borderRadius: 10,
          textAlign: 'left', color: 'var(--ink-2)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {I.plus(15)}
          <span>Add another job, or list self-employment</span>
        </button>
      </Stack>
    </AScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// 2b. Household — dependents, vehicles, pets (+ ESA waiver)
// ─────────────────────────────────────────────────────────────
function A2bHousehold({ next, back, flow, setFlow }) {
  const [dependents, setDependents] = useState(flow.dependents || [
    { name: 'Mateo Reyes-Okonkwo', age: 4, relation: 'Child' },
  ]);
  const [vehicles, setVehicles] = useState(flow.vehicles || [
    { year: '2019', make: 'Toyota', model: 'Prius', plate: '8KLM429', state: 'CA' },
  ]);
  const [pets, setPets] = useState(flow.pets || [
    { name: 'Mochi', species: 'Dog', breed: 'Mini Aussie', weight: '24', esa: false, esaDoc: null },
  ]);
  const [adding, setAdding] = useState(null); // 'dep' | 'veh' | 'pet' | null

  const monthlyPetRent = pets.reduce((s, p) => s + (p.esa && p.esaDoc ? 0 : 35), 0);
  const advance = () => {
    setFlow(f => ({ ...f, dependents, vehicles, pets, monthlyPetRent }));
    next();
  };

  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={4} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={4} total={8} label="Household" />
          </div>
        </Stack>
      }
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full onClick={advance} trailingIcon={I.arrowR(18)}>
            Continue
          </Btn>
          <Row justify="center" gap={6}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {dependents.length} dependent{dependents.length === 1 ? '' : 's'} ·
              {' '}{vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'} ·
              {' '}{pets.length} pet{pets.length === 1 ? '' : 's'}
            </span>
          </Row>
        </Stack>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Who and what is moving in?
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Anyone living with you, vehicles to register for parking, and any pets.
        </div>
      </Stack>

      {/* Dependents */}
      <HouseholdSection
        icon={I.users(15)}
        title="Dependents"
        subtitle="Children or anyone living with you who isn't an applicant."
        count={dependents.length}
        onAdd={() => setAdding('dep')}
        addLabel="Add dependent"
      >
        {dependents.map((d, i) => (
          <HouseholdRow key={i}
            primary={d.name}
            secondary={<><span>{d.relation}</span> · <span className="tnum">Age {d.age}</span></>}
            icon={<HHAvatar>{d.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</HHAvatar>}
            onRemove={() => setDependents(arr => arr.filter((_, j) => j !== i))}
          />
        ))}
        {adding === 'dep' && (
          <InlineAddForm
            fields={[
              { key: 'name', label: 'Full name', value: '', placeholder: 'Jane Doe' },
              { key: 'age', label: 'Age', value: '', placeholder: '5', short: true, inputMode: 'numeric' },
              { key: 'relation', label: 'Relation', value: 'Child', placeholder: 'Child' },
            ]}
            onSubmit={(vals) => { setDependents(arr => [...arr, vals]); setAdding(null); }}
            onCancel={() => setAdding(null)}
          />
        )}
      </HouseholdSection>

      {/* Vehicles */}
      <HouseholdSection
        icon={I.car(15)}
        title="Vehicles"
        subtitle="Parking permits are issued for registered vehicles."
        count={vehicles.length}
        onAdd={() => setAdding('veh')}
        addLabel="Add vehicle"
      >
        {vehicles.map((v, i) => (
          <HouseholdRow key={i}
            primary={`${v.year} ${v.make} ${v.model}`}
            secondary={<><span className="tnum">{v.plate}</span> · <span>{v.state}</span></>}
            icon={<HHAvatar tone="info">{I.car(16)}</HHAvatar>}
            onRemove={() => setVehicles(arr => arr.filter((_, j) => j !== i))}
          />
        ))}
        {adding === 'veh' && (
          <InlineAddForm
            fields={[
              { key: 'year', label: 'Year', value: '', placeholder: '2022', short: true, inputMode: 'numeric' },
              { key: 'make', label: 'Make', value: '', placeholder: 'Honda' },
              { key: 'model', label: 'Model', value: '', placeholder: 'Civic' },
              { key: 'plate', label: 'License plate', value: '', placeholder: '8ABC123' },
              { key: 'state', label: 'State', value: 'CA', short: true },
            ]}
            onSubmit={(vals) => { setVehicles(arr => [...arr, vals]); setAdding(null); }}
            onCancel={() => setAdding(null)}
          />
        )}
      </HouseholdSection>

      {/* Pets */}
      <HouseholdSection
        icon={I.paw(15)}
        title="Pets"
        subtitle={<>Pet rent is <span className="tnum">$35/mo per pet</span>, charged automatically to the card you use on this application. A one-time <span className="tnum">$300</span> pet deposit per pet is non-refundable and billed when your lease starts. ESA pets with valid documentation are exempt from both.</>}
        count={pets.length}
        onAdd={() => setAdding('pet')}
        addLabel="Add pet"
      >
        {pets.map((p, i) => (
          <PetRow key={i} pet={p}
            onChange={(np) => setPets(arr => arr.map((q, j) => j === i ? np : q))}
            onRemove={() => setPets(arr => arr.filter((_, j) => j !== i))}
          />
        ))}
        {adding === 'pet' && (
          <InlineAddForm
            fields={[
              { key: 'name', label: 'Name', value: '', placeholder: 'Biscuit' },
              { key: 'species', label: 'Species', value: 'Dog', placeholder: 'Dog' },
              { key: 'breed', label: 'Breed', value: '', placeholder: 'Mixed' },
              { key: 'weight', label: 'Weight (lbs)', value: '', placeholder: '20', short: true, inputMode: 'numeric' },
            ]}
            onSubmit={(vals) => { setPets(arr => [...arr, { ...vals, esa: false, esaDoc: null }]); setAdding(null); }}
            onCancel={() => setAdding(null)}
          />
        )}

        {pets.length > 0 && (
          <div style={{
            marginTop: 4, padding: '12px 14px',
            background: 'var(--surface-2)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12,
          }}>
            <Stack gap={2}>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Pet rent (auto-charged monthly)</span>
              <span className="tnum" style={{ fontSize: 16, fontWeight: 600 }}>
                {fmt.money(monthlyPetRent)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> /mo</span>
              </span>
            </Stack>
            <Stack gap={2} style={{ alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>One-time pet deposit · non-refundable</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                {fmt.money(pets.reduce((s, p) => s + (p.esa && p.esaDoc ? 0 : 300), 0))}
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}> at lease start</span>
              </span>
            </Stack>
          </div>
        )}
      </HouseholdSection>
    </AScreen>
  );
}

function HouseholdSection({ icon, title, subtitle, count, onAdd, addLabel, children }) {
  return (
    <Stack gap={10} style={{ marginTop: 4 }}>
      <Row gap={10} align="flex-start" justify="space-between">
        <Row gap={10} align="flex-start" style={{ flex: 1 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--primary-soft)', color: 'var(--primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>{icon}</span>
          <Stack gap={2} style={{ flex: 1 }}>
            <Row gap={8} align="baseline">
              <span style={{ fontSize: 15, fontWeight: 600 }}>{title}</span>
              <span className="tnum" style={{
                fontSize: 11, color: 'var(--ink-3)',
                padding: '1px 6px', background: 'var(--surface-2)', borderRadius: 999,
              }}>{count}</span>
            </Row>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>{subtitle}</span>
          </Stack>
        </Row>
      </Row>

      <Stack gap={8}>
        {children}
        <button onClick={onAdd} style={{
          padding: '11px 14px', background: 'var(--surface)',
          border: '1px dashed var(--hairline-strong)', borderRadius: 10,
          textAlign: 'left', color: 'var(--ink-2)', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: 'var(--primary)' }}>{I.plus(15)}</span>
          <span>{addLabel}</span>
        </button>
      </Stack>
    </Stack>
  );
}

function HouseholdRow({ icon, primary, secondary, onRemove, children }) {
  return (
    <div style={{
      padding: '12px 14px', background: 'var(--surface)',
      border: '1px solid var(--hairline)', borderRadius: 10,
    }}>
      <Row gap={12} align="center">
        {icon}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{primary}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{secondary}</span>
        </Stack>
        {onRemove && (
          <button onClick={onRemove} style={{
            width: 28, height: 28, borderRadius: 14,
            color: 'var(--ink-3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }} aria-label="Remove">
            {I.x(14)}
          </button>
        )}
      </Row>
      {children}
    </div>
  );
}

function HHAvatar({ children, tone = 'primary' }) {
  const bg = tone === 'info' ? 'var(--info-soft)' : 'var(--primary-soft)';
  const fg = tone === 'info' ? 'var(--info)' : 'var(--primary)';
  return (
    <span style={{
      width: 32, height: 32, borderRadius: 16,
      background: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, flexShrink: 0,
    }}>{children}</span>
  );
}

function PetRow({ pet, onChange, onRemove }) {
  const charged = !(pet.esa && pet.esaDoc);
  return (
    <div style={{
      padding: '12px 14px', background: 'var(--surface)',
      border: '1px solid var(--hairline)', borderRadius: 10,
    }}>
      <Row gap={12} align="center">
        <HHAvatar>{I.paw(15)}</HHAvatar>
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{pet.name}</span>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.weight ? <> · <span className="tnum">{pet.weight} lbs</span></> : ''}
          </span>
        </Stack>
        <span className="tnum" style={{
          fontSize: 12, fontWeight: 500,
          color: charged ? 'var(--ink-2)' : 'var(--ok)',
          padding: '3px 7px', borderRadius: 999,
          background: charged ? 'var(--surface-2)' : 'var(--ok-tint)',
        }}>
          {charged ? '$35/mo' : 'Waived'}
        </span>
        <button onClick={onRemove} style={{
          width: 28, height: 28, borderRadius: 14, color: 'var(--ink-3)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }} aria-label="Remove">{I.x(14)}</button>
      </Row>

      {/* ESA toggle */}
      <div style={{
        marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hairline)',
      }}>
        <Row gap={10} align="flex-start" justify="space-between">
          <Stack gap={2} style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Emotional Support Animal</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              With valid documentation, pet rent and deposit are waived. Without it, fees apply.
            </span>
          </Stack>
          <Switch checked={pet.esa} onChange={(v) => onChange({ ...pet, esa: v, esaDoc: v ? pet.esaDoc : null })} />
        </Row>

        {pet.esa && (
          <div style={{ marginTop: 10 }}>
            {pet.esaDoc ? (
              <Row gap={10} align="center" style={{
                padding: '8px 12px', background: 'var(--ok-tint)',
                border: '1px solid rgba(15,118,110,0.18)', borderRadius: 8,
              }}>
                <span style={{ color: 'var(--ok)' }}>{I.check(14)}</span>
                <Stack gap={0} style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{pet.esaDoc.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Pending review · pet fee waived</span>
                </Stack>
                <button onClick={() => onChange({ ...pet, esaDoc: null })} style={{
                  fontSize: 11, color: 'var(--ink-3)', padding: '4px 8px',
                }}>Replace</button>
              </Row>
            ) : (
              <button onClick={() => onChange({ ...pet, esaDoc: { name: 'ESA-letter-' + pet.name.toLowerCase() + '.pdf' } })} style={{
                width: '100%', padding: '11px 14px', background: 'var(--surface-2)',
                border: '1px dashed var(--primary)', borderRadius: 8,
                color: 'var(--primary)', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {I.upload(14)}
                <span>Upload ESA documentation</span>
              </button>
            )}
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.5 }}>
              Letter from a licensed healthcare provider, on letterhead, dated within the last 12 months.
              <strong style={{ color: 'var(--ink-2)' }}> Without valid documentation, the pet fee is mandatory.</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InlineAddForm({ fields, onSubmit, onCancel }) {
  const [vals, setVals] = useState(Object.fromEntries(fields.map(f => [f.key, f.value || ''])));
  const canSubmit = fields.every(f => (vals[f.key] || '').toString().trim().length > 0);
  return (
    <div style={{
      padding: 12, background: 'var(--surface)',
      border: '1px solid var(--primary-soft-2)', borderRadius: 10,
    }}>
      <Stack gap={8}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}>
          {fields.map(f => (
            <div key={f.key} style={{ gridColumn: f.short ? 'span 1' : 'span 2' }}>
              <Stack gap={4}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>{f.label}</span>
                <Input value={vals[f.key]} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} inputMode={f.inputMode} />
              </Stack>
            </div>
          ))}
        </div>
        <Row gap={8} justify="flex-end">
          <button onClick={onCancel} style={{
            padding: '7px 12px', fontSize: 12, color: 'var(--ink-2)',
            borderRadius: 7,
          }}>Cancel</button>
          <button onClick={() => canSubmit && onSubmit(vals)} disabled={!canSubmit} style={{
            padding: '7px 12px', fontSize: 12, fontWeight: 500,
            color: canSubmit ? '#fff' : 'var(--ink-3)',
            background: canSubmit ? 'var(--primary)' : 'var(--surface-2)',
            borderRadius: 7, opacity: canSubmit ? 1 : 0.7,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>Add</button>
        </Row>
      </Stack>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} aria-pressed={checked} style={{
      width: 36, height: 22, borderRadius: 11,
      background: checked ? 'var(--primary)' : 'var(--surface-3)',
      position: 'relative', flexShrink: 0,
      transition: 'background 160ms',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: checked ? 16 : 2,
        width: 18, height: 18, borderRadius: 9,
        background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transition: 'left 160ms',
      }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Co-applicant invite + status board
// ─────────────────────────────────────────────────────────────
function A3CoApplicants({ next, back, flow, setFlow }) {
  const [invites, setInvites] = useState(flow.invites || [
    { name: 'Jordan Reyes', email: 'jordan.r@hey.com', status: 'in_progress', step: 'Income verification', pct: 0.6 },
  ]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const send = () => {
    if (!newName || !newEmail) return;
    setInvites([...invites, { name: newName, email: newEmail, status: 'invited', step: 'Invite sent · awaiting open', pct: 0 }]);
    setNewName(''); setNewEmail(''); setAdding(false);
  };

  const advance = () => {
    setFlow(f => ({ ...f, invites }));
    next();
  };

  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={5} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={5} total={8} label="Co-applicants" />
          </div>
        </Stack>
      }
      bottom={
        <Btn variant="primary" size="lg" full onClick={advance} trailingIcon={I.arrowR(18)}>
          Continue
        </Btn>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Anyone applying with you?
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Each co-applicant gets their own link and pays their own <span className="tnum">$75</span>.
          You'll see their progress here.
        </div>
      </Stack>

      <Stack gap={10} style={{ marginTop: 8 }}>
        {invites.map((inv, i) => <CoAppRow key={i} inv={inv} onRemove={() => setInvites(invites.filter((_, j) => j !== i))} />)}

        {adding ? (
          <Card pad={16} style={{ borderColor: 'var(--primary)', borderWidth: 1 }}>
            <Stack gap={12}>
              <Field label="Full name">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Maria Lopez" />
              </Field>
              <Field label="Email">
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="maria@example.com" type="email" leadingIcon={I.mail(15)} />
              </Field>
              <Row gap={8}>
                <Btn variant="primary" onClick={send}>Send invite</Btn>
                <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
              </Row>
            </Stack>
          </Card>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: '14px 16px', background: 'var(--surface)',
              border: '1px dashed var(--hairline-strong)', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 12,
              color: 'var(--primary)', fontSize: 14, fontWeight: 500,
            }}>
            <span style={{
              width: 28, height: 28, borderRadius: 14,
              background: 'var(--primary-soft)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{I.plus(16)}</span>
            Invite a co-applicant
          </button>
        )}
      </Stack>

      <div style={{
        marginTop: 4, padding: '12px 14px',
        background: 'var(--surface-2)', borderRadius: 10,
        fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5,
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <span style={{ color: 'var(--ink-3)', marginTop: 1 }}>{I.info(14)}</span>
        <span>You can keep filling out your part. Submission waits until every co-applicant finishes and pays.</span>
      </div>
    </AScreen>
  );
}

function CoAppRow({ inv, onRemove }) {
  const statusMap = {
    invited:   { tone: 'info',    label: 'Invite sent', icon: I.mail(12) },
    in_progress: { tone: 'primary', label: 'In progress', icon: I.clock(12) },
    completed: { tone: 'ok',      label: 'Completed', icon: I.check(12) },
    paid:      { tone: 'ok',      label: 'Paid', icon: I.check(12) },
  };
  const st = statusMap[inv.status];
  return (
    <Card pad={14}>
      <Stack gap={12}>
        <Row gap={12} align="center">
          <Avatar name={inv.name} size={36} tone="teal" />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{inv.name}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inv.email}
            </div>
          </Stack>
          <Pill tone={st.tone} icon={st.icon}>{st.label}</Pill>
        </Row>
        <div style={{
          height: 3, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            width: `${(inv.pct || 0) * 100}%`, height: '100%',
            background: inv.status === 'completed' ? 'var(--ok)' : 'var(--primary)',
            transition: 'width 480ms',
          }} />
        </div>
        <Row gap={8} justify="space-between">
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{inv.step}</span>
          <Row gap={4}>
            <button style={{ fontSize: 12, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {I.refresh(13)} Resend
            </button>
            <button onClick={onRemove} style={{ fontSize: 12, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {I.trash(13)}
            </button>
          </Row>
        </Row>
      </Stack>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Income verification choice — Plaid vs upload, honest tradeoffs
// ─────────────────────────────────────────────────────────────
function A4Income({ next, back, setFlow }) {
  const pick = (method) => { setFlow(f => ({ ...f, income_method: method })); next(); };
  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={6} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={6} total={8} label="Income verification" />
          </div>
        </Stack>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Verify your income
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          Pick whichever works for you. Both are equally accepted.
        </div>
      </Stack>

      <Stack gap={12} style={{ marginTop: 8 }}>
        {/* Plaid */}
        <button
          onClick={() => pick('plaid')}
          style={{
            textAlign: 'left', padding: '18px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
            position: 'relative',
          }}>
          <Row gap={12} align="center">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--primary-soft)', color: 'var(--primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{I.bank(20)}</div>
            <Stack gap={2} style={{ flex: 1 }}>
              <Row gap={8}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Connect a bank account</span>
                <Pill tone="ok" size="xs">Fastest</Pill>
              </Row>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Powered by Plaid · about 2 minutes</span>
            </Stack>
          </Row>
          <Stack gap={6}>
            {['Read-only access — Plaid cannot move money', 'We see deposits, not transactions', 'Disconnect anytime after the report runs'].map((t, i) => (
              <Row key={i} gap={8} align="flex-start">
                <span style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }}>{I.check(13)}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t}</span>
              </Row>
            ))}
          </Stack>
        </button>

        {/* Upload */}
        <button
          onClick={() => pick('upload')}
          style={{
            textAlign: 'left', padding: '18px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 14,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
          <Row gap={12} align="center">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--info-soft)', color: 'var(--info)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>{I.doc(20)}</div>
            <Stack gap={2} style={{ flex: 1 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Upload documents</span>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>2 paystubs + 3 bank statements · ~5 minutes</span>
            </Stack>
          </Row>
          <Stack gap={6}>
            {['Best if you don\'t want to connect a bank', 'Manual review may add 1 business day', 'PDF, PNG, JPG accepted'].map((t, i) => (
              <Row key={i} gap={8} align="flex-start">
                <span style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }}>{I.info(13)}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t}</span>
              </Row>
            ))}
          </Stack>
        </button>
      </Stack>

      <div style={{
        marginTop: 8, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ marginTop: 1 }}>{I.lock(13)}</span>
        <span>Your bank credentials never reach Larkin Holdings or Janus. Plaid is a Visa company used by Venmo, Robinhood, and most US banking apps.</span>
      </div>
    </AScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. Documents — drag/drop with file previews
// ─────────────────────────────────────────────────────────────
function A5Documents({ next, back, flow, setFlow }) {
  const [files, setFiles] = useState(flow.files || [
    { kind: 'paystub', name: '2026-04 Paystub.pdf', size: 240, status: 'uploaded' },
    { kind: 'bank', name: 'Chase — Apr 2026.pdf', size: 1100, status: 'uploaded' },
  ]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(null);

  const add = (name, kind = 'doc') => {
    const newFile = { kind, name, size: 180 + Math.floor(Math.random() * 1200), status: 'uploading' };
    setFiles(prev => [...prev, newFile]);
    setUploading(name);
    setTimeout(() => {
      setFiles(prev => prev.map(f => f.name === name ? { ...f, status: 'uploaded' } : f));
      setUploading(null);
    }, 1400);
  };

  const required = [
    { key: 'paystubs', label: 'Recent paystubs', desc: 'Your 2 most recent', need: 2,
      have: files.filter(f => f.kind === 'paystub').length },
    { key: 'bank',     label: 'Bank statements', desc: 'Most recent 3 months', need: 3,
      have: files.filter(f => f.kind === 'bank').length },
  ];
  const complete = required.every(r => r.have >= r.need);

  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={6} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={6} total={8} label="Income documents" />
          </div>
        </Stack>
      }
      bottom={
        <Btn variant="primary" size="lg" full onClick={next} disabled={!complete} trailingIcon={I.arrowR(18)}>
          {complete ? 'Continue' : `Upload ${required.reduce((s, r) => s + Math.max(0, r.need - r.have), 0)} more`}
        </Btn>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Upload your documents
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          PDF, PNG, or JPG. Each up to 25 MB.
        </div>
      </Stack>

      {/* Required checklist */}
      <Stack gap={8} style={{ marginTop: 4 }}>
        {required.map((r) => {
          const done = r.have >= r.need;
          return (
            <Row key={r.key} gap={10} style={{
              padding: '10px 14px', borderRadius: 10,
              background: done ? 'var(--ok-tint)' : 'var(--surface-2)',
              border: `1px solid ${done ? 'rgba(15,118,110,0.18)' : 'var(--hairline)'}`,
            }}>
              <span style={{ color: done ? 'var(--ok)' : 'var(--ink-3)' }}>
                {done ? I.check(16) : I.doc(15)}
              </span>
              <Stack gap={0} style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.desc}</div>
              </Stack>
              <span className="tnum" style={{ fontSize: 12, color: done ? 'var(--ok)' : 'var(--ink-3)', fontWeight: 500 }}>
                {r.have} / {r.need}
              </span>
            </Row>
          );
        })}
      </Stack>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add('Dropped file.pdf', 'paystub'); }}
        style={{
          padding: 24, borderRadius: 14,
          border: `2px dashed ${drag ? 'var(--primary)' : 'var(--hairline-strong)'}`,
          background: drag ? 'var(--primary-soft)' : 'var(--surface)',
          textAlign: 'center', transition: 'all 160ms',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: 'var(--primary-soft)', color: 'var(--primary)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{I.upload(20)}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Drag files here, or tap to browse</div>
        <Row gap={8} style={{ marginTop: 6 }}>
          <Btn size="sm" variant="secondary" onClick={() => add(`Paystub-${files.length + 1}.pdf`, 'paystub')}>Add paystub</Btn>
          <Btn size="sm" variant="secondary" onClick={() => add(`Statement-${files.length + 1}.pdf`, 'bank')}>Add statement</Btn>
        </Row>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <Stack gap={8}>
          <SectionLabel>Uploaded · <span className="tnum">{files.length}</span></SectionLabel>
          {files.map((f, i) => <FileRow key={i} file={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />)}
        </Stack>
      )}
    </AScreen>
  );
}

function FileRow({ file, onRemove }) {
  const uploading = file.status === 'uploading';
  return (
    <Row gap={10} style={{
      padding: '10px 12px', background: 'var(--surface)',
      border: '1px solid var(--hairline)', borderRadius: 10,
    }}>
      {/* Mini PDF "preview" — page silhouette with type */}
      <div style={{
        width: 36, height: 44, borderRadius: 4, position: 'relative',
        background: '#fff', border: '1px solid var(--hairline-strong)',
        flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{ height: 6, background: file.kind === 'paystub' ? 'var(--primary)' : 'var(--ok)' }} />
        <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 2, background: 'var(--surface-3)', width: '80%' }} />
          <div style={{ height: 2, background: 'var(--surface-3)', width: '60%' }} />
          <div style={{ height: 2, background: 'var(--surface-3)', width: '70%' }} />
          <div style={{ height: 2, background: 'var(--surface-3)', width: '50%' }} />
        </div>
      </div>
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }} className="tnum">
          {uploading ? 'Uploading…' : `${file.size < 1000 ? file.size + ' KB' : (file.size / 1000).toFixed(1) + ' MB'} · ${file.kind === 'paystub' ? 'Paystub' : 'Bank statement'}`}
        </div>
      </Stack>
      {uploading ? (
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          border: '2px solid var(--surface-3)', borderTopColor: 'var(--primary)',
          animation: 'janus-spin 700ms linear infinite',
        }} />
      ) : (
        <>
          <span style={{ color: 'var(--ok)' }}>{I.check(16)}</span>
          <button onClick={onRemove} style={{ color: 'var(--ink-3)', padding: 4 }}>{I.x(15)}</button>
        </>
      )}
    </Row>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Identity verification handoff (Persona placeholder)
// ─────────────────────────────────────────────────────────────
function A6Identity({ next, back }) {
  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={7} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={7} total={8} label="Identity" />
          </div>
        </Stack>
      }
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full onClick={next} trailingIcon={I.arrowR(18)}>
            Open Persona to verify
          </Btn>
          <Row justify="center" gap={6}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Takes about 60 seconds. Janus never sees your ID image.</span>
          </Row>
        </Stack>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Verify your identity
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          You'll snap a photo of your driver's license or passport and a quick selfie.
          This is handled by Persona, a regulated ID-verification service.
        </div>
      </Stack>

      {/* ID illustration — placeholder card silhouette */}
      <div style={{
        marginTop: 12, marginBottom: 8, padding: '32px 20px',
        background: 'var(--surface-2)', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 220, height: 140, borderRadius: 12,
          background: 'linear-gradient(135deg, #f3eedf 0%, #e8dec5 100%)',
          border: '1px solid var(--hairline-strong)',
          padding: 14, position: 'relative',
          boxShadow: '0 12px 24px rgba(20,23,31,0.10), 0 1px 0 rgba(255,255,255,0.6) inset',
          transform: 'rotate(-3deg)',
        }}>
          <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Driver License</div>
          <div style={{ width: 60, height: 70, marginTop: 6, borderRadius: 4,
            background: 'linear-gradient(135deg, #bdb39b, #8a7d5c)',
            position: 'absolute', left: 14, top: 32 }} />
          <div style={{ position: 'absolute', left: 82, top: 36, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 90, height: 8, background: 'rgba(20,23,31,0.18)', borderRadius: 2 }} />
            <div style={{ width: 70, height: 5, background: 'rgba(20,23,31,0.10)', borderRadius: 2, marginTop: 4 }} />
            <div style={{ width: 100, height: 5, background: 'rgba(20,23,31,0.10)', borderRadius: 2 }} />
            <div style={{ width: 60, height: 5, background: 'rgba(20,23,31,0.10)', borderRadius: 2 }} />
          </div>
        </div>
      </div>

      <Stack gap={10}>
        {[
          { i: I.doc(15), t: 'Driver license, state ID, or passport' },
          { i: I.user(15), t: 'A short selfie video for liveness check' },
          { i: I.lock(15), t: 'Encrypted and stored by Persona, not Janus' },
        ].map((row, i) => (
          <Row key={i} gap={12} style={{
            padding: '10px 14px', background: 'var(--surface)',
            border: '1px solid var(--hairline)', borderRadius: 10,
          }}>
            <span style={{ color: 'var(--ink-3)' }}>{row.i}</span>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>{row.t}</span>
          </Row>
        ))}
      </Stack>
    </AScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Payment — itemized $75
// ─────────────────────────────────────────────────────────────
function A7Payment({ next, back, flow }) {
  const items = [
    { label: 'Application processing', amount: 12 },
    { label: 'Identity verification (Stripe Identity)', amount: 8 },
    { label: 'Reference & document handling', amount: 10 },
  ];
  const total = items.reduce((s, i) => s + i.amount, 0);
  const [loading, setLoading] = useState(false);
  const [acceptRecurring, setAcceptRecurring] = useState(false);

  const pets = flow?.pets || [];
  const chargedPets = pets.filter(p => !(p.esa && p.esaDoc));
  const petRent = chargedPets.length * 35;
  const mgmtFee = 25;
  const monthlyTotal = mgmtFee + petRent;

  const submit = () => {
    if (!acceptRecurring) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); next(); }, 1400);
  };
  return (
    <AScreen
      top={
        <Stack gap={0}>
          <ATopBar back={back} step={8} total={8} />
          <div style={{ padding: '12px 20px 14px', background: A_BG, borderBottom: '1px solid var(--hairline)' }}>
            <Progress value={8} total={8} label="Payment" />
          </div>
        </Stack>
      }
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full onClick={submit} disabled={loading || !acceptRecurring}
            leadingIcon={loading ? null : I.lock(15)}>
            {loading ? 'Processing…' : <>Pay <span className="tnum">{fmt.money(total)}</span> and submit</>}
          </Btn>
          <Row justify="center" gap={6} style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            <span>{acceptRecurring ? 'Powered by Stripe' : 'Review the monthly charges below to continue'}</span>
            {acceptRecurring && <>
              <span style={{ width: 3, height: 3, borderRadius: 2, background: 'var(--ink-3)' }} />
              <span>Receipt to your email</span>
            </>}
          </Row>
        </Stack>
      }
    >
      <Stack gap={6}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
          Platform fee
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          <span className="tnum">$30</span> for everything we do. The screening report (~<span className="tnum">$40</span>) is paid to TransUnion directly in the next step — we don't mark it up.
        </div>
      </Stack>

      {/* Itemized */}
      <Card pad={0}>
        <Stack gap={0}>
          {items.map((item, i) => (
            <Row key={i} gap={12} justify="space-between" style={{
              padding: '14px 18px',
              borderBottom: i < items.length - 1 ? '1px solid var(--hairline)' : 0,
            }}>
              <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{item.label}</span>
              <span className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{fmt.money(item.amount, { cents: true })}</span>
            </Row>
          ))}
          <Row gap={12} justify="space-between" style={{
            padding: '16px 18px', background: 'var(--surface-2)',
            borderTop: '1px solid var(--hairline)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
            <span className="tnum" style={{ fontSize: 18, fontWeight: 600 }}>{fmt.money(total)}</span>
          </Row>
        </Stack>
      </Card>

      {/* Stripe card field — visual only */}
      <Stack gap={10}>
        <SectionLabel>Card details</SectionLabel>
        <Card pad={14}>
          <Stack gap={10}>
            <Row gap={8} align="center">
              <span style={{ color: 'var(--ink-3)' }}>{I.card(16)}</span>
              <span className="tnum" style={{ flex: 1, fontSize: 15, letterSpacing: '0.04em', color: 'var(--ink)' }}>
                4242 4242 4242 4242
              </span>
              <Row gap={6}>
                <span style={{ width: 24, height: 16, background: 'var(--surface-3)', borderRadius: 3 }} />
                <span style={{ width: 24, height: 16, background: 'var(--surface-3)', borderRadius: 3, opacity: 0.5 }} />
              </Row>
            </Row>
            <Row gap={8}>
              <span className="tnum" style={{ flex: 1, fontSize: 15, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, color: 'var(--ink-3)' }}>
                MM / YY
              </span>
              <span className="tnum" style={{ width: 90, fontSize: 15, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, color: 'var(--ink-3)' }}>
                CVC
              </span>
            </Row>
          </Stack>
        </Card>
      </Stack>

      {/* Recurring monthly charges — the gate */}
      <Stack gap={10}>
        <SectionLabel>Authorize monthly charges</SectionLabel>
        <Card pad={0}>
          <Stack gap={0}>
            <Row gap={12} justify="space-between" style={{ padding: '14px 18px' }}>
              <Stack gap={2} style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Management fee</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  Charged monthly to the card on file, for the duration of the lease.
                </span>
              </Stack>
              <span className="tnum" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {fmt.money(mgmtFee)}<span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}> /mo</span>
              </span>
            </Row>

            {chargedPets.length > 0 && (
              <Row gap={12} justify="space-between" style={{
                padding: '14px 18px', borderTop: '1px solid var(--hairline)',
              }}>
                <Stack gap={2} style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    Pet rent · {chargedPets.length} pet{chargedPets.length === 1 ? '' : 's'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                    <span className="tnum">$35</span>/mo per pet, billed with your management fee.
                    {pets.length > chargedPets.length && (
                      <> {pets.length - chargedPets.length} ESA pet{pets.length - chargedPets.length === 1 ? '' : 's'} waived.</>
                    )}
                  </span>
                </Stack>
                <span className="tnum" style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {fmt.money(petRent)}<span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}> /mo</span>
                </span>
              </Row>
            )}

            <Row gap={12} justify="space-between" style={{
              padding: '14px 18px', background: 'var(--surface-2)',
              borderTop: '1px solid var(--hairline)',
            }}>
              <Stack gap={2}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                  Total monthly
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Starts the first of the month after move-in.</span>
              </Stack>
              <span className="tnum" style={{ fontSize: 18, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {fmt.money(monthlyTotal)}<span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}> /mo</span>
              </span>
            </Row>

            {/* The gate */}
            <button onClick={() => setAcceptRecurring(v => !v)} style={{
              padding: '14px 18px', textAlign: 'left',
              borderTop: '1px solid var(--hairline)',
              background: acceptRecurring ? 'var(--primary-soft)' : 'var(--surface)',
              cursor: 'pointer', width: '100%',
              transition: 'background 140ms',
            }}>
              <Row gap={12} align="flex-start">
                <span style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                  background: acceptRecurring ? 'var(--primary)' : 'var(--surface)',
                  border: '1.5px solid ' + (acceptRecurring ? 'var(--primary)' : 'var(--hairline-strong)'),
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>
                  {acceptRecurring && I.check(13)}
                </span>
                <Stack gap={3} style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    I authorize recurring monthly charges.
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                    I agree that the card I use today is kept on file and automatically charged
                    {' '}<span className="tnum">{fmt.money(monthlyTotal)}/mo</span>
                    {chargedPets.length > 0 && <> (<span className="tnum">{fmt.money(mgmtFee)}</span> management + <span className="tnum">{fmt.money(petRent)}</span> pet rent)</>}
                    {' '}while my lease is active.
                    {chargedPets.length > 0 && <> A one-time, non-refundable pet deposit of <span className="tnum">{fmt.money(chargedPets.length * 300)}</span> will be charged to the same card when the lease starts.</>}
                    {' '}Monthly charges begin after move-in. I can update my card from the resident portal.
                  </span>
                </Stack>
              </Row>
            </button>
          </Stack>
        </Card>
      </Stack>

      <Row gap={8} style={{
        fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55,
        padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8,
        alignItems: 'flex-start',
      }}>
        <span style={{ marginTop: 1, color: 'var(--ink-3)' }}>{I.info(14)}</span>
        <span>
          Non-refundable once the screening report is generated. If we cancel before that, you'll be refunded automatically.
        </span>
      </Row>
    </AScreen>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Submitted / status — what happens next
// ─────────────────────────────────────────────────────────────
function A8Submitted({ next, flow }) {
  const timeline = [
    { state: 'done', label: 'Application submitted', when: 'Just now', detail: 'Confirmation sent to ' + DEMO.primary.email },
    { state: 'doing', label: 'Reports running', when: 'In progress', detail: 'Credit · criminal · eviction · references' },
    { state: 'todo', label: 'Landlord review', when: 'Within 3 business days', detail: 'You\'ll get an email either way' },
    { state: 'todo', label: 'Decision', when: '', detail: '' },
  ];
  return (
    <AScreen
      top={<ATopBar brand="Janus" right="Status" />}
      bottom={<Btn variant="secondary" size="lg" full onClick={next}>See sample decision page</Btn>}
    >
      {/* Success card */}
      <Card style={{ background: 'var(--ok-tint)', borderColor: 'rgba(15,118,110,0.18)' }} pad={20}>
        <Stack gap={10}>
          <div style={{
            width: 44, height: 44, borderRadius: 22,
            background: 'var(--ok)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{I.check(20)}</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Your application is in.
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            Larkin Holdings will review your application and you'll hear back within 3 business days.
            We'll email you either way — approved, conditional, or denied.
          </div>
          <Row gap={10} style={{ marginTop: 4 }}>
            <Pill tone="neutral" size="sm">Application <span className="tnum">#AP-10428</span></Pill>
          </Row>
        </Stack>
      </Card>

      {/* Timeline */}
      <Stack gap={0} style={{ marginTop: 8 }}>
        <SectionLabel style={{ marginBottom: 14 }}>What happens next</SectionLabel>
        {timeline.map((step, i) => (
          <TimelineRow key={i} step={step} last={i === timeline.length - 1} />
        ))}
      </Stack>

      {/* What you can still do */}
      <Stack gap={10}>
        <SectionLabel>Things you can still do</SectionLabel>
        <Stack gap={8}>
          <ActionRow icon={I.users(15)} label="Resend co-applicant reminder" detail="Jordan — completed today" />
          <ActionRow icon={I.download(15)} label="Download a copy of your application" detail="PDF · 4 pages" />
          <ActionRow icon={I.mail(15)} label="Email support" detail="help@janus.app · ~2 hours" />
        </Stack>
      </Stack>
    </AScreen>
  );
}

function TimelineRow({ step, last }) {
  const states = {
    done: { bg: 'var(--ok)', dot: '#fff', label: 'var(--ok)' },
    doing: { bg: 'var(--primary)', dot: '#fff', label: 'var(--primary)' },
    todo: { bg: 'var(--surface-3)', dot: 'var(--ink-4)', label: 'var(--ink-3)' },
  };
  const s = states[step.state];
  return (
    <div style={{ display: 'flex', gap: 14, paddingBottom: last ? 0 : 18, position: 'relative' }}>
      <div style={{ width: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          background: s.bg, color: s.dot,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1,
        }}>
          {step.state === 'done' ? I.check(13) :
           step.state === 'doing' ? <span style={{
             width: 8, height: 8, borderRadius: 4, background: '#fff',
             animation: 'janus-pulse 1.4s ease-in-out infinite',
           }} /> :
           <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--surface)' }} />}
        </div>
        {!last && <div style={{ width: 1, flex: 1, background: 'var(--hairline-strong)', marginTop: 2, minHeight: 18 }} />}
      </div>
      <Stack gap={2} style={{ flex: 1, paddingBottom: 4 }}>
        <Row gap={8} justify="space-between" align="baseline">
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{step.label}</span>
          <span style={{ fontSize: 11, color: s.label, fontWeight: 500 }}>{step.when}</span>
        </Row>
        {step.detail && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{step.detail}</span>}
      </Stack>
    </div>
  );
}

function ActionRow({ icon, label, detail }) {
  return (
    <Row gap={12} style={{
      padding: '10px 14px', background: 'var(--surface)',
      border: '1px solid var(--hairline)', borderRadius: 10,
      cursor: 'pointer',
    }}>
      <span style={{ color: 'var(--ink-3)' }}>{icon}</span>
      <Stack gap={1} style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{detail}</span>
      </Stack>
      <span style={{ color: 'var(--ink-4)' }}>{I.chevR(14)}</span>
    </Row>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. Decision page — Approved / Conditional / Denied
// ─────────────────────────────────────────────────────────────
function A9Decision({ back, decision = 'conditional' }) {
  if (decision === 'approve') return <DecisionApproved back={back} />;
  if (decision === 'deny') return <DecisionDenied back={back} />;
  return <DecisionConditional back={back} />;
}

function DecisionApproved({ back }) {
  return (
    <AScreen
      top={<ATopBar back={back} brand="Janus" right="Decision" />}
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full trailingIcon={I.arrowR(18)}>Continue to lease signing</Btn>
          <Btn variant="ghost" size="md" full>Download decision letter (PDF)</Btn>
        </Stack>
      }
    >
      <Stack gap={10}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'var(--ok-tint)', color: 'var(--ok)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(15,118,110,0.20)',
        }}>{I.check(32)}</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          You're approved.
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          Larkin Holdings has approved your application for <strong>The Larkin · Unit 3B</strong>.
          The next step is signing the lease.
        </div>
      </Stack>

      <Card pad={0}>
        <Stack gap={0}>
          <Row gap={12} justify="space-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Property</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>The Larkin · 3B</span>
          </Row>
          <Row gap={12} justify="space-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Monthly rent</span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{fmt.money(3250)}</span>
          </Row>
          <Row gap={12} justify="space-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Security deposit</span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 500 }}>{fmt.money(3250)}</span>
          </Row>
          <Row gap={12} justify="space-between" style={{ padding: '14px 18px' }}>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Move-in date</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Jun 1, 2026</span>
          </Row>
        </Stack>
      </Card>

      <Stack gap={6}>
        <SectionLabel>What you'll get by email</SectionLabel>
        <Stack gap={8}>
          {['Approval letter from Larkin Holdings', 'Lease agreement to sign', 'Security deposit instructions'].map((t, i) => (
            <Row key={i} gap={10} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 10 }}>
              <span style={{ color: 'var(--ok)' }}>{I.check(15)}</span>
              <span style={{ fontSize: 13 }}>{t}</span>
            </Row>
          ))}
        </Stack>
      </Stack>
    </AScreen>
  );
}

function DecisionConditional({ back }) {
  return (
    <AScreen
      top={<ATopBar back={back} brand="Janus" right="Decision" />}
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full trailingIcon={I.arrowR(18)}>Accept conditional approval</Btn>
          <Btn variant="ghost" size="md" full>Decline and request review</Btn>
        </Stack>
      }
    >
      <Stack gap={10}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'var(--warn-tint)', color: 'var(--warn)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(167,99,16,0.22)',
        }}>{I.check(32)}</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          You're approved, with conditions.
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          Larkin Holdings would like to move forward. To proceed, they're asking for a
          larger security deposit. You can accept or decline.
        </div>
      </Stack>

      {/* The condition itself — clear, factual */}
      <Card pad={18} style={{ background: 'var(--warn-tint)', borderColor: 'rgba(167,99,16,0.22)' }}>
        <Stack gap={10}>
          <SectionLabel style={{ color: 'var(--warn)' }}>The condition</SectionLabel>
          <Row gap={16} align="flex-start">
            <Stack gap={2} style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Standard deposit</span>
              <span className="tnum" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{fmt.money(3250)}</span>
            </Stack>
            <span style={{ color: 'var(--warn)', alignSelf: 'center' }}>{I.arrowR(20)}</span>
            <Stack gap={2} style={{ flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--warn)' }}>Conditional deposit</span>
              <span className="tnum" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{fmt.money(6500)}</span>
            </Stack>
          </Row>
          <Rule style={{ background: 'rgba(167,99,16,0.18)' }} />
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--ink)' }}>Why:</strong> Combined credit score 612 is below the
            property's <span className="tnum">650</span> threshold. The increased deposit offsets that risk.
          </div>
          <Row gap={8} justify="flex-start">
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Rent remains <span className="tnum">{fmt.money(3250)}/mo</span> — no other changes.</span>
          </Row>
        </Stack>
      </Card>

      {/* This is a real path forward, not a soft no */}
      <Stack gap={6}>
        <SectionLabel>What changes if you accept</SectionLabel>
        <Stack gap={8}>
          {[
            { i: I.check(15), t: 'Deposit due at signing: $6,500', d: 'Held in escrow per California law' },
            { i: I.check(15), t: 'Refundable when you move out', d: 'Same protections as any deposit' },
            { i: I.check(15), t: 'No effect on your credit report', d: 'This decision is not reported' },
          ].map((row, i) => (
            <Row key={i} gap={12} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 10 }}>
              <span style={{ color: 'var(--ok)' }}>{row.i}</span>
              <Stack gap={1} style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{row.t}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{row.d}</span>
              </Stack>
            </Row>
          ))}
        </Stack>
      </Stack>

      <div style={{
        padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10,
        fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--ink)' }}>You have 7 days to decide.</strong> Either choice is fine —
        if you'd rather walk away, your application fee is non-refundable but no other money changes hands.
      </div>
    </AScreen>
  );
}

function DecisionDenied({ back }) {
  return (
    <AScreen
      top={<ATopBar back={back} brand="Janus" right="Decision" />}
      bottom={
        <Stack gap={10}>
          <Btn variant="primary" size="lg" full leadingIcon={I.download(16)}>Download free credit report</Btn>
          <Btn variant="secondary" size="md" full>Dispute this decision</Btn>
        </Stack>
      }
    >
      {/* Headline — calm, direct, never sugarcoated */}
      <Stack gap={10}>
        <div style={{
          width: 64, height: 64, borderRadius: 32,
          background: 'var(--bad-tint)', color: 'var(--bad)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(155,56,56,0.20)',
        }}>{I.x(28)}</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          Your application was denied.
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          Larkin Holdings declined to rent to you for The Larkin · Unit 3B. We're required by federal law to
          tell you the reasons and your rights. They're below.
        </div>
      </Stack>

      {/* The reasons — factual, no euphemism */}
      <Card pad={0}>
        <Stack gap={0}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)' }}>
            <SectionLabel>Reasons given</SectionLabel>
          </div>
          {[
            { reason: 'Credit score below property minimum', detail: 'Reported score 540 · property minimum 650', source: 'Experian' },
            { reason: 'Income below property threshold', detail: 'Verified income 2.4× rent · property requires 3.0×', source: 'Plaid · Wells Fargo' },
          ].map((r, i) => (
            <Stack gap={4} key={i} style={{
              padding: '14px 18px',
              borderBottom: i < 1 ? '1px solid var(--hairline)' : 0,
            }}>
              <Row gap={10} justify="space-between" align="flex-start">
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{r.reason}</span>
                <Pill tone="neutral" size="xs">{r.source}</Pill>
              </Row>
              <span className="tnum" style={{ fontSize: 13, color: 'var(--ink-2)' }}>{r.detail}</span>
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* FCRA rights — surfaced, not buried */}
      <Card pad={18} style={{ background: 'var(--surface-2)' }}>
        <Stack gap={12}>
          <Row gap={10}>
            <span style={{ color: 'var(--primary)' }}>{I.shield(18)}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Your rights under federal law</span>
          </Row>
          <Stack gap={10}>
            {[
              { t: 'Free copy of your credit report', d: 'You have 60 days to request a free copy from Experian — the agency we used. They didn\'t make the decision; we did.' },
              { t: 'Dispute inaccurate information', d: 'If anything in the report is wrong, you can dispute it directly with Experian and they must investigate.' },
              { t: 'Reapply when ready', d: 'There\'s no penalty for applying again, here or elsewhere. This decision isn\'t shared with other landlords.' },
            ].map((r, i) => (
              <Stack gap={3} key={i}>
                <Row gap={8} align="flex-start">
                  <span style={{ color: 'var(--primary)', marginTop: 2 }}>{I.check(14)}</span>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.t}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>{r.d}</span>
                  </Stack>
                </Row>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Refund clarity */}
      <div style={{
        padding: '12px 14px', background: 'var(--surface)',
        border: '1px solid var(--hairline)', borderRadius: 10,
        fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55,
      }}>
        <strong style={{ color: 'var(--ink)' }}>About your fee.</strong>{' '}
        The <span className="tnum">$75</span> screening fee is non-refundable because the reports were
        already generated. None of it went to Larkin Holdings.
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        This is an Adverse Action Notice under the Fair Credit Reporting Act, 15 U.S.C. § 1681m.
        Consumer reporting agency: Experian, P.O. Box 4500, Allen, TX 75013 · (888) 397-3742.
      </div>
    </AScreen>
  );
}

Object.assign(window, {
  A0Landing, A1Section8, A2Form, A3CoApplicants, A4Income,
  A5Documents, A6Identity, A7Payment, A8Submitted, A9Decision,
  JanusMark,
});
