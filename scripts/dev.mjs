import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";

/**
 * Starts `next dev`, having first applied NODE_EXTRA_CA_CERTS if one is
 * configured.
 *
 * On a network that inspects TLS — a corporate proxy such as Zscaler or
 * Netskope — every outbound HTTPS call from Node is presented a certificate
 * signed by the proxy's own root, which Node does not trust. The visible
 * symptom is narrow and misleading: the browser reaches Facebook and consent
 * succeeds, then the *server-side* exchange of the authorization code fails
 * with SELF_SIGNED_CERT_IN_CHAIN and the sign-in silently comes back with no
 * session.
 *
 * NODE_EXTRA_CA_CERTS is read by Node once at startup, before any application
 * code runs, so it cannot be set from within Next.js — hence this wrapper.
 * The path lives in .env.local rather than in this file: it is specific to one
 * machine and has no business in the repository. On an ordinary network
 * nothing is set and this is a plain `next dev`.
 */

config({ path: ".env.local", quiet: true });

const caBundle = process.env.NODE_EXTRA_CA_CERTS;

if (caBundle) {
  if (existsSync(caBundle)) {
    console.log(`Using extra CA bundle: ${caBundle}`);
  } else {
    console.warn(
      `NODE_EXTRA_CA_CERTS points at a file that does not exist: ${caBundle}\n` +
        "Outbound HTTPS from the server may fail behind a TLS-inspecting proxy."
    );
  }
}

// Next is launched by running its CLI entry point with the current Node
// binary, rather than the `next` wrapper in node_modules/.bin. A shell would
// concatenate arguments instead of escaping them (Node's DEP0190), and
// spawning the Windows .cmd shim without one is refused outright since Node 20
// closed a command-injection hole around exactly that. Going straight to the
// JavaScript entry point sidesteps both.
const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, ...(caBundle ? { NODE_EXTRA_CA_CERTS: caBundle } : {}) },
});

child.on("error", (error) => {
  console.error(`Could not start Next: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
