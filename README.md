# Meta Ads Report Studio

A reporting tool for marketing agencies. It connects the agency's Meta ad accounts, groups
them by client, and shows on one screen which clients are spending, how well, and which ones
need attention. A one-page PDF report for any client takes one click.

**Try it without an account:** `/demo` runs a fictitious agency with six clients and needs no
configuration at all.

## What it does

- **Agency overview.** Every client on one screen: spend and its change, a daily trend line,
  conversions, cost per conversion, activity status and alerts. Clients that need attention are
  listed first. Spend in different currencies is shown side by side and never added together.
- **Alerts** for what an account manager has to act on: spend up 40 % or more, cost per
  conversion up 30 % or more, a week of spend with no conversions (only for accounts that
  normally convert), and accounts blocked by a payment problem, a review or a suspension.
- **Client page.** KPIs, ratios (CTR, CPC, CPM, CPA), the spend trend, a breakdown by
  campaign, and a sortable campaign table with objective, budget and *real* status. A campaign
  whose end date has passed reads "Ended" even while Meta still reports it as `ACTIVE`.
  A client with several ad accounts, for example one billed in EUR and one in USD, switches
  between them.
- **Client organisation.** Meta does not say which business owns an ad account unless the app
  asks for `business_management`, which this app deliberately does not. So the agency groups its
  accounts into clients itself. Accounts with the same name are suggested as one client, and an
  account can be hidden.
- **PDF reports** on one A4 page, under the agency's name ("Prepared by …") for the client's
  name. They are rebuilt on the server from the source data, never from figures the browser
  sends.
- French and English throughout, including the PDF. Responsive from 375 px up.

## Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, Motion, Recharts, Lucide |
| Auth | Auth.js v5, Facebook Login for Business, database sessions |
| Data | PostgreSQL on Neon, Prisma 7 with the Neon driver adapter |
| Meta | Marketing API v21.0, `ads_read` only |
| PDF | `@react-pdf/renderer`, rendered on the server |
| i18n | next-intl |
| Validation | zod, at every boundary: Meta responses, API requests, Server Action input |
| Tests | Vitest and Testing Library, 265 tests |
| Delivery | Multi-stage Docker image, docker compose, GitHub Actions |

## Architecture

```
app/[locale]/dashboard/          Agency overview, client pages, client organisation (signed in)
app/[locale]/demo/               The same screens over a fictitious agency
app/api/report/                  PDF endpoint
lib/agency/                      Clients, statuses, alerts, overview maths, demo agency, server service
lib/meta/                        Marketing API client, response schemas, mapping, error classification
lib/metrics/                     Domain model, aggregation, derived ratios, formatting
lib/auth/                        Auth.js configuration, token encryption, encrypted adapter
lib/report/                      The PDF document
components/agency/               App shell, overview, campaign table, organisation form
prisma/                          Schema and migrations
```

Figures are held as integer cents and derived from one row per campaign per day. The browser
receives 180 days of rows once, so switching between 7, 30 and 90 days is instant and every
period has a previous period to compare against. Each account's days are cut in its own
timezone, as Meta cuts them.

## Security and privacy

- **Least privilege.** The only permissions requested are `public_profile` and `ads_read`.
  The app can read statistics and nothing else. It cannot edit a campaign or spend money.
- **Tokens encrypted at rest** with AES-256-GCM. They are sent to Meta in an `Authorization`
  header, never in a URL where logs and `Referer` headers would keep them. They are decrypted
  only in `server-only` modules.
- **Every identifier from the browser is checked against the user's own data.** A client id is
  looked up within the signed-in user's clients, and an ad account id against what the user's
  own token can read. Another agency's client simply does not exist.
- **No statistics are stored.** The database holds identifiers and display names. Figures are
  fetched on demand and cached in memory for at most ten minutes, keyed by a hash of the token.
- **Rate limiting** on the public PDF endpoint (10 a minute per address). Bounded concurrency
  and caching keep an agency with many accounts inside Meta's API quota.
- Sessions live in the database, so disconnecting revokes them immediately.

## Running it

### Demo only

```bash
npm install
npm run dev
```

Open http://localhost:3000/en/demo. No environment variables are needed.

### With Meta sign-in

1. Copy `.env.example` to `.env.local` and fill it in. Each variable is explained there.
2. In the Meta app dashboard, add `http://localhost:3000/api/auth/callback/facebook` as a valid
   OAuth redirect URI. For an app using Facebook Login for Business, create a configuration
   with the `ads_read` permission and put its id in `META_LOGIN_CONFIG_ID`.
3. Apply the database schema:

   ```bash
   npx prisma migrate deploy
   ```

   Behind a corporate proxy that resets PostgreSQL connections on port 5432, use
   `node scripts/db-migrate.mjs` instead. It applies the same migrations to Neon over HTTPS.
4. Run `npm run dev` and sign in from the home page.

### With Docker

```bash
docker compose up --build
DATABASE_URL=postgresql://studio:studio@localhost:5432/studio npx prisma migrate deploy
```

This starts the app and its own PostgreSQL. Meta credentials are read from a local `.env`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (loads `.env.local`, including a corporate CA bundle if set) |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Test suite |
| `npm run lint` / `npm run type-check` | ESLint and TypeScript |

## Continuous integration

Every pull request and every push to `main` runs lint, type-check, the test suite and a
production build. Once those pass, the Docker image is built, started, and probed over HTTP.
