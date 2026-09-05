import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // next-intl's navigation helpers import "next/navigation" from inside
        // node_modules. Left external, Vitest neither resolves that specifier
        // nor applies our vi.mock to it, so the module must be inlined.
        inline: ["next-intl"],
      },
    },
  },
});