// Janus — Reviewer flow
// Desktop primary. Density toggle. Dark-mode capable.
// Screens:
//   R-queue:   org-wide application queue (table)
//   R-detail:  THE application detail page (recommendation + all data)
//   R-property: property setup with jurisdiction warning
//
// Layout idiom: sidebar nav, dense top bar, content area.

// ─── Sidebar / shell ─────────────────────────────────────────
function RShell({ view, setView, dark, density, children }) {
  return (
    <div className={dark ? 'dark' : ''} style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--paper)', color: 'var(--ink)',
      fontSize: density === 'compact' ? 13 : 14,
    }}>
      <RSidebar view={view} setView={setView} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

function RSidebar({ view, setView }) {
  const nav = [
    { key: 'queue', label: 'Applications', icon: I.users(16), count: 7 },
    { key: 'properties', label: 'Properties', icon: I.building(16), count: 3 },
    { key: 'detail', label: null, hidden: true },
  ];
  const secondary = [
    { key: 'audit', label: 'Audit log', icon: I.flag(16) },
    { key: 'settings', label: 'Settings', icon: I.settings(16) },
  ];
  return (
    <div style={{
      width: 232, flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--hairline)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 10px',
    }}>
      <Row gap={10} style={{ padding: '6px 10px 14px' }}>
        <JanusMark size={22} />
        <Stack gap={0}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Janus</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Larkin Holdings</span>
        </Stack>
      </Row>

      <Stack gap={1}>
        {nav.filter(n => !n.hidden).map(n => (
          <button key={n.key} onClick={() => setView(n.key)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, textAlign: 'left',
            color: (view === n.key || (n.key === 'queue' && view === 'detail')) ? 'var(--ink)' : 'var(--ink-2)',
            background: (view === n.key || (n.key === 'queue' && view === 'detail')) ? 'var(--surface-2)' : 'transparent',
          }}>
            <span style={{ color: 'var(--ink-3)' }}>{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.count != null && (
              <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '1px 7px', background: 'var(--surface-3)', borderRadius: 999 }}>
                {n.count}
              </span>
            )}
          </button>
        ))}
      </Stack>

      <Stack gap={1} style={{ marginTop: 18 }}>
        <SectionLabel style={{ padding: '0 10px 6px' }}>Team</SectionLabel>
        {secondary.map(n => (
          <button key={n.key} onClick={() => setView(n.key)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8,
            fontSize: 13, fontWeight: 500, textAlign: 'left',
            color: view === n.key ? 'var(--ink)' : 'var(--ink-2)',
            background: view === n.key ? 'var(--surface-2)' : 'transparent',
          }}>
            <span style={{ color: 'var(--ink-3)' }}>{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
          </button>
        ))}
      </Stack>

      <div style={{ flex: 1 }} />

      {/* user chip */}
      <Row gap={10} style={{
        padding: '10px 10px', borderRadius: 10,
        border: '1px solid var(--hairline)', background: 'var(--surface-2)',
      }}>
        <Avatar name="Renee Acosta" size={28} tone="amber" />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Renee Acosta</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Property manager</span>
        </Stack>
        <span style={{ color: 'var(--ink-3)' }}>{I.chevD(14)}</span>
      </Row>
    </div>
  );
}

// ─── Top bar inside reviewer screens ─────────────────────────
function RTopBar({ title, subtitle, density, setDensity, actions, breadcrumb }) {
  return (
    <div style={{
      padding: '14px 28px', borderBottom: '1px solid var(--hairline)',
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      minHeight: 64,
    }}>
      <Stack gap={2} style={{ minWidth: 0 }}>
        {breadcrumb && (
          <Row gap={6} style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {breadcrumb}
          </Row>
        )}
        <Row gap={10}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{title}</span>
          {subtitle}
        </Row>
      </Stack>
      <Row gap={8}>
        {setDensity && (
          <Row gap={2} style={{
            padding: 2, background: 'var(--surface-2)', borderRadius: 8,
            border: '1px solid var(--hairline)',
          }}>
            {['comfortable', 'compact'].map(d => (
              <button key={d} onClick={() => setDensity(d)} style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 12,
                fontWeight: 500, textTransform: 'capitalize',
                color: density === d ? 'var(--ink)' : 'var(--ink-3)',
                background: density === d ? 'var(--surface)' : 'transparent',
                boxShadow: density === d ? 'var(--sh-1)' : 'none',
              }}>{d}</button>
            ))}
          </Row>
        )}
        {actions}
      </Row>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// R-QUEUE — applications list
// ═════════════════════════════════════════════════════════════
function RQueue({ density, setDensity, setView, setActiveAppId }) {
  const [filter, setFilter] = useState('open'); // open | all | approved | denied | conditional
  const [search, setSearch] = useState('');
  const [property, setProperty] = useState('all');

  const filtered = useMemo(() => {
    return DEMO.queue.filter(a => {
      if (filter === 'open' && !(a.status === 'pending_decision' || a.status === 'incomplete')) return false;
      if (filter === 'approved' && a.status !== 'approved') return false;
      if (filter === 'conditional' && a.status !== 'conditional') return false;
      if (filter === 'denied' && a.status !== 'denied') return false;
      if (property !== 'all' && !a.property.startsWith(property)) return false;
      if (search && !a.applicant.toLowerCase().includes(search.toLowerCase()) && !a.property.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, property, search]);

  const counts = useMemo(() => ({
    open: DEMO.queue.filter(a => a.status === 'pending_decision' || a.status === 'incomplete').length,
    all: DEMO.queue.length,
    approved: DEMO.queue.filter(a => a.status === 'approved').length,
    conditional: DEMO.queue.filter(a => a.status === 'conditional').length,
    denied: DEMO.queue.filter(a => a.status === 'denied').length,
  }), []);

  const compact = density === 'compact';
  const rowH = compact ? 36 : 52;

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <RTopBar
        title="Applications"
        subtitle={<Pill tone="neutral" size="sm" icon={<span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />}>
          <span className="tnum">{counts.open}</span> awaiting decision
        </Pill>}
        density={density} setDensity={setDensity}
        actions={
          <Row gap={8}>
            <Btn variant="secondary" size="sm" leadingIcon={I.download(14)}>Export</Btn>
            <Btn variant="primary" size="sm" leadingIcon={I.plus(14)}>New property</Btn>
          </Row>
        }
      />

      {/* Filter bar */}
      <div style={{
        padding: '12px 28px', borderBottom: '1px solid var(--hairline)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          height: 32, padding: '0 10px',
          background: 'var(--surface-2)', borderRadius: 7,
          border: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', gap: 7,
          width: 240,
        }}>
          <span style={{ color: 'var(--ink-3)' }}>{I.search(14)}</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant or property"
            style={{ flex: 1, fontSize: 13, border: 0, outline: 0, background: 'transparent', minWidth: 0 }}
          />
          <kbd style={{
            fontSize: 11, padding: '1px 5px', borderRadius: 4,
            background: 'var(--surface-3)', color: 'var(--ink-3)',
            fontFamily: 'var(--font-mono)',
          }}>/</kbd>
        </div>

        {/* Status tabs */}
        <Row gap={1} style={{ padding: 2, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
          {[
            { k: 'open', l: 'Open', tone: null },
            { k: 'approved', l: 'Approved', tone: 'ok' },
            { k: 'conditional', l: 'Conditional', tone: 'warn' },
            { k: 'denied', l: 'Denied', tone: 'bad' },
            { k: 'all', l: 'All', tone: null },
          ].map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              fontWeight: 500,
              color: filter === t.k ? 'var(--ink)' : 'var(--ink-3)',
              background: filter === t.k ? 'var(--surface)' : 'transparent',
              boxShadow: filter === t.k ? 'var(--sh-1)' : 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {t.l}
              <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{counts[t.k]}</span>
            </button>
          ))}
        </Row>

        {/* Property select */}
        <select value={property} onChange={e => setProperty(e.target.value)} style={{
          height: 32, padding: '0 10px', borderRadius: 7,
          background: 'var(--surface-2)', border: '1px solid var(--hairline)',
          fontSize: 13, color: 'var(--ink)', minWidth: 160,
        }}>
          <option value="all">All properties</option>
          <option>The Larkin</option>
          <option>Sunset Row</option>
          <option>Marina House</option>
        </select>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Showing <span className="tnum">{filtered.length}</span> of <span className="tnum">{DEMO.queue.length}</span>
        </span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--paper)' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          fontSize: compact ? 12 : 13,
        }}>
          <thead>
            <tr style={{
              position: 'sticky', top: 0, background: 'var(--surface)',
              zIndex: 1, borderBottom: '1px solid var(--hairline)',
            }}>
              {[
                { l: 'Applicant', w: '24%' },
                { l: 'Property', w: '22%' },
                { l: 'Submitted', w: '11%', r: true },
                { l: 'Credit', w: '8%', r: true },
                { l: 'Income / Rent', w: '11%', r: true },
                { l: 'System rec.', w: '12%' },
                { l: 'Status', w: '12%' },
              ].map(h => (
                <th key={h.l} style={{
                  textAlign: h.r ? 'right' : 'left',
                  padding: compact ? '8px 14px' : '12px 14px',
                  width: h.w,
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>{h.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <QueueRow key={a.id} app={a} compact={compact} rowH={rowH}
                isFirst={i === 0}
                onClick={() => { setActiveAppId(a.id); setView('detail'); }} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  No applications match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

function QueueRow({ app, compact, rowH, onClick, isFirst }) {
  const [hov, setHov] = useState(false);
  const statusMap = {
    pending_decision: { tone: 'info', label: 'Awaiting decision' },
    approved: { tone: 'ok', label: 'Approved' },
    conditional: { tone: 'warn', label: 'Conditional' },
    denied: { tone: 'bad', label: 'Denied' },
    incomplete: { tone: 'neutral', label: 'Incomplete' },
  };
  const recMap = {
    approve: { tone: 'ok', label: 'Approve', icon: I.check(11) },
    conditional: { tone: 'warn', label: 'Conditional', icon: I.alert(11) },
    deny: { tone: 'bad', label: 'Deny', icon: I.x(11) },
    pending: { tone: 'neutral', label: '—', icon: null },
  };
  const isStrong = app.recommendation === 'approve' && app.credit >= 700;
  return (
    <tr onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      height: rowH,
      background: hov ? 'var(--surface-2)' : 'var(--surface)',
      borderBottom: '1px solid var(--hairline-soft)',
      cursor: 'pointer',
      transition: 'background 80ms',
    }}>
      <td style={{ padding: compact ? '0 14px' : '8px 14px' }}>
        <Row gap={10}>
          <Avatar name={app.applicant} size={compact ? 22 : 28} tone={isStrong ? 'teal' : 'navy'} />
          <Stack gap={0}>
            <Row gap={6}>
              <span style={{ fontWeight: 500 }}>{app.applicant}</span>
              {app.coapplicants > 0 && (
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{app.coapplicants}</span>
              )}
              {app.voucher && (
                <Pill tone="primary" size="xs">Voucher</Pill>
              )}
            </Row>
            {!compact && <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{app.id}</span>}
          </Stack>
        </Row>
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px', color: 'var(--ink-2)' }}>
        {app.property}
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px', textAlign: 'right', color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
        {app.submitted}
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {app.credit > 0 ? (
          <span style={{
            color: app.credit >= 700 ? 'var(--ok)' : app.credit >= 640 ? 'var(--warn)' : 'var(--bad)',
            fontWeight: 500,
          }}>{app.credit}</span>
        ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {app.income_x > 0 ? (
          <span style={{
            color: app.income_x >= 3 ? 'var(--ok)' : app.income_x >= 2.5 ? 'var(--warn)' : 'var(--bad)',
            fontWeight: 500,
          }}>{app.income_x}×</span>
        ) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px' }}>
        <Pill tone={recMap[app.recommendation].tone} size={compact ? 'xs' : 'sm'} icon={recMap[app.recommendation].icon}>
          {recMap[app.recommendation].label}
        </Pill>
      </td>
      <td style={{ padding: compact ? '0 14px' : '8px 14px' }}>
        <Pill tone={statusMap[app.status].tone} size={compact ? 'xs' : 'sm'}>
          {statusMap[app.status].label}
        </Pill>
      </td>
    </tr>
  );
}

// ═════════════════════════════════════════════════════════════
// R-DETAIL — THE application detail page
// Recommendation top, all data scrolled below, decision in one click.
// ═════════════════════════════════════════════════════════════
function RDetail({ density, setDensity, setView, decisionOverride }) {
  const app = DEMO.application;
  const [decided, setDecided] = useState(null);
  const compact = density === 'compact';

  // Allow tweak to switch the recommendation context
  const rec = decisionOverride || app.recommendation;

  const recCfg = {
    approve: {
      tone: 'ok',
      title: 'Recommend approve',
      sub: 'All thresholds met. No flags.',
      icon: I.check(20),
    },
    conditional: {
      tone: 'warn',
      title: 'Recommend conditional approval',
      sub: 'Combined income strong; co-applicant credit below threshold.',
      icon: I.alert(20),
    },
    deny: {
      tone: 'bad',
      title: 'Recommend deny',
      sub: 'Credit and income below policy. See reasons.',
      icon: I.x(20),
    },
  }[rec];

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <RTopBar
        breadcrumb={
          <>
            <button onClick={() => setView('queue')} style={{ color: 'var(--ink-3)' }}>Applications</button>
            <span>{I.chevR(11)}</span>
            <span>{app.id}</span>
          </>
        }
        title={app.applicants[0].name + ' + ' + (app.applicants.length - 1)}
        subtitle={
          <Row gap={6}>
            <Pill tone="info" size="sm" icon={I.clock(11)}>Awaiting decision</Pill>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Submitted {app.submitted_relative}</span>
          </Row>
        }
        density={density} setDensity={setDensity}
        actions={
          <Row gap={6}>
            <HoverNote note="Previous application"><Btn variant="ghost" size="sm" style={{ padding: '0 10px' }}>{I.arrowL(15)}</Btn></HoverNote>
            <HoverNote note="Next application"><Btn variant="ghost" size="sm" style={{ padding: '0 10px' }}>{I.arrowR(15)}</Btn></HoverNote>
            <Btn variant="ghost" size="sm" leadingIcon={I.download(14)}>PDF</Btn>
            <Btn variant="ghost" size="sm" style={{ padding: '0 10px' }}>{I.more(15)}</Btn>
          </Row>
        }
      />

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--paper)' }}>
        {/* TOP 200px — recommendation + decision buttons + key flags */}
        <div style={{
          padding: '20px 28px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--hairline)',
        }}>
          <Row gap={20} align="flex-start">
            {/* Recommendation card */}
            <div style={{
              flex: 1,
              padding: '16px 18px',
              borderRadius: 12,
              background: `var(--${recCfg.tone}-tint)`,
              border: `1px solid ${recCfg.tone === 'ok' ? 'rgba(15,118,110,0.18)' : recCfg.tone === 'warn' ? 'rgba(167,99,16,0.22)' : 'rgba(155,56,56,0.20)'}`,
            }}>
              <Row gap={14} align="flex-start">
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `var(--${recCfg.tone})`, color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{recCfg.icon}</div>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Row gap={8}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: `var(--${recCfg.tone})`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      System recommendation
                    </span>
                  </Row>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{recCfg.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{recCfg.sub}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                    Based on property policy · <a>Why this recommendation</a>
                  </div>
                </Stack>
              </Row>
            </div>

            {/* Decision actions */}
            <Stack gap={6}>
              <SectionLabel style={{ marginBottom: 2 }}>Make a decision</SectionLabel>
              {decided ? (
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: `var(--${decided.tone}-tint)`,
                  border: `1px solid ${decided.tone === 'ok' ? 'rgba(15,118,110,0.20)' : 'rgba(167,99,16,0.22)'}`,
                  fontSize: 13, color: 'var(--ink)',
                  display: 'flex', alignItems: 'center', gap: 10, minWidth: 240,
                }}>
                  <span style={{ color: `var(--${decided.tone})` }}>{I.check(16)}</span>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <span style={{ fontWeight: 500 }}>Decision sent</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Email to applicant queued</span>
                  </Stack>
                  <button onClick={() => setDecided(null)} style={{ color: 'var(--ink-3)', fontSize: 12 }}>Undo</button>
                </div>
              ) : (
                <Stack gap={6}>
                  <Btn variant="ok" size="md" leadingIcon={I.check(14)} onClick={() => setDecided({ tone: 'ok', label: 'Approved' })}>
                    Approve
                  </Btn>
                  <Row gap={6}>
                    <Btn variant="secondary" size="md" style={{ flex: 1 }} onClick={() => setDecided({ tone: 'warn', label: 'Conditional' })}>
                      Conditional…
                    </Btn>
                    <Btn variant="danger" size="md" style={{ flex: 1 }} onClick={() => setDecided({ tone: 'bad', label: 'Denied' })}>
                      Deny…
                    </Btn>
                  </Row>
                  <button style={{
                    fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: 4,
                  }}>Request more info</button>
                </Stack>
              )}
            </Stack>
          </Row>

          {/* Flags strip */}
          <Row gap={8} style={{ marginTop: 14, flexWrap: 'wrap' }}>
            {app.flags.map((f, i) => (
              <Pill key={i} tone={f.tone} size="sm"
                icon={f.tone === 'ok' ? I.check(11) : I.alert(11)}>
                {f.label}
              </Pill>
            ))}
          </Row>
        </div>

        {/* Combined income calculation */}
        <div style={{ padding: '20px 28px' }}>
          <Stack gap={14}>
            <SectionLabel>Combined income vs rent</SectionLabel>
            <Card pad={20}>
              <Row gap={32} align="center">
                <Stack gap={4}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Combined monthly income</span>
                  <span className="tnum" style={{ fontSize: 24, fontWeight: 600 }}>$12,600</span>
                </Stack>
                <span className="tnum" style={{ fontSize: 18, color: 'var(--ink-3)' }}>÷</span>
                <Stack gap={4}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Monthly rent</span>
                  <span className="tnum" style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink-2)' }}>$3,250</span>
                </Stack>
                <span className="tnum" style={{ fontSize: 18, color: 'var(--ink-3)' }}>=</span>
                <Stack gap={4}>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Income ratio</span>
                  <Row gap={8}>
                    <span className="tnum" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ok)' }}>3.88×</span>
                    <Pill tone="ok" size="xs" icon={I.check(10)}>≥ 3.0× policy</Pill>
                  </Row>
                </Stack>
                <div style={{ flex: 1 }} />
                <Btn variant="ghost" size="sm">Adjust policy</Btn>
              </Row>
              {/* Stacked breakdown */}
              <div style={{ marginTop: 16, display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
                <div style={{ width: '65.1%', background: 'var(--primary)' }} />
                <div style={{ width: '34.9%', background: 'var(--ok)' }} />
              </div>
              <Row gap={20} style={{ marginTop: 8, fontSize: 12 }}>
                <Row gap={6}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--primary)' }} />
                  <span style={{ color: 'var(--ink-2)' }}>Maya · <span className="tnum">$8,200</span> verified</span>
                </Row>
                <Row gap={6}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--ok)' }} />
                  <span style={{ color: 'var(--ink-2)' }}>Jordan · <span className="tnum">$4,400</span> verified</span>
                </Row>
              </Row>
            </Card>
          </Stack>

          {/* Per-applicant cards */}
          <Stack gap={14} style={{ marginTop: 28 }}>
            <SectionLabel>Applicants</SectionLabel>
            {app.applicants.map((p, i) => <ApplicantCard key={i} p={p} compact={compact} />)}
          </Stack>

          {/* References */}
          <Stack gap={14} style={{ marginTop: 28 }}>
            <Row justify="space-between">
              <SectionLabel>References</SectionLabel>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>2 of 3 received</span>
            </Row>
            <Stack gap={8}>
              {app.references.map((r, i) => <RefRow key={i} r={r} />)}
            </Stack>
          </Stack>

          {/* Documents */}
          <Stack gap={14} style={{ marginTop: 28 }}>
            <Row justify="space-between">
              <SectionLabel>Documents</SectionLabel>
              <Btn variant="ghost" size="sm">Download all</Btn>
            </Row>
            <Stack gap={6}>
              {app.documents.map((d, i) => (
                <Row key={i} gap={12} style={{
                  padding: '10px 14px', background: 'var(--surface)',
                  border: '1px solid var(--hairline)', borderRadius: 8,
                }}>
                  <span style={{ color: d.flag ? 'var(--warn)' : 'var(--ink-3)' }}>
                    {d.flag ? I.alert(15) : I.doc(15)}
                  </span>
                  <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                    <Row gap={8}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>· {d.for}</span>
                    </Row>
                    {d.flag && <span style={{ fontSize: 11, color: 'var(--warn)' }}>{d.flag}</span>}
                  </Stack>
                  <span className="tnum" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{d.size}</span>
                  <button style={{ color: 'var(--ink-3)', padding: 4 }}>{I.external(14)}</button>
                </Row>
              ))}
            </Stack>
          </Stack>
          <div style={{ height: 40 }} />
        </div>
      </div>
    </Stack>
  );
}

function ApplicantCard({ p, compact }) {
  return (
    <Card pad={20}>
      <Stack gap={16}>
        <Row gap={14} align="center">
          <Avatar name={p.name} size={40} tone={p.role === 'Primary' ? 'navy' : 'teal'} />
          <Stack gap={2}>
            <Row gap={8}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              <Pill tone="neutral" size="xs">{p.role}</Pill>
              {p.id_verified && <Pill tone="ok" size="xs" icon={I.shield(10)}>ID verified</Pill>}
            </Row>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Age {p.age} · {p.prior_residences} prior addresses</span>
          </Stack>
        </Row>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0, border: '1px solid var(--hairline)', borderRadius: 10,
          overflow: 'hidden',
        }}>
          <DataCell label="Credit score"
            value={<span style={{ color: p.credit >= 700 ? 'var(--ok)' : p.credit >= 640 ? 'var(--warn)' : 'var(--bad)', fontWeight: 600 }}>{p.credit}</span>}
            sub={p.credit_band}
          />
          <DataCell label="Verified income"
            value={<span className="tnum">${p.income_monthly.toLocaleString()}/mo</span>}
            sub={p.income_source}
            checked={p.income_verified}
          />
          <DataCell label="Employer"
            value={p.employer}
            sub={p.employer_verified ? 'Verified by reference' : 'Self-reported'}
            warned={!p.employer_verified}
          />
          <DataCell label="Criminal · Eviction"
            value={
              <Row gap={6}>
                <Pill tone="ok" size="xs" icon={I.check(10)}>0 crim</Pill>
                <Pill tone={p.eviction.count > 0 ? 'warn' : 'ok'} size="xs"
                  icon={p.eviction.count > 0 ? I.alert(10) : I.check(10)}>
                  {p.eviction.count} evic
                </Pill>
              </Row>
            }
            sub={p.eviction.flags[0] || 'No filings'}
            isLast
          />
        </div>
      </Stack>
    </Card>
  );
}

function DataCell({ label, value, sub, isLast, checked, warned }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRight: isLast ? 0 : '1px solid var(--hairline)',
    }}>
      <Stack gap={4}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.03em' }}>{label}</span>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{value}</div>
        <span style={{ fontSize: 11, color: warned ? 'var(--warn)' : 'var(--ink-3)', lineHeight: 1.4 }}>
          {checked && <span style={{ color: 'var(--ok)', marginRight: 4 }}>✓</span>}
          {sub}
        </span>
      </Stack>
    </div>
  );
}

