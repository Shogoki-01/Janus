// /apply/[slug] — applicant flow Step 0 (Landing).
//
// First screen the applicant sees. Shows property, two-line-item fee
// breakdown ($30 platform + ~$40 TransUnion), what to expect, trust strip,
// primary CTA. The Section 8 question lives on /apply/[slug]/section8 (next
// build).
//
// Data: fixtures for now (lib/data/fixtures.ts). Swap to Prisma findUnique
// once Supabase is provisioned.

import { notFound } from "next/navigation";
import {
  getApplicationConfig,
  getPropertyBySlug,
  SMARTMOVE_FEE_DOLLARS,
} from "@/lib/data/fixtures";
import { formatUSD, formatDollars } from "@/lib/format";

export default async function ApplyStart({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();
  const config = await getApplicationConfig();

  const totalEstimateDollars = config.platformFeeCents / 100 + SMARTMOVE_FEE_DOLLARS;
  const moveIn = new Date(property.moveInDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar — minimal applicant chrome. No back at Step 0. */}
      <header
        className="flex items-center justify-between px-5 py-3 sm:px-6"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-2">
          <JanusMark />
          <span className="text-[14px] font-semibold tracking-tight">Janus</span>
        </div>
        <span className="tnum text-[12px]" style={{ color: "var(--ink-3)" }}>
          1 / 8
        </span>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1">
        {/* Hero — confident, calm. Subtle gradient placeholder for a real photo. */}
        <div
          className="relative h-[220px] overflow-hidden sm:h-[260px]"
          style={{
            background:
              "linear-gradient(135deg, #d4cab4 0%, #c5b596 40%, #a8946f 100%)",
          }}
        >
          <BuildingSilhouette />
          {property.acceptingApplications && (
            <div
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md sm:left-4 sm:top-4"
              style={{ background: "rgba(255,255,255,0.85)", color: "var(--ink)" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--ok)" }}
              />
              Currently accepting applications
            </div>
          )}
        </div>

        <div className="px-5 pb-28 pt-6 sm:px-6 sm:pb-20">
          {/* Property header */}
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              {property.name} · {property.addressLine2}
            </p>
            <h1
              className="mt-1 text-[22px] font-semibold leading-[1.2] tracking-tight sm:text-[26px]"
              style={{ color: "var(--ink)" }}
            >
              {property.addressLine1}, {property.city}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>
              <span className="tnum">{property.bedrooms}</span> bed ·{" "}
              <span className="tnum">{property.bathrooms}</span> bath ·{" "}
              <span className="tnum">{property.squareFeet.toLocaleString()}</span>{" "}
              sq ft · Move-in {moveIn}
            </p>
          </div>

          {/* Key facts grid — quiet, factual */}
          <div
            className="mt-6 grid grid-cols-2 overflow-hidden rounded-[14px]"
            style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
          >
            <Fact
              label="Monthly rent"
              value={<span className="tnum">{formatUSD(property.rentCents, { decimals: 0 })}</span>}
              borderRight
              borderBottom
            />
            <Fact
              label="Security deposit"
              value={<span className="tnum">{formatUSD(property.depositCents, { decimals: 0 })}</span>}
              borderBottom
            />
            <Fact
              label="Janus platform fee"
              value={<span className="tnum">{formatUSD(config.platformFeeCents, { decimals: 0 })}</span>}
              borderRight
            />
            <Fact label="Listed" value={property.listedRelative} />
          </div>

          {/* What to expect */}
          <section className="mt-7">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              What to expect
            </p>
            <ul className="mt-3 space-y-3">
              <Expect
                icon={<IconUser />}
                title="Personal info, address history, employer"
                detail="~3 minutes"
              />
              <Expect
                icon={<IconBank />}
                title="Income verification"
                detail="Upload 3 bank statements and your last 2 paystubs"
              />
              <Expect
                icon={<IconShield />}
                title="Government ID + selfie"
                detail="Verified by Stripe Identity — about 1 minute"
              />
              <Expect
                icon={<IconCard />}
                title={<><span className="tnum">{formatDollars(config.platformFeeCents / 100, { decimals: 0 })}</span> Janus platform fee</>}
                detail="Plus ~$40 paid directly to TransUnion for the screening report"
              />
            </ul>
          </section>

          {/* Fee breakdown — non-negotiable per build-spec */}
          <section
            className="mt-7 rounded-[12px] p-4 sm:p-5"
            style={{ background: "var(--surface-2)" }}
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--ink-3)" }}
            >
              Total estimated cost
            </p>
            <div
              className="mt-3 divide-y text-sm"
              style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}
            >
              <FeeRow
                label="Janus platform fee"
                sub="Paid in this app via Stripe"
                amount={formatUSD(config.platformFeeCents)}
              />
              <FeeRow
                label="TransUnion screening report"
                sub="Paid separately to TransUnion · we never mark this up"
                amount={`~${formatDollars(SMARTMOVE_FEE_DOLLARS)}`}
              />
              <FeeRow
                label="Estimated total"
                amount={`~${formatDollars(totalEstimateDollars)}`}
                emphasized
              />
            </div>
          </section>

          {/* Trust strip */}
          <div
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[12px] px-4 py-3 text-[12px]"
            style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <IconLock />
              Encrypted in transit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconShield />
              FCRA-compliant consent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconCheck />
              No markup on screening
            </span>
          </div>

          {/* Fine print */}
          <p
            className="mt-6 text-[12px] leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Listed by {property.landlordName}. By starting, you agree to our terms and acknowledge that your{" "}
            <span className="tnum">{formatUSD(config.platformFeeCents, { decimals: 0 })}</span> Janus platform fee is
            non-refundable once your screening report has been generated by TransUnion.
          </p>
        </div>
      </main>

      {/* Sticky CTA — bottom-fixed on mobile so the primary action is always reachable */}
      <div
        className="sticky bottom-0 z-10"
        style={{ background: "var(--paper)", borderTop: "1px solid var(--hairline)" }}
      >
        <div className="mx-auto w-full max-w-xl px-5 py-4 sm:px-6">
          {/* href is /apply/[slug]/section8 once Step 1 is built. Disabled-looking but valid for now. */}
          <a
            href={`/apply/${slug}/section8`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] px-5 py-3.5 text-[15px] font-medium transition-colors"
            style={{ background: "var(--primary)", color: "var(--on-primary)" }}
          >
            Start application
            <IconArrowRight />
          </a>
          <p
            className="mt-2 text-center text-[12px]"
            style={{ color: "var(--ink-3)" }}
          >
            About 15 minutes · Save and resume anytime
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Small inline components ──────────────────────────────────

function Fact({
  label,
  value,
  borderRight,
  borderBottom,
}: {
  label: string;
  value: React.ReactNode;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      className="px-4 py-3.5"
      style={{
        borderRight: borderRight ? "1px solid var(--hairline)" : undefined,
        borderBottom: borderBottom ? "1px solid var(--hairline)" : undefined,
      }}
    >
      <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
        {label}
      </p>
      <p className="mt-1 text-[16px] font-medium" style={{ color: "var(--ink)" }}>
        {value}
      </p>
    </div>
  );
}

function Expect({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
      >
        {icon}
      </span>
      <div className="pt-0.5">
        <p className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>
          {title}
        </p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {detail}
        </p>
      </div>
    </li>
  );
}

function FeeRow({
  label,
  sub,
  amount,
  emphasized,
}: {
  label: string;
  sub?: string;
  amount: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between py-3"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div>
        <p
          className={`text-[14px] ${emphasized ? "font-semibold uppercase tracking-[0.08em] text-[11px]" : "font-medium"}`}
          style={{ color: emphasized ? "var(--ink-3)" : "var(--ink)" }}
        >
          {label}
        </p>
        {sub && (
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            {sub}
          </p>
        )}
      </div>
      <span
        className={`tnum ${emphasized ? "text-[16px] font-semibold" : "text-[14px] font-medium"}`}
        style={{ color: "var(--ink)" }}
      >
        {amount}
      </span>
    </div>
  );
}

// ─── Icons (stroke 1.6, matches prototype line weight) ──────────

function JanusMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="var(--primary)" />
      <path d="M12 2a10 10 0 010 20V2z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBank() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 10h18L12 4 3 10z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 10.5V7a4 4 0 018 0v3.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingSilhouette() {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-55"
    >
      <rect x="40" y="60" width="80" height="160" fill="#3d3225" />
      <rect x="130" y="40" width="120" height="180" fill="#2a2218" />
      <rect x="260" y="80" width="100" height="140" fill="#403427" />
      {/* Window grids */}
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 3 }).map((_, c) => (
          <rect
            key={`a-${r}-${c}`}
            x={50 + c * 22}
            y={75 + r * 28}
            width="14"
            height="18"
            fill="#c9b78b"
            opacity="0.85"
          />
        ))
      )}
      {Array.from({ length: 6 }).map((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <rect
            key={`b-${r}-${c}`}
            x={140 + c * 22}
            y={55 + r * 28}
            width="14"
            height="18"
            fill="#d2c192"
            opacity="0.85"
          />
        ))
      )}
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 4 }).map((_, c) => (
          <rect
            key={`c-${r}-${c}`}
            x={270 + c * 22}
            y={95 + r * 26}
            width="14"
            height="18"
            fill="#c4b283"
            opacity="0.85"
          />
        ))
      )}
    </svg>
  );
}
