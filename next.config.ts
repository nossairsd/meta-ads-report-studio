import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle with only the dependencies actually
  // reached, which is what lets the Docker runtime stage ship without
  // node_modules. Without it the image carries the full dependency tree.
  output: "standalone",
};

export default withNextIntl(nextConfig);
