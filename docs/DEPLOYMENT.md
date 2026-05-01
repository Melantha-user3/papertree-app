# Deployment

PaperTree is deployed on Vercel from `main`.

## Required Local Setup

Use a GitHub-recognized author so Vercel production deployments are not blocked:

```bash
git config --local user.name Melantha-user3
git config --local user.email Melantha-user3@users.noreply.github.com
```

## Preflight

Run this before pushing or deploying:

```bash
npm run public:check
npm run verify
```

`npm run verify` runs lint and the production build. The build intentionally uses
`next build --webpack` because this app is on Next.js 16 and the current Vercel
trace path is more stable with webpack.

## Production Deploy

```bash
npm run deploy:prod
```

The Vercel project uses Node.js 24.x and should install from the lockfile. Keep
real environment values in Vercel project settings, not in repo files.

## Known Vercel/Next Workarounds

- `pages/_app.tsx` and `pages/__pages-manifest.tsx` exist only to force stable
  Pages Router manifest generation during Vercel's Next.js tracing step.
- `app/(dashboard)/page.tsx` should stay absent. `/canvas` is the real dashboard
  route; restoring that redirect page can reintroduce trace errors.
