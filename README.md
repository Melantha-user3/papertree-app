# PaperTree

PaperTree is an AI-powered literature graph workspace for turning research PDFs into a navigable paper tree, analyzing method evolution, and generating citation-ready literature reviews from locked semantic chains.

It is designed for real research workflows: upload papers, inspect the PDF, map semantic relationships, track experimental parameters over time, and synthesize a defensible review from the papers you explicitly choose.

**Live Demo:** [https://papertree-app-q9bj.vercel.app](https://papertree-app-q9bj.vercel.app)

No PDF? No problem. Open the live demo and explore the pre-loaded Quantum Dots sample project before uploading anything.

**Alpha Feedback:** [Open a GitHub issue](https://github.com/Melantha-user3/papertree-app/issues) or email [jinlongwan57@gmail.com](mailto:jinlongwan57@gmail.com) for bugs, confusing flows, or research-workflow suggestions.

## Why PaperTree

- **Visualize** PDF libraries as a project-scoped semantic graph.
- **Synthesize** locked paper chains into Markdown, plain text, LaTeX, and BibTeX.
- **Analyze** comparable experimental parameters across a research route.

## Features

- **Public demo workspace**: signed-out visitors can inspect the Quantum Dots sample project before creating an account.
- **Auth-protected private workspace**: Supabase email/password auth protects uploads, saved projects, and user-owned papers.
- **Project isolation**: each user can create and switch between private literature projects.
- **PDF upload pipeline**: validates PDF uploads, stores files in Supabase Storage, and reads them through signed URLs.
- **Metadata and text extraction**: extracts title, year, page count, and text excerpts from uploaded PDFs.
- **LLM analysis**: supports mock mode, local Ollama, and OpenAI-compatible remote providers such as DeepSeek, Qwen, and OpenAI.
- **Academic filtering**: separates research papers from non-academic PDFs while keeping all files visible when needed.
- **Graph canvas**: React Flow timeline canvas with paper nodes, semantic links, minimap, controls, and route lane labels.
- **Lockable semantic edges**: suggested AI links can be confirmed and locked before synthesis.
- **Synthesis Mode**: generates literature reviews from locked chains only, keeping the source set explicit.
- **Parameter Dashboard**: extracts comparable metrics such as efficiency, PLQY, responsivity, and current density, then plots their evolution across a chain.
- **PDF reader panel**: inspect the source PDF beside the graph and analysis details.
- **Export-friendly outputs**: copy generated reviews as Markdown, TXT, LaTeX, or BibTeX.

## Tech Stack

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **UI**: Tailwind CSS 4, Framer Motion, Lucide icons
- **Graph**: React Flow
- **PDF**: pdfjs-dist, react-pdf, React PDF Viewer
- **State**: Zustand
- **Database/Auth/Storage**: Supabase
- **AI**: OpenAI SDK against OpenAI-compatible APIs

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in the Supabase values. To try the product flow without a model key, keep:

```bash
LLM_MODE=mock
```

For real model analysis, configure a remote OpenAI-compatible provider:

```bash
LLM_MODE=remote
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

DeepSeek, Qwen/DashScope, OpenAI shortcuts, and local Ollama are documented in `.env.example`.

### 3. Set up Supabase

Follow [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

At minimum, you need:

- Supabase project URL
- anon / publishable key
- service role key
- `papers` storage bucket
- migrations from `supabase/migrations` applied in order

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Validate production build

```bash
npm run public:check
npm run verify
```

## Deployment

PaperTree requires a Node.js-capable Next.js deployment because it uses route handlers, authentication, file upload, PDF extraction, and LLM calls.

For deployment hardening and public-release checks, follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/PUBLIC_RELEASE_CHECKLIST.md](docs/PUBLIC_RELEASE_CHECKLIST.md).

Recommended first deployment:

1. Create a hosted Supabase project.
2. Apply the migrations.
3. Create the `papers` storage bucket.
4. Deploy the Next.js app to Vercel or another Node.js host.
5. Add all environment variables from `.env.example`.
6. Use `LLM_MODE=mock` for a public demo, or `LLM_MODE=remote` for production analysis.

Static export is not appropriate for this project because PaperTree depends on server routes and protected runtime data.

## LLM Modes

| Mode | Use case |
| --- | --- |
| `mock` | Demo mode with no external model key. Best for public previews and screenshots. |
| `remote` | Production mode with an OpenAI-compatible hosted provider. |
| `ollama` | Local development with an Ollama OpenAI-compatible endpoint. |
| `auto` | Uses a detected remote API key when available, otherwise falls back to mock mode. |

## Product Notes

The current product is strongest as a Web + PWA-style research workspace. The three-panel layout is optimized for desktop and tablet-sized research workflows: project tree, graph canvas, and PDF reader stay visible at the same time.

Future packaging options include:

- hosted Web SaaS
- GitHub self-hosted template
- Docker deployment
- PWA install support
- Tauri desktop wrapper

## License

MIT
