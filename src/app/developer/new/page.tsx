// /developer/new — Developer Mode: create a new screening case.
//
// Captures the minimum operator-known facts (property snapshot + primary
// applicant basics) so a case has somewhere for documents to land. Co-
// applicants and Section 8 voucher details are added later in the flow once
// the upload + extraction steps exist.

import Link from "next/link";
import { createCaseAction } from "../actions";

export default function NewCasePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <div className="flex items-center gap-3">
          <JanusMark />
          <span className="text-[14px] font-semibold tracking-tight">Janus</span>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            /
          </span>
          <Link
            href="/developer"
            className="text-[13px] hover:underline"
            style={{ color: "var(--ink-2)" }}
          >
            Cases
          </Link>
          <span className="text-[12px]" style={{ color: "var(--ink-3)" }}>
            /
          </span>
          <span className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>
            New
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-3)" }}
          >
            Step 1 of 1 · Case basics
          </p>
          <h1
            className="mt-1 text-[22px] font-semibold leading-tight tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            New screening case
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--ink-3)" }}>
            Capture the property and primary applicant. Documents and co-applicants attach in the next step.
          </p>
        </div>

        <form action={createCaseAction} className="mt-7 space-y-7">
          {/* Property snapshot */}
          <Fieldset
            label="Property"
            hint="From AppFolio, lease draft, or wherever the operator already has it."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <Field
                name="propertyAddressLine1"
                label="Street address"
                required
                placeholder="247 Larkin Street"
                className="sm:col-span-4"
              />
              <Field
                name="propertyAddressLine2"
                label="Unit / Apt"
                placeholder="Unit 3B"
                className="sm:col-span-2"
              />
              <Field
                name="propertyCity"
                label="City"
                required
                placeholder="San Francisco"
                className="sm:col-span-3"
              />
              <Field
                name="propertyState"
                label="State"
                required
                placeholder="CA"
                maxLength={2}
                className="sm:col-span-1"
              />
              <Field
                name="jurisdiction"
                label="Jurisdiction"
                required
                defaultValue="US-CA-SF"
                placeholder="US-CA-SF"
                className="sm:col-span-2"
                hint="ISO-style. Drives fee + deposit caps."
              />
              <Field
                name="rentDollars"
                label="Monthly rent"
                required
                type="number"
                min={1}
                placeholder="3250"
                className="sm:col-span-3"
                prefix="$"
                hint="Whole dollars. Stored as cents."
              />
              <Field
                name="bedrooms"
                label="Bedrooms"
                required
                type="number"
                min={0}
                defaultValue="1"
                className="sm:col-span-3"
              />
            </div>
          </Fieldset>

          {/* Primary applicant */}
          <Fieldset
            label="Primary applicant"
            hint="Co-applicants and references can be added after documents are uploaded."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                name="primaryApplicantName"
                label="Full name"
                required
                placeholder="Maya Chen"
              />
              <Field
                name="primaryApplicantEmail"
                label="Email"
                type="email"
                placeholder="maya.chen@example.com"
                hint="Optional. Leave blank if you don't have it yet — fill in later."
              />
            </div>
          </Fieldset>

          {/* Voucher flag */}
          <Fieldset
            label="Housing assistance"
            hint="When checked, the decision engine applies the income multiplier to the tenant portion only (HUD source-of-income guidance)."
          >
            <label className="flex items-start gap-3 text-[13.5px]" style={{ color: "var(--ink)" }}>
              <input
                type="checkbox"
                name="isSection8"
                className="mt-0.5 h-4 w-4"
                style={{ accentColor: "var(--primary)" }}
              />
              <span>
                Applicant has a Section 8 / Housing Choice Voucher.
                <span className="ml-1" style={{ color: "var(--ink-3)" }}>
                  Voucher details (tenant portion, PHA, caseworker) are captured later.
                </span>
              </span>
            </label>
          </Fieldset>

          {/* Lease fees */}
          <Fieldset
            label="Lease fees"
            hint="Toggle the optional fees that apply to this lease. Approval emails include them in the monthly total and one-time move-in line."
          >
            <div className="space-y-2.5">
              <FeeToggle
                name="feeInternetCable"
                label="Internet & cable"
                amount="$98 / mo"
                description="Recurring monthly add-on."
              />
              <FeeToggle
                name="feeResidentBenefits"
                label="Resident Benefits Package"
                amount="$50 / mo"
                description="Recurring monthly add-on (filters, credit reporting, etc.)."
              />
              <FeeToggle
                name="feeAdminOneTime"
                label="Admin fee"
                amount="$125 one-time"
                description="Charged at move-in along with the security deposit."
              />
            </div>
          </Fieldset>

          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: "1px solid var(--hairline)" }}
          >
            <Link
              href="/developer"
              className="text-[14px]"
              style={{ color: "var(--ink-2)" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-[8px] px-5 py-2.5 text-[14px] font-medium"
              style={{ background: "var(--primary)", color: "var(--on-primary)" }}
            >
              Create case
              <IconArrowRight />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

// ────────────────────────── form primitives ──────────────────────────

function Fieldset({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[12px] p-5"
      style={{ border: "1px solid var(--hairline)", background: "var(--surface)" }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </p>
      {hint && (
        <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-3)" }}>
          {hint}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  defaultValue,
  type = "text",
  className = "",
  prefix,
  hint,
  maxLength,
  min,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "email" | "number";
  className?: string;
  prefix?: string;
  hint?: string;
  maxLength?: number;
  min?: number;
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className="block text-[12px] font-medium"
        style={{ color: "var(--ink-2)" }}
      >
        {label}
        {required && (
          <span className="ml-0.5" style={{ color: "var(--bad)" }}>
            *
          </span>
        )}
      </span>
      <div
        className="mt-1 flex items-center rounded-[8px] focus-within:ring-2"
        style={{
          border: "1px solid var(--hairline-strong)",
          background: "var(--paper)",
        }}
      >
        {prefix && (
          <span
            className="pl-3 text-[14px] tnum"
            style={{ color: "var(--ink-3)" }}
          >
            {prefix}
          </span>
        )}
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          maxLength={maxLength}
          min={min}
          className="w-full bg-transparent px-3 py-2 text-[14px] outline-none"
          style={{ color: "var(--ink)" }}
        />
      </div>
      {hint && (
        <span
          className="mt-1 block text-[11.5px]"
          style={{ color: "var(--ink-3)" }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function FeeToggle({
  name,
  label,
  amount,
  description,
}: {
  name: string;
  label: string;
  amount: string;
  description: string;
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-[10px] p-3 transition-colors hover:bg-[var(--surface-2)]"
      style={{ color: "var(--ink)" }}
    >
      <input
        type="checkbox"
        name={name}
        className="mt-0.5 h-4 w-4 shrink-0"
        style={{ accentColor: "var(--primary)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13.5px] font-medium">{label}</span>
          <span className="tnum text-[12.5px]" style={{ color: "var(--ink-2)" }}>
            {amount}
          </span>
        </div>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--ink-3)" }}>
          {description}
        </p>
      </div>
    </label>
  );
}

function JanusMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="var(--primary)" />
      <path d="M12 2a10 10 0 010 20V2z" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
