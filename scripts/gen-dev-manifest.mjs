#!/usr/bin/env node
/**
 * Generates src/lib/dev/manifest.generated.json — the static half of the Dev
 * Console (route inventory, dependency list, build/git metadata).
 *
 * Runs automatically via `predev` / `prebuild`, so the manifest is rebuilt from
 * the actual source tree on every dev start and every production build rather
 * than drifting. Bundled as JSON so it works on serverless runtimes where the
 * source tree is not readable at request time.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(root, "src", "app");
const outFile = join(root, "src", "lib", "dev", "manifest.generated.json");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

// ─── Route inventory ────────────────────────────────────────────────────────
const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
const ROUTE_FILES = new Set(["route.ts", "route.tsx", "route.js"]);

/** Directory path → Next.js URL path (drops (groups), keeps [params]). */
function toUrlPath(dirRelative) {
  const segments = dirRelative
    .split("/")
    .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
  return "/" + segments.join("/");
}

function readMethods(filePath) {
  const src = readFileSync(filePath, "utf8");
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  return methods.filter((m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src)
  );
}

const pages = [];
const apis = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    const relDir = relative(appDir, dir).split("\\").join("/");
    const url = toUrlPath(relDir);
    const sourcePath = relative(root, full).split("\\").join("/");

    if (PAGE_FILES.has(entry)) {
      pages.push({ path: url === "" ? "/" : url, source: sourcePath });
    } else if (ROUTE_FILES.has(entry)) {
      apis.push({ path: url, source: sourcePath, methods: readMethods(full) });
    }
  }
}

walk(appDir);
pages.sort((a, b) => a.path.localeCompare(b.path));
apis.sort((a, b) => a.path.localeCompare(b.path));

// ─── Dependencies ───────────────────────────────────────────────────────────
function depList(record = {}) {
  return Object.entries(record)
    .map(([name, range]) => ({ name, range }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Git / build metadata ───────────────────────────────────────────────────
function git(cmd, fallback = null) {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  app: { name: pkg.name, version: pkg.version },
  git: {
    commit: git("rev-parse HEAD"),
    shortCommit: git("rev-parse --short HEAD"),
    branch: git("rev-parse --abbrev-ref HEAD"),
    subject: git("log -1 --pretty=%s"),
    committedAt: git("log -1 --pretty=%cI"),
    dirty: git("status --porcelain") ? true : false,
  },
  build: {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
  },
  scripts: pkg.scripts ?? {},
  dependencies: depList(pkg.dependencies),
  devDependencies: depList(pkg.devDependencies),
  routes: { pages, apis },
  counts: {
    pages: pages.length,
    apis: apis.length,
    apiHandlers: apis.reduce((n, a) => n + a.methods.length, 0),
    dependencies: Object.keys(pkg.dependencies ?? {}).length,
    devDependencies: Object.keys(pkg.devDependencies ?? {}).length,
  },
};

writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `[dev-manifest] ${pages.length} pages, ${apis.length} API routes → ${relative(root, outFile)}`
);
