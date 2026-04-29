# Vercel Alpha Checklist

Use this checklist for the first private PaperTree deployment. The goal is a stable Alpha link that lets 3-5 trusted users experience the landing page, sample project, PDF upload, and synthesis flow.

## 1. Preflight

- [ ] Confirm local checks pass:

  ```bash
  npm run lint
  npm run build
  ```

- [ ] Confirm no local secrets are committed:

  ```bash
  git status --short
  git diff -- .env.local
  ```

  `.env.local` should be ignored by Git. Only `.env.example` should be committed.

- [ ] Confirm `README.md`, `LICENSE`, `.env.example`, `docs/SUPABASE_SETUP.md`, and this checklist are present.

## 2. Supabase

- [ ] Create a fresh Supabase project for Alpha.
- [ ] Enable Email auth in **Authentication > Providers**.
- [ ] Apply migrations in order:

  ```text
  supabase/migrations/0001_papertree_phase1.sql
  supabase/migrations/0002_papertree_phase2.sql
  supabase/migrations/0003_papertree_phase3.sql
  supabase/migrations/0004_papertree_auth.sql
  supabase/migrations/0005_projects_layout_locking.sql
  ```

- [ ] Confirm the `papers` bucket exists.
- [ ] Confirm `papers` accepts `application/pdf`.
- [ ] Confirm file size limit is at least 50 MB.
- [ ] Confirm RLS policies are enabled on `nodes`, `edges`, `annotations`, `projects`, and `storage.objects`.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the detailed setup.

## 3. Vercel Project

- [ ] Import the GitHub repository into Vercel.
- [ ] Framework preset: **Next.js**.
- [ ] Build command: `npm run build`.
- [ ] Install command: `npm install`.
- [ ] Output directory: leave default.
- [ ] Node.js runtime: use Vercel default unless a build log requires changing it.

## 4. Environment Variables

Add these in Vercel **Project Settings > Environment Variables**.

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=papers
LLM_MODE=mock
```

Recommended Alpha sequence:

1. Deploy first with `LLM_MODE=mock`.
2. Verify signup, sample project seeding, graph display, and synthesis UI.
3. Switch to `LLM_MODE=remote` only after the mock deployment is stable.

Remote provider example:

```bash
LLM_MODE=remote
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
```

Provider shortcuts also work:

```bash
DEEPSEEK_API_KEY=
QWEN_API_KEY=
DASHSCOPE_API_KEY=
OPENAI_API_KEY=
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to any `NEXT_PUBLIC_` variable.

## 5. Auth Redirects

In Supabase **Authentication > URL Configuration**:

- [ ] Site URL: your Vercel production URL.
- [ ] Redirect URLs:
  - `http://localhost:3000`
  - `http://localhost:3000/auth/confirm`
  - your Vercel preview URL pattern, if needed
  - your Vercel production URL
  - `https://your-production-domain/auth/confirm`

If email confirmation is enabled, test the signup email path before sharing the Alpha link.

## 6. First Deployment Smoke Test

After Vercel deploys:

- [ ] Open `/`.
- [ ] Confirm landing page loads.
- [ ] Confirm browser sees `/manifest.webmanifest`.
- [ ] Confirm `/sw.js` returns JavaScript.
- [ ] Create a new account.
- [ ] Confirm `/canvas` loads after signup/login.
- [ ] Confirm `Sample Project - Quantum Dots` appears automatically.
- [ ] Confirm 5 sample papers appear.
- [ ] Confirm locked semantic edges appear on the canvas.
- [ ] Turn on Synthesis Mode.
- [ ] Select a node in the locked chain.
- [ ] Confirm the right panel shows synthesis context and parameter chart.
- [ ] Upload a small PDF.
- [ ] Confirm the new node transitions through `uploaded`, `analyzing`, and `ready` or shows a clear error.
- [ ] Sign out and sign back in.
- [ ] Confirm data is still scoped to the same account.

## 7. Alpha Tester Script

Send testers a short message:

```text
I am testing PaperTree, a web app that turns research PDFs into a semantic literature graph and parameter dashboard.

Please try three things:
1. Sign up and look at the sample Quantum Dots project.
2. Tell me whether the landing page makes the product clear within 30 seconds.
3. Upload one non-sensitive PDF and tell me whether the analysis flow makes sense.

Do not upload confidential or unpublished work during this Alpha.
```

Ask only these questions at first:

- [ ] Did you understand what PaperTree does from the landing page?
- [ ] Did the sample project make the end state obvious?
- [ ] Would you upload your own PDFs if the project were stable?
- [ ] What was confusing in the first 3 minutes?
- [ ] Did anything feel unsafe from a privacy perspective?

## 8. Go / No-Go

Alpha is ready to share privately when:

- [ ] Build and lint pass locally.
- [ ] Vercel deployment succeeds.
- [ ] New account creates the sample project.
- [ ] PDF upload works with a small public paper.
- [ ] No real secrets are committed.
- [ ] Landing page, `/manifest.webmanifest`, and `/sw.js` load in production.
- [ ] You have a clear tester message and feedback questions.

Do not announce publicly until at least one external tester completes the signup, sample project, and upload flow.
