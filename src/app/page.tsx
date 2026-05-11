export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 font-sans dark:bg-zinc-950">
      <div className="max-w-xl text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Janus · 2026
        </p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
          The doorway between an applicant and a tenancy.
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Multi-tenant rental screening: intake, payment, identity, credit, criminal,
          eviction, income, references, and a defensible recommendation — in one workflow.
        </p>
        <p className="mt-8 text-sm text-zinc-500">
          Marketing comp: <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">designs/00-landing.html</code>
          {" "}· Build spec: <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-800">~/Sync/Averoigne/Projects/Janus/build-spec.md</code>
        </p>
      </div>
    </main>
  );
}
