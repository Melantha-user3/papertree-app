# Public Release Checklist

Run this checklist before making the GitHub repository public.

## Safety

- Run `npm run public:check`.
- Confirm only `.env.example` is tracked: `git ls-files '.env*' '.vercel*'`.
- Confirm `.env.local` and `.vercel/.env.production.local` are ignored and not
  copied into screenshots, docs, or deployment bundles.
- Check Supabase service role and LLM provider keys in Vercel; rotate them if
  any secret ever appeared in a shared log, screenshot, or commit.

## Repository

- Keep `README.md` clear that PaperTree is Alpha software.
- Document required environment variables using placeholders only.
- Keep Issues enabled for tester feedback.
- Do not publish private PDFs, generated user data, or real Supabase rows.

## Deployment

- Run `npm run verify`.
- Deploy with `npm run deploy:prod`.
- Verify:
  - `https://papertree-app-q9bj.vercel.app/canvas` returns `200`.
  - `https://papertree-app-q9bj.vercel.app/api/projects` returns demo mode for
    signed-out visitors.
