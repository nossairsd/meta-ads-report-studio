import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // A self-contained server bundle carrying only the dependencies actually
  // reached — what lets the Docker runtime stage ship without node_modules.
  //
  // Opt-in, set by the Dockerfile, because it is not how every host builds:
  // standalone output relocates the trace files, and Vercel's build step then
  // fails with ENOENT on `.next/next-server.js.nft.json` after compiling
  // perfectly well.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
};

export default withNextIntl(nextConfig);
