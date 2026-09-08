import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";

/**
 * Applies Prisma migrations over Neon's HTTP driver.
 *
 * `prisma migrate deploy` opens a raw PostgreSQL connection on port 5432.
 * Behind a corporate proxy that inspects outbound traffic, the TCP handshake
 * succeeds but the connection is reset the moment the PostgreSQL protocol
 * starts — so the CLI cannot reach the database at all. Neon's serverless
 * driver speaks the same protocol over HTTPS on 443, which the proxy allows.
 *
 * This applies pending migrations and writes the same `_prisma_migrations`
 * bookkeeping rows the CLI would, so migration history stays valid and
 * `prisma migrate` keeps working from any unrestricted network.
 *
 * Usage: node scripts/db-migrate.mjs
 */

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Fill it in .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
)`;

const done = new Set(
  (await sql`SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`)
    .map((row) => row.migration_name)
);

// Migration directories are timestamp-prefixed, so lexical order is
// chronological order.
const pending = readdirSync("prisma/migrations", { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !done.has(entry.name))
  .map((entry) => entry.name)
  .sort();

if (pending.length === 0) {
  console.log("No pending migrations.");
  process.exit(0);
}

for (const name of pending) {
  const script = readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");

  // The generated scripts contain no functions or dollar-quoted bodies, so
  // splitting on a statement-terminating semicolon is safe. Anything hand-
  // written with a procedure body would need a real parser.
  //
  // Leading comment lines are stripped rather than used to reject a chunk:
  // every generated statement is preceded by one ("-- CreateTable"), so
  // discarding whatever starts with "--" would silently drop them all.
  const statements = script
    .split(/;\s*$/m)
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((statement) => statement.length > 0);

  let applied = 0;
  try {
    for (const statement of statements) {
      // sql`` is a tagged template for parameterised queries; a whole DDL
      // statement built as a string has to go through sql.query.
      await sql.query(statement);
      applied++;
    }
  } catch (error) {
    console.error(`\nMigration ${name} failed at statement ${applied + 1}:`);
    console.error(error.message);
    // Deliberately not recorded as applied: a partially applied migration
    // must not look complete to the next run.
    process.exit(1);
  }

  await sql`INSERT INTO "_prisma_migrations"
    (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
    VALUES (${randomUUID()}, ${createHash("sha256").update(script).digest("hex")},
            now(), ${name}, now(), ${applied})`;

  console.log(`Applied ${name} (${applied} statements)`);
}
