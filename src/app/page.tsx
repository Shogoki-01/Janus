// Placeholder landing. Real marketing UI lives in designs/00-landing.html
// and gets ported when product is ready to show. Until then this is the
// "is the app up?" page — uses Janus design tokens so the visual language
// is in place when we start building real screens.

export default function Home() {
  return (
    <main className="flex flex-1 items-center px-6 py-24 sm:py-32 paper-texture">
      <div className="mx-auto w-full max-w-2xl">
        <p
          className="text-xs uppercase tracking-[0.18em]"
          style={{ color: "var(--ink-3)" }}
        >
          Janus · 2026
        </p>
        <h1
          className="mt-4 text-4xl leading-[1.08] tracking-tight sm:text-5xl"
          style={{ color: "var(--ink)" }}
        >
          The doorway between an applicant and a tenancy.
        </h1>
        <p
          className="mt-6 max-w-xl text-base leading-7"
          style={{ color: "var(--ink-2)" }}
        >
          Multi-tenant rental screening: intake, payment, identity, income,
          references, and a defensible recommendation — in one workflow.
        </p>

        <div
          className="mt-10 rounded-[10px] border p-5 sm:p-6"
          style={{
            background: "var(--surface)",
            borderColor: "var(--hairline)",
            boxShadow: "var(--sh-1)",
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--ink-3)" }}
          >
            Where the work lives
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <Row label="Build spec" value="~/Sync/Averoigne/Projects/Janus/build-spec.md" />
            <Row label="Design skill" value="~/Sync/Averoigne/Projects/Janus/Janus Design.md" />
            <Row label="Marketing comp" value="designs/00-landing.html" />
            <Row label="Prototype source" value="designs/prototype/" />
          </dl>
        </div>

        <p className="mt-10 text-xs" style={{ color: "var(--ink-3)" }}>
          Pre-implementation. Stack: Next 16 · Supabase · Prisma · Stripe ·
          Resend · Inngest · Textract. SmartMove handoff (manual) for MVP.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0" style={{ color: "var(--ink-3)" }}>
        {label}
      </dt>
      <dd
        className="truncate text-right tnum"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "12.5px",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
