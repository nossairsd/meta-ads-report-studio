# Deployment

The app runs on Vercel, with the database on Neon and sign-in through a Meta
app. Three services, each with its own settings — this is the order to do them
in, and what each one needs from the others.

Nothing here is secret: every value below is entered in a provider's dashboard,
never committed.

---

## 1. Push the code

Vercel deploys from GitHub. Merge the work into `main` first: that is the
branch a production deployment should follow.

```bash
git push origin feature/dashboard
```

Then open a pull request into `main`
([compare view](https://github.com/nossairsd/meta-ads-report-studio/compare/main...feature/dashboard?expand=1)),
let the CI finish — lint, type-check, tests, production build, and the Docker
image — and merge it.

---

## 2. Create the Vercel project

1. On [vercel.com/new](https://vercel.com/new), import the GitHub repository.
2. Framework preset: **Next.js** (detected automatically). Leave the build and
   install commands as they are; `npm ci` and `next build` are what CI runs too.
3. Set the function region to one close to the database — **Frankfurt
   (`fra1`)** or **Paris (`cdg1`)** for a Neon instance in Europe. Every
   dashboard page queries the database on each request, so the distance between
   the two is felt on every page load.
4. Do **not** deploy yet: add the environment variables first, or the first
   build will produce a site that cannot sign anyone in.

`output: "standalone"` in `next.config.ts` is there for the Docker image.
Vercel builds with its own adapter and ignores it; it costs nothing to leave.

---

## 3. Environment variables

In **Settings → Environment Variables**, for **Production** and **Preview**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Neon connection string, with `?sslmode=require` |
| `META_APP_ID` | From the Meta app dashboard |
| `META_APP_SECRET` | From the Meta app dashboard — never anywhere else |
| `META_LOGIN_CONFIG_ID` | The "Facebook Login for Business" configuration id |
| `AUTH_SECRET` | `openssl rand -base64 32` — a **new** value for production |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32`, 32 bytes once decoded |
| `ADMIN_META_USER_IDS` | Your Meta user id, so you can open `/dashboard/admin` |

Two that are easy to get wrong:

- **`NODE_EXTRA_CA_CERTS` must not be set.** It points at a certificate file on
  a specific machine, for a corporate proxy. On Vercel that path does not
  exist and Node fails to start.
- **`AUTH_URL` is only needed for a custom domain** (`https://your-domain.com`).
  On a `*.vercel.app` address Auth.js works it out on its own.

`TOKEN_ENCRYPTION_KEY` encrypts the stored Meta tokens. If production uses a
different key from development while sharing one database, the tokens written
by the other environment cannot be read and those users are asked to reconnect.
Sharing a database between environments is not worth it for that reason alone —
give production its own Neon database when you can.

---

## 4. Apply the database schema

Migrations do not run on deploy. Apply them once, from your machine, against
the production database:

```bash
DATABASE_URL="<the production connection string>" npx prisma migrate deploy
```

Behind a corporate proxy that resets PostgreSQL connections on port 5432, use
the HTTPS path instead — same migrations, same bookkeeping:

```bash
DATABASE_URL="<the production connection string>" node scripts/db-migrate.mjs
```

Do this again after any later change to `prisma/schema.prisma`, before the
deployment that needs it.

---

## 5. Point the Meta app at the deployed site

In the [Meta app dashboard](https://developers.facebook.com/apps), with the
deployment's address as `https://<domain>`:

- **Facebook Login → Settings → Valid OAuth Redirect URIs**:
  `https://<domain>/api/auth/callback/facebook`
- **Settings → Basic → App Domains**: `<domain>`
- **Settings → Basic → Site URL**: `https://<domain>`
- **Privacy Policy URL**: `https://<domain>/en/privacy`
- **User Data Deletion URL**: `https://<domain>/en/data-deletion`

Keep the `localhost` redirect URI alongside the new one: it is what development
signs in with.

---

## 6. Check the deployment

In order, because each step depends on the one before:

1. `https://<domain>/en/demo` — the demo agency renders. This needs no
   database and no Meta credentials, so it failing means the build itself is
   wrong.
2. `https://<domain>/en` — the landing page; send an early-access request and
   confirm it is stored.
3. Sign in with a Meta account that has a role on the app. A first sign-in
   lands on the client organisation screen.
4. Open a client, then download a PDF report.
5. `https://<domain>/en/dashboard/admin` — the request you sent in step 2 is
   listed, and the CSV export downloads.

If sign-in returns to the landing page saying the connection failed, the
redirect URI in step 5 is the first thing to check.

---

## 7. Opening the app to the public

Until Meta reviews the app, only people with a role on it (admin, developer or
tester) can sign in — which is what the private beta is built around. To let
any agency sign up:

1. Complete **business verification** in the Meta dashboard.
2. Request **Advanced Access** to `ads_read` in App Review, with a screencast
   showing: signing in, granting the permission, the dashboard, and a generated
   report.
3. The privacy policy and data deletion pages above are part of what the review
   checks; they are already published by the app.

Once approved, the hero's second action can go back to "Connect with Facebook",
and the early-access form becomes a way to talk to larger agencies rather than
the only way in.

---

## Known limits of this setup

- The Meta response cache and the report rate limit live in the memory of each
  serverless instance. With several instances the effective limit is multiplied
  by their number. It remains a ceiling, which is the point; a shared store
  (Redis) is what would make it exact, and it is not worth another service at
  this size.
- Reports are generated in a function, and a very large account can take a few
  seconds. If a report ever times out, raise the function's duration limit in
  Vercel rather than trimming the data.
