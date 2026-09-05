import { handlers } from "@/lib/auth/config";

// Auth.js mounts its whole flow — sign-in, the OAuth callback, sign-out,
// session — under this one catch-all route.
export const { GET, POST } = handlers;

// The adapter and the token exchange both use Node APIs (crypto, pg), so this
// cannot run on the edge runtime.
export const runtime = "nodejs";
