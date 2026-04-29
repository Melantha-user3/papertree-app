# Supabase Setup

PaperTree uses Supabase for authentication, Postgres data, row-level security, and private PDF storage.

## 1. Create a Project

1. Create a Supabase project.
2. Open **Project Settings > API**.
3. Copy:
   - Project URL
   - anon / publishable key
   - service role key
4. Put those values into `.env.local` using `.env.example` as the template.

## 2. Enable Email Auth

PaperTree currently uses Supabase email/password auth.

1. Open **Authentication > Providers**.
2. Enable **Email**.
3. For local development, add `http://localhost:3000` to the allowed site URL / redirect settings if your Supabase project requires it.
4. For production, add your deployed app URL.

## 3. Apply Database Migrations

Run the SQL migrations in order:

```bash
supabase/migrations/0001_papertree_phase1.sql
supabase/migrations/0002_papertree_phase2.sql
supabase/migrations/0003_papertree_phase3.sql
supabase/migrations/0004_papertree_auth.sql
supabase/migrations/0005_projects_layout_locking.sql
```

You can apply them with the Supabase CLI or paste each file into the Supabase SQL editor in order.

The migrations create:

- `nodes`, `edges`, and `annotations`
- `projects`
- paper analysis status fields
- project-scoped graph layout fields
- row-level security policies
- storage policies for user-scoped PDF access
- DAG protection for graph edges

## 4. Create the Storage Bucket

The migrations attempt to create the `papers` bucket. If you create it manually:

1. Open **Storage**.
2. Create a bucket named `papers`.
3. Set the file size limit to `52428800` bytes, or 50 MB.
4. Restrict allowed MIME types to `application/pdf`.

PaperTree stores files under:

```text
{user_id}/{yyyy-mm-dd}/{uuid}-{filename}.pdf
```

The app generates short-lived signed URLs for reading PDFs, so production deployments should keep PDF access private and user-scoped.

## 5. Required Environment Variables

At minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=papers
LLM_MODE=mock
```

For a real remote model, set:

```bash
LLM_MODE=remote
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
```

Provider shortcuts are also supported: `DEEPSEEK_API_KEY`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, or `OPENAI_API_KEY`.

## 6. Smoke Test

1. Start the app with `npm run dev`.
2. Create an account.
3. Create or use the default project.
4. Upload a PDF.
5. Confirm the node transitions from `uploaded` to `analyzing` to `ready`.
6. Open Synthesis Mode after locking at least two semantic edges.
