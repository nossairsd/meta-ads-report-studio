import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * The Prisma client: one instance per process, constructed lazily.
 *
 * Two problems are solved here.
 *
 * Duplicate pools. In development Next.js re-evaluates modules on every hot
 * reload. Without the global cache each reload would build another client with
 * its own connection pool, until PostgreSQL refuses new connections — the
 * "too many clients already" that only shows up after a long dev session.
 * `globalThis` survives module re-evaluation, so the pool is created once.
 *
 * Eager construction. The landing page, the demo and the PDF endpoint need no
 * database at all. If this module built a client on import, `next build` and
 * any demo-only deployment would fail for want of a DATABASE_URL they never
 * use. The proxy below defers construction to the first actual query, so the
 * failure lands where the database is genuinely required.
 *
 * Prisma 7 has no bundled query engine: connections are made through a driver
 * adapter, which is why the adapter is constructed here rather than a URL
 * being declared in the schema.
 *
 * The Neon adapter is used rather than a plain PostgreSQL socket. A direct
 * connection on port 5432 opens its TCP handshake and is then reset the moment
 * the PostgreSQL protocol starts, on any network that inspects outbound
 * traffic — which is exactly what happens on the corporate network this is
 * developed on. Neon speaks the same protocol over TLS on 443, which such
 * networks allow, and it is also the connection style Neon recommends for
 * serverless deployment. One adapter therefore serves both.
 */

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set, so the database cannot be reached. It is only " +
        "needed for the authenticated dashboard — the landing page and the demo " +
        "run without it."
    );
  }

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    // Full query logging is noise in normal operation; warnings and errors are
    // always worth surfacing.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  // Module-level cache first: the proxy below calls this on every property
  // access, so it must never construct more than once per process.
  if (client) return client;

  client = globalForPrisma.prisma ?? createPrismaClient();
  // Mirror to globalThis in development only, where module re-evaluation is
  // the thing being defended against. In production the module is evaluated
  // once per instance and the local cache is enough.
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    // Bind methods to the real client. Left unbound, `this` inside them would
    // be the proxy, and Prisma's internal private-field access would throw.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
