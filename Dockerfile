# syntax=docker/dockerfile:1

# Multi-stage build. The final image carries the compiled server and nothing
# else: no source, no dev dependencies, no package manager.

# ---------------------------------------------------------------- dependencies
FROM node:24-alpine AS deps
WORKDIR /app

# Copied on their own so this layer is only rebuilt when the lockfile changes,
# not on every source edit.
COPY package.json package-lock.json ./

# The postinstall script runs `prisma generate`, which needs the schema.
COPY prisma ./prisma

# `npm ci` installs exactly what the lockfile pins — a build is reproducible
# rather than dependent on when it ran.
RUN npm ci


# --------------------------------------------------------------------- builder
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated
COPY . .

# The build must not need real secrets: the landing page, the demo and the PDF
# endpoint work without them, and the database client is constructed lazily.
# These placeholders only satisfy code that reads the variables at module load.
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npm run build


# --------------------------------------------------------------------- runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# An unprivileged user: a process that never needs to write to its own image
# should not run as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `standalone` contains the server and the traced subset of node_modules.
# Static assets and public files are not traced and have to be copied.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations travel with the image so a deployment can apply them.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

# Reports unhealthy while the server is not answering, so an orchestrator can
# replace the container instead of routing traffic into a dead one.
#
# The demo route is the probe on purpose: it renders without a database and
# without any Meta credentials. Probing an endpoint that needs secrets would
# mark a perfectly healthy demo deployment as failing — verified by running
# the standalone server with no AUTH_SECRET, where /api/auth/session returns
# 500 while /en/demo returns 200.
HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/en/demo').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
