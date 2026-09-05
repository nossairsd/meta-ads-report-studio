import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: [
      // next-auth imports the bare specifier "next/server". The next package
      // publishes no `exports` map for it, and Node's ESM resolver will not
      // guess the extension, so the import fails under Vitest even though it
      // resolves fine inside the Next build. Point it at the real file.
      { find: /^next\/server$/, replacement: "next/server.js" },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // next-intl's navigation helpers import "next/navigation" from inside
        // node_modules. Left external, Vitest neither resolves that specifier
        // nor applies our vi.mock to it, so the module must be inlined.
        // next-auth is inlined for a second reason: externalised, Node
        // resolves its imports itself and the alias above never gets a
        // chance to fix "next/server".
        inline: ["next-intl", "next-auth", "@auth/core"],
      },
    },
  },
});