// Janus — shared UI components
// Calm, restrained, fintech-clarity. Geist + tabular nums.
// All components consume CSS variables from tokens.css so primary color
// can be swapped at runtime via Tweaks.

const { useState, useRef, useEffect, useMemo, useCallback, Fragment } = React;

// ─── Icons ──────────────────────────────────────────────────
// Line icons only, consistent 1.6 stroke. Drawn inline so they pick up currentColor.
const I = {
  check: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  arrowR: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  arrowL: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  lock: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 10.5V7a4 4 0 018 0v3.5" stroke="currentColor" strokeWidth="1.6"/></svg>,
  shield: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  info: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  alert: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  user: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  users: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 19c1-3 3-4.5 6-4.5s5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M15 7a3 3 0 010 5M17 19c.5-2 1.5-3 3-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  mail: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5.5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3.5 7l8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.6"/></svg>,
  doc: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 3h8l5 5v13H6V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  upload: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 16V4M6 10l6-6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  bank: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 10h18L12 4 3 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  card: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6"/></svg>,
  home: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  search: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6"/><path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  filter: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  more: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>,
  download: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4v12M6 10l6 6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  refresh: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M20 11a8 8 0 10-2 6.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M20 5v6h-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  keyboard: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  star: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 4l2.5 5 5.5.8-4 4 1 5.5L12 17l-5 2.3 1-5.5-4-4 5.5-.8L12 4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  clock: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  plus: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  minus: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  copy: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="8" y="4" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M16 18v2a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1h2" stroke="currentColor" strokeWidth="1.6"/></svg>,
  external: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  flag: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 21V4h14l-3 5 3 5H5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
  building: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01M10 21v-3h4v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  settings: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.8a7 7 0 00-2.1-1.2L14 3h-4l-.4 2.4A7 7 0 007.5 6.6L5.1 5.8l-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.8a7 7 0 002.1 1.2L10 21h4l.4-2.4a7 7 0 002.1-1.2l2.4.8 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  paw: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><ellipse cx="7" cy="9" rx="1.6" ry="2.2" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="17" cy="9" rx="1.6" ry="2.2" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="10" cy="5.5" rx="1.4" ry="2" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="14" cy="5.5" rx="1.4" ry="2" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12c-3 0-5 2.5-5 5 0 1.5 1 2.5 2.5 2.5.8 0 1.5-.5 2.5-.5s1.7.5 2.5.5c1.5 0 2.5-1 2.5-2.5 0-2.5-2-5-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  car: (s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M4 16v-3l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5v3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><rect x="3" y="13" width="18" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><circle cx="7.5" cy="18" r="1.3" fill="currentColor"/><circle cx="16.5" cy="18" r="1.3" fill="currentColor"/></svg>,
};

// ─── Status Pill ─────────────────────────────────────────────
// Tone-driven so colorblind users see hue + label + shape.
function Pill({ tone = 'info', icon, children, size = 'sm' }) {
  const tones = {
    ok:    { bg: 'var(--ok-tint)',   fg: 'var(--ok)',   bd: 'rgba(15,118,110,0.20)' },
    warn:  { bg: 'var(--warn-tint)', fg: 'var(--warn)', bd: 'rgba(167,99,16,0.25)' },
    bad:   { bg: 'var(--bad-tint)',  fg: 'var(--bad)',  bd: 'rgba(155,56,56,0.22)' },
    info:  { bg: 'var(--info-tint)', fg: 'var(--info)', bd: 'rgba(61,77,107,0.18)' },
    neutral: { bg: 'var(--surface-2)', fg: 'var(--ink-2)', bd: 'var(--hairline)' },
    primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)', bd: 'rgba(30,58,95,0.18)' },
  };
  const t = tones[tone] || tones.info;
  const sizes = {
    xs: { pad: '2px 7px', fs: 11, gap: 4, h: 18 },
    sm: { pad: '3px 9px', fs: 12, gap: 5, h: 22 },
    md: { pad: '5px 11px', fs: 13, gap: 6, h: 26 },
  };
  const s = sizes[size];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: s.gap,
      padding: s.pad, height: s.h,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`, borderRadius: 999,
      fontSize: s.fs, fontWeight: 500, letterSpacing: '-0.005em',
      lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </span>
  );
}

// ─── Button ──────────────────────────────────────────────────
function Btn({
  variant = 'primary', size = 'md', children, leadingIcon, trailingIcon,
  full, disabled, onClick, type = 'button', style = {}, ...rest
}) {
  const sizes = {
    sm: { pad: '0 12px', h: 32, fs: 13, gap: 6 },
    md: { pad: '0 16px', h: 40, fs: 14, gap: 8 },
    lg: { pad: '0 20px', h: 48, fs: 15, gap: 10 },
    xl: { pad: '0 24px', h: 56, fs: 16, gap: 10 },
  };
  const s = sizes[size];
  const variants = {
    primary: {
      bg: 'var(--primary)', fg: 'var(--on-primary)', bd: 'transparent',
      hover: 'var(--primary-hover)',
      shadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 2px rgba(20,23,31,0.18)',
    },
    secondary: {
      bg: 'var(--surface)', fg: 'var(--ink)', bd: 'var(--hairline-strong)',
      hover: 'var(--surface-2)',
      shadow: '0 1px 1px rgba(20,23,31,0.04)',
    },
    ghost: {
      bg: 'transparent', fg: 'var(--ink-2)', bd: 'transparent',
      hover: 'var(--surface-2)',
      shadow: 'none',
    },
    soft: {
      bg: 'var(--primary-soft)', fg: 'var(--primary)', bd: 'transparent',
      hover: 'var(--primary-soft-2)', shadow: 'none',
    },
    danger: {
      bg: 'var(--surface)', fg: 'var(--bad)', bd: 'rgba(155,56,56,0.30)',
      hover: 'var(--bad-tint)', shadow: '0 1px 1px rgba(20,23,31,0.04)',
    },
    ok: {
      bg: 'var(--ok)', fg: '#fff', bd: 'transparent',
      hover: '#0c5c56', shadow: '0 1px 0 rgba(255,255,255,0.15) inset',
    },
  };
  const v = variants[variant] || variants.primary;
  const [hov, setHov] = useState(false);
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, padding: s.pad, height: s.h,
        background: disabled ? 'var(--surface-2)' : (hov ? v.hover : v.bg),
        color: disabled ? 'var(--ink-4)' : v.fg,
        border: `1px solid ${v.bd}`,
        borderRadius: 8, fontSize: s.fs, fontWeight: 500,
        letterSpacing: '-0.005em',
        boxShadow: v.shadow,
        transition: 'background 120ms, color 120ms, transform 80ms',
        width: full ? '100%' : undefined,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: hov && !disabled ? 'translateY(-0.5px)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </button>
  );
}

// ─── Form Field ──────────────────────────────────────────────
function Field({ label, hint, error, optional, children, action }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
            {label}
            {optional && <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 6 }}>optional</span>}
          </span>
          {action}
        </div>
      )}
      {children}
      {(hint || error) && (
        <span style={{ fontSize: 12, color: error ? 'var(--bad)' : 'var(--ink-3)', lineHeight: 1.4 }}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

function Input({ leadingIcon, trailingIcon, prefix, suffix, style = {}, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 12px', height: 44,
      background: 'var(--surface)',
      border: `1px solid ${focus ? 'var(--primary)' : 'var(--hairline-strong)'}`,
      borderRadius: 10,
      boxShadow: focus ? '0 0 0 3px var(--primary-soft)' : 'none',
      transition: 'border-color 120ms, box-shadow 120ms',
    }}>
      {leadingIcon && <span style={{ color: 'var(--ink-3)', display: 'inline-flex' }}>{leadingIcon}</span>}
      {prefix && <span style={{ color: 'var(--ink-3)', fontSize: 15 }}>{prefix}</span>}
      <input
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, border: 0, outline: 0, background: 'transparent',
          height: '100%', fontSize: 15, color: 'var(--ink)',
          minWidth: 0,
          ...style,
        }}
        {...rest}
      />
      {suffix && <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{suffix}</span>}
      {trailingIcon && <span style={{ color: 'var(--ink-3)', display: 'inline-flex' }}>{trailingIcon}</span>}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────
function Card({ children, pad = 20, style = {}, hover, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        borderRadius: 14,
        padding: pad,
        boxShadow: hov && hover ? 'var(--sh-2)' : 'var(--sh-1)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'box-shadow 160ms, transform 160ms, border-color 160ms',
        transform: hov && hover ? 'translateY(-1px)' : 'none',
        borderColor: hov && hover ? 'var(--hairline-strong)' : 'var(--hairline)',
        ...style,
      }}>
      {children}
    </div>
  );
}

// ─── Rule / Section header ───────────────────────────────────
function Rule({ style = {} }) {
  return <div style={{ height: 1, background: 'var(--hairline)', ...style }} />;
}

function SectionLabel({ children, action, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      ...style,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--ink-3)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>{children}</div>
      {action}
    </div>
  );
}

// ─── Progress Stepper ────────────────────────────────────────
function Progress({ value, total, label }) {
  const pct = Math.max(0, Math.min(1, value / total));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)' }}>
        <span>{label || `Step ${value} of ${total}`}</span>
        <span className="tnum">{Math.round(pct * 100)}%</span>
      </div>
      <div style={{
        height: 4, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%',
          background: 'var(--primary)', borderRadius: 999,
          transition: 'width 360ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

// ─── Avatar (initials) ───────────────────────────────────────
function Avatar({ name, size = 32, tone = 'navy' }) {
  const initials = name
    ? name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase()
    : '?';
  const tones = {
    navy: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
    teal: { bg: 'var(--ok-tint)', fg: 'var(--ok)' },
    amber: { bg: 'var(--warn-tint)', fg: 'var(--warn)' },
    brick: { bg: 'var(--bad-tint)', fg: 'var(--bad)' },
    slate: { bg: 'var(--info-tint)', fg: 'var(--info)' },
  };
  const t = tones[tone] || tones.navy;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: t.bg, color: t.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, letterSpacing: '-0.01em',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─── Layout helpers ──────────────────────────────────────────
function Stack({ gap = 12, children, style = {}, ...rest }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }} {...rest}>{children}</div>;
}
function Row({ gap = 12, align = 'center', justify, children, style = {}, ...rest }) {
  return <div style={{ display: 'flex', alignItems: align, justifyContent: justify, gap, ...style }} {...rest}>{children}</div>;
}

// ─── Tooltip (lightweight) ───────────────────────────────────
function HoverNote({ children, note }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--paper)', fontSize: 12,
          padding: '6px 10px', borderRadius: 6, whiteSpace: 'nowrap',
          zIndex: 100, pointerEvents: 'none',
        }}>{note}</span>
      )}
    </span>
  );
}

// ─── Money / format helpers ──────────────────────────────────
const fmt = {
  money: (n, opts = {}) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 }),
  short: (n) => n >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + n,
  date: (d) => d,
};

// Export to window
Object.assign(window, {
  I, Pill, Btn, Field, Input, Card, Rule, SectionLabel, Progress, Avatar,
  Stack, Row, HoverNote, fmt,
});