function RefRow({ r }) {
  const tones = {
    positive: { tone: 'ok', label: 'Positive', icon: I.check(11) },
    neutral: { tone: 'info', label: 'Neutral', icon: I.info(11) },
    negative: { tone: 'bad', label: 'Negative', icon: I.alert(11) },
  };
  if (r.status === 'pending') {
    return (
      <Card pad={14}>
        <Row gap={14}>
          <div style={{
            width: 36, height: 36, borderRadius: 18, background: 'var(--surface-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)',
          }}>{I.clock(15)}</div>
          <Stack gap={2} style={{ flex: 1 }}>
            <Row gap={8}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
              <Pill tone="info" size="xs">Pending</Pill>
            </Row>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.role}</span>
          </Stack>
          <Btn variant="ghost" size="sm">Resend request</Btn>
        </Row>
      </Card>
    );
  }
  const t = tones[r.rating];
  return (
    <Card pad={14}>
      <Stack gap={10}>
        <Row gap={14} align="flex-start">
          <Avatar name={r.name} size={36} tone="slate" />
          <Stack gap={2} style={{ flex: 1 }}>
            <Row gap={8}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</span>
              <Pill tone={t.tone} size="xs" icon={t.icon}>{t.label}</Pill>
            </Row>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.role} · responded in {r.response_time}</span>
          </Stack>
        </Row>
        <div style={{
          padding: '10px 14px',
          background: 'var(--surface-2)',
          borderRadius: 8,
          fontSize: 13, color: 'var(--ink-2)', fontStyle: 'italic',
          lineHeight: 1.55,
        }}>"{r.note}"</div>
      </Stack>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
