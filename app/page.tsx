import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  FileText,
  GitBranch,
  Mail,
  MessageCircle,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

const papers = [
  ["2019", "Surface Passivation Routes", "Passivation"],
  ["2020", "Low-Temperature Annealing", "Annealing"],
  ["2021", "Charge Transport Engineering", "Transport"],
  ["2022", "Hybrid Ligand PLQY", "PLQY"],
];

const trendPoints = [
  { year: "2019", value: "42%" },
  { year: "2020", value: "53%" },
  { year: "2022", value: "68%" },
  { year: "2024", value: "18.7%" },
];

const features = [
  {
    title: "Visualize",
    description:
      "Turn uploaded PDFs into a semantic research map with route lanes, locked edges, and readable paper nodes.",
    icon: GitBranch,
  },
  {
    title: "Analyze",
    description:
      "Extract comparable experimental parameters and track method evolution across a selected chain.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Synthesize",
    description:
      "Generate Markdown, plain text, LaTeX, and BibTeX from the exact papers you locked into the review path.",
    icon: Sparkles,
  },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_-52px_rgba(15,23,42,0.48)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <p className="text-xs font-medium text-slate-500">Sample Project - Quantum Dots</p>
      </div>

      <div className="grid bg-white md:min-h-[470px] md:grid-cols-[0.86fr_1.55fr_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/70 p-4 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">PaperTree</p>
            <FileText className="h-4 w-4 text-teal-600" />
          </div>
          <div className="space-y-2">
            {papers.map(([year, title, tag], index) => (
              <div
                key={title}
                className={`rounded-xl border px-3 py-2 ${
                  index === 2
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className="truncate text-xs font-semibold text-slate-900">{title}</p>
                <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <span>{year}</span>
                  <span>{tag}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="relative min-h-[280px] overflow-hidden bg-[linear-gradient(#f8fafc_1px,transparent_1px),linear-gradient(90deg,#f8fafc_1px,transparent_1px)] bg-[size:32px_32px] p-5 md:min-h-0">
          <div className="absolute left-6 top-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Semantic lanes
          </div>
          <div className="absolute left-10 right-10 top-1/2 h-px -translate-y-1/2 bg-teal-200" />
          <div className="absolute left-[18%] top-[32%] h-px w-[27%] rotate-12 bg-teal-400" />
          <div className="absolute left-[45%] top-[43%] h-px w-[24%] rotate-6 bg-teal-400" />
          <div className="absolute left-[66%] top-[39%] h-px w-[18%] rotate-12 bg-teal-400" />

          {[
            ["2019", "Passivation", "left-[7%] top-[48%]"],
            ["2020", "Annealing", "left-[31%] top-[35%]"],
            ["2021", "Transport", "left-[54%] top-[44%]"],
            ["2024", "Integrated Stack", "left-[75%] top-[30%]"],
          ].map(([year, label, position]) => (
            <div
              key={label}
              className={`absolute w-28 rounded-2xl border border-teal-200 bg-white/95 p-3 shadow-sm md:w-32 ${position}`}
            >
              <p className="text-[10px] font-semibold text-teal-700">{year}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-slate-900">{label}</p>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">locked semantic link</p>
            </div>
          ))}
        </main>

        <aside className="border-t border-slate-200 bg-white p-4 md:border-l md:border-t-0">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4 text-cyan-700" />
              Synthesis Mode
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              5 locked papers in the active chain. Export review as Markdown, LaTeX, or BibTeX.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Parameter Dashboard
            </p>
            <div className="mt-4 flex h-28 items-end gap-3 border-b border-l border-slate-200 pl-3">
              {trendPoints.map((point, index) => (
                <div key={point.year} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-teal-500"
                    style={{ height: `${36 + index * 16}px` }}
                  />
                  <span className="text-[10px] text-slate-500">{point.year}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-700">PLQY trend: 42% to 68%</p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Review excerpt
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              The route evolves from surface passivation toward integrated device stacks, with
              measurable gains in PLQY and responsivity.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_74%,#eef6f5_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-sm font-bold text-white">
                PT
              </span>
              <span className="text-base font-semibold text-slate-950">PaperTree</span>
            </Link>
            <nav className="flex items-center gap-2">
              <a
                href="https://github.com/Melantha-user3/papertree-app/issues"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 sm:inline-flex"
              >
                <MessageCircle className="h-4 w-4" />
                Feedback
              </a>
              <a
                href="mailto:jinlongwan57@gmail.com?subject=PaperTree%20Alpha%20Feedback"
                className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950 md:inline-flex"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
              <Link
                href="/login?mode=signin"
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
              >
                Sign in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Create account
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.78fr_1.22fr] lg:py-8">
            <div className="max-w-2xl">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl">
                From Messy PDFs to Structured Research Intelligence.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                PaperTree turns research PDFs into semantic lanes, parameter trends, and
                citation-ready synthesis outputs for serious literature review work.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?mode=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                >
                  Start with sample project
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login?mode=signin"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-6 flex max-w-xl items-start gap-2 text-sm leading-6 text-slate-500">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                User-scoped Supabase RLS. Local Ollama support available.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Alpha feedback:{" "}
                <a
                  href="https://github.com/Melantha-user3/papertree-app/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-teal-700 underline-offset-4 hover:underline"
                >
                  report a bug or suggestion
                </a>
                {" "}or email{" "}
                <a
                  href="mailto:jinlongwan57@gmail.com?subject=PaperTree%20Alpha%20Feedback"
                  className="font-medium text-teal-700 underline-offset-4 hover:underline"
                >
                  jinlongwan57@gmail.com
                </a>
              </p>
            </div>

            <div className="min-w-0">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-teal-700" />
                  <h2 className="mt-5 text-2xl font-semibold text-slate-950">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-16 grid gap-8 rounded-[28px] border border-slate-200 bg-slate-50 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Onboarding starts with a complete research chain.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                New accounts receive a sample quantum-dot project with ready papers, locked
                semantic edges, comparable parameters, and a synthesis-ready path.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {["Upload PDFs", "Lock chain", "Export review"].map((label, index) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">{label}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Step {index + 1} is visible in the seeded workspace, so first-time users can
                    understand the end state before adding their own papers.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
