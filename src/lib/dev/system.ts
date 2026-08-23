/**
 * Runtime, hosting and build information for the Dev Console overview.
 * Server-only: reads process state and platform env vars.
 */

import manifest from "@/lib/dev/manifest.generated.json";

export type HostingInfo = {
  provider: string;
  environment: string | null;
  region: string | null;
  url: string | null;
  deploymentId: string | null;
};

/** Best-effort detection of where this instance is running. */
export function detectHosting(): HostingInfo {
  const env = process.env;

  if (env.VERCEL) {
    return {
      provider: "Vercel",
      environment: env.VERCEL_ENV ?? null,
      region: env.VERCEL_REGION ?? null,
      url: env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : env.VERCEL_URL
        ? `https://${env.VERCEL_URL}`
        : null,
      deploymentId: env.VERCEL_DEPLOYMENT_ID ?? null,
    };
  }

  if (env.NETLIFY) {
    return {
      provider: "Netlify",
      environment: env.CONTEXT ?? null,
      region: env.AWS_REGION ?? null,
      url: env.URL ?? null,
      deploymentId: env.DEPLOY_ID ?? null,
    };
  }

  if (env.RENDER) {
    return {
      provider: "Render",
      environment: env.RENDER_SERVICE_TYPE ?? null,
      region: env.RENDER_REGION ?? null,
      url: env.RENDER_EXTERNAL_URL ?? null,
      deploymentId: env.RENDER_GIT_COMMIT ?? null,
    };
  }

  if (env.FLY_APP_NAME) {
    return {
      provider: "Fly.io",
      environment: env.FLY_APP_NAME,
      region: env.FLY_REGION ?? null,
      url: `https://${env.FLY_APP_NAME}.fly.dev`,
      deploymentId: env.FLY_MACHINE_ID ?? null,
    };
  }

  if (env.RAILWAY_ENVIRONMENT) {
    return {
      provider: "Railway",
      environment: env.RAILWAY_ENVIRONMENT,
      region: env.RAILWAY_REGION ?? null,
      url: env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : null,
      deploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
    };
  }

  return {
    provider:
      process.env.NODE_ENV === "development" ? "Local (next dev)" : "Self-hosted / unknown",
    environment: process.env.NODE_ENV ?? null,
    region: null,
    url: null,
    deploymentId: null,
  };
}

function nextVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("next/package.json").version;
  } catch {
    return manifest.dependencies.find((d) => d.name === "next")?.range ?? "unknown";
  }
}

export function getSystemInfo() {
  const memory = typeof process.memoryUsage === "function" ? process.memoryUsage() : null;

  return {
    app: manifest.app,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
    versions: {
      next: nextVersion(),
      node: process.version,
      react: manifest.dependencies.find((d) => d.name === "react")?.range ?? "unknown",
      typescript:
        manifest.devDependencies.find((d) => d.name === "typescript")?.range ?? "unknown",
    },
    platform: `${process.platform}/${process.arch}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    serverTime: new Date().toISOString(),
    // Time since this serverless instance/process started — not site uptime.
    processUptimeSeconds: Math.round(process.uptime()),
    memory: memory
      ? {
          rssMb: +(memory.rss / 1024 / 1024).toFixed(1),
          heapUsedMb: +(memory.heapUsed / 1024 / 1024).toFixed(1),
          heapTotalMb: +(memory.heapTotal / 1024 / 1024).toFixed(1),
        }
      : null,
    hosting: detectHosting(),
    build: {
      ...manifest.build,
      generatedAt: manifest.generatedAt,
    },
    git: {
      ...manifest.git,
      // Platform git vars win at runtime — the build machine is the source of truth.
      runtimeCommit:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.RENDER_GIT_COMMIT ??
        process.env.COMMIT_REF ??
        null,
      runtimeBranch:
        process.env.VERCEL_GIT_COMMIT_REF ?? process.env.BRANCH ?? null,
      runtimeMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    },
    counts: manifest.counts,
  };
}

export type SystemInfo = ReturnType<typeof getSystemInfo>;