// R-PROPERTY — property setup with jurisdiction warning
// ═════════════════════════════════════════════════════════════
function RProperty({ density, setDensity, setView }) {
  const [rent, setRent] = useState(3250);
  const [deposit, setDeposit] = useState(3250);
  const [fee, setFee] = useState(75);
  const [minCredit, setMinCredit] = useState(650);
  const [incomeMult, setIncomeMult] = useState(3.0);

  const feeCap = 62.02; // CA cap
  const feeWarning = fee > feeCap;

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <RTopBar
        breadcrumb={
          <>
            <button onClick={() => setView('properties')} style={{ color: 'var(--ink-3)' }}>Properties</button>
            <span>{I.chevR(11)}</span>
            <span>The Larkin · 3B</span>
          </>
        }
        title="Property settings"
        subtitle={<Pill tone="ok" size="sm">Listed · accepting applications</Pill>}
        density={density} setDensity={setDensity}
        actions={
          <Row gap={8}>
            <Btn variant="ghost" size="sm">View public page</Btn>
            <Btn variant="primary" size="sm">Save changes</Btn>
          </Row>
        }
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Basic info */}
          <Stack gap={14}>
            <SectionLabel>Address & unit</SectionLabel>
            <Card pad={20}>
              <Stack gap={14}>
                <Row gap={14}>
                  <div style={{ flex: 2 }}>
                    <Field label="Street address">
                      <Input value="247 Larkin Street" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Unit">
                      <Input value="3B" />
                    </Field>
                  </div>
                </Row>
                <Row gap={14}>
                  <div style={{ flex: 2 }}>
                    <Field label="City">
                      <Input value="San Francisco" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="State">
                      <Input value="CA" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="ZIP">
                      <Input value="94102" />
                    </Field>
                  </div>
                </Row>
              </Stack>
            </Card>
          </Stack>

          {/* Pricing */}
          <Stack gap={14}>
            <SectionLabel>Pricing</SectionLabel>
            <Card pad={20}>
              <Stack gap={14}>
                <Row gap={14}>
                  <div style={{ flex: 1 }}>
                    <Field label="Monthly rent">
                      <Input value={rent} prefix="$" onChange={e => setRent(+e.target.value)} className="tnum" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Security deposit">
                      <Input value={deposit} prefix="$" onChange={e => setDeposit(+e.target.value)} />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field
                      label="Application fee"
                      error={feeWarning ? null : null}
                    >
                      <Input value={fee} prefix="$" onChange={e => setFee(+e.target.value)} />
                    </Field>
                  </div>
                </Row>

                {/* Jurisdiction warning — educates, doesn't just block */}
                {feeWarning && (
                  <div style={{
                    padding: 16, borderRadius: 10,
                    background: 'var(--warn-tint)',
                    border: '1px solid rgba(167,99,16,0.25)',
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }}>{I.alert(18)}</span>
                    <Stack gap={6} style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                        California caps application fees at <span className="tnum">${feeCap}</span>.
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                        Your <span className="tnum">${fee}</span> fee may violate California Civil Code §1950.6.
                        The cap adjusts for inflation each year — the <span className="tnum">${feeCap}</span> figure is the 2026 limit.
                        You can charge less, but charging more exposes you to penalties up to <span className="tnum">$100</span> per applicant
                        plus actual damages.
                      </span>
                      <Row gap={10} style={{ marginTop: 4 }}>
                        <button onClick={() => setFee(feeCap)} style={{
                          padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          background: 'var(--surface)', border: '1px solid rgba(167,99,16,0.3)',
                          color: 'var(--warn)',
                        }}>Set to <span className="tnum">${feeCap}</span></button>
                        <button style={{ fontSize: 12, color: 'var(--warn)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                          Read the statute
                        </button>
                      </Row>
                    </Stack>
                  </div>
                )}
              </Stack>
            </Card>
          </Stack>

          {/* Screening criteria */}
          <Stack gap={14}>
            <SectionLabel>Screening criteria</SectionLabel>
            <Card pad={0}>
              <Stack gap={0}>
                <CriterionRow
                  label="Minimum credit score"
                  desc="Applicants below this score will be flagged but not auto-rejected."
                  value={minCredit}
                  setValue={setMinCredit}
                  min={500} max={800} step={10}
                />
                <Rule />
                <CriterionRow
                  label="Income-to-rent multiplier"
                  desc="Combined applicant income must equal this multiple of monthly rent."
                  value={incomeMult}
                  setValue={setIncomeMult}
                  min={1.5} max={5} step={0.1}
                  format={v => v.toFixed(1) + '×'}
                />
                <Rule />
                <Row gap={20} style={{ padding: '18px 20px' }}>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Accept Section 8 vouchers</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Required by California law for properties in San Francisco.</span>
                  </Stack>
                  <Toggle value={true} disabled />
                </Row>
                <Rule />
                <Row gap={20} style={{ padding: '18px 20px' }}>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Offer conditional approval (double deposit)</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>When applicants fall short, propose a higher deposit instead of denying.</span>
                  </Stack>
                  <Toggle value={true} />
                </Row>
              </Stack>
            </Card>
          </Stack>
        </div>
      </div>
    </Stack>
  );
}

function CriterionRow({ label, desc, value, setValue, min, max, step, format = String }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <Row gap={20} style={{ padding: '18px 20px' }}>
      <Stack gap={2} style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{desc}</span>
      </Stack>
      <Stack gap={6} style={{ width: 220 }}>
        <Row gap={8} justify="flex-end">
          <span className="tnum" style={{ fontSize: 18, fontWeight: 500 }}>{format(value)}</span>
        </Row>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => setValue(+e.target.value)}
          style={{
            width: '100%',
            accentColor: 'var(--primary)',
          }}
        />
      </Stack>
    </Row>
  );
}

function Toggle({ value, onChange, disabled }) {
  const [v, setV] = useState(value);
  const toggle = () => { if (disabled) return; const nv = !v; setV(nv); onChange && onChange(nv); };
  return (
    <button onClick={toggle} disabled={disabled} style={{
      width: 38, height: 22, borderRadius: 11,
      background: v ? 'var(--primary)' : 'var(--surface-3)',
      position: 'relative', transition: 'background 160ms',
      opacity: disabled ? 0.7 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: v ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        transition: 'left 160ms',
      }} />
    </button>
  );
}

Object.assign(window, {
  RShell, RQueue, RDetail, RProperty,
});
