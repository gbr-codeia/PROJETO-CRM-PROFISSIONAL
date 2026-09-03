import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to this project so Next never walks up to an
  // unrelated parent lockfile (harmless on Vercel, fixes local multi-lockfile).
  outputFileTracingRoot: projectRoot,
  eslint: {
    // Backend-focused stage: don't block builds on lint.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
