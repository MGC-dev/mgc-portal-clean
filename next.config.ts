import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next.js uses this project directory as the workspace root for output file tracing
  outputFileTracingRoot: process.cwd(),
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // the project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
