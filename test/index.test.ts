import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { Plugin } from "vite";

import vitePluginSvgr from "../src/index.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pluginEntryUrl = new URL("../src/index.ts", import.meta.url).href;
const tscCliPath = path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js");

let packageBuildEnsured = false;

type LoadHook = Extract<NonNullable<Plugin["load"]>, (...args: any[]) => any>;
type LoadContext = ThisParameterType<LoadHook>;
type LoadHookResult = Awaited<ReturnType<LoadHook>>;
type TransformResult = Extract<NonNullable<LoadHookResult>, { code: string }>;

function getLoadHook(plugin: Plugin): LoadHook {
  const load = plugin.load;

  assert.ok(load, "Expected plugin.load to be defined");

  return typeof load === "function" ? load : load.handler;
}

async function runLoad(
  plugin: Plugin,
  id: string,
  context?: Omit<Partial<LoadContext>, "meta"> & {
    meta?: Partial<LoadContext["meta"]> & { rolldownVersion?: string };
  },
): Promise<LoadHookResult | undefined> {
  return await getLoadHook(plugin).call(context as LoadContext, id);
}

function expectTransformResult(
  result: LoadHookResult | undefined,
): TransformResult {
  assert.ok(result && typeof result === "object" && "code" in result);

  return result;
}

function inspectSvgrResolutions(
  action: "createPlugin" | "nonMatchingLoad" | "matchingLoad",
) {
  const script = `
    import { mkdtemp, rm, writeFile } from "node:fs/promises";
    import os from "node:os";
    import path from "node:path";

    const seen = new Set();
    const { registerHooks } = await import("node:module");

    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier.startsWith("@svgr/")) {
          seen.add(specifier);
        }

        return nextResolve(specifier, context);
      },
    });

    const { default: vitePluginSvgr } = await import(${JSON.stringify(pluginEntryUrl)});
    const plugin = vitePluginSvgr();

    if (${JSON.stringify(action)} === "nonMatchingLoad") {
      await plugin.load?.("/tmp/not-an-svg.txt");
    }

    if (${JSON.stringify(action)} === "matchingLoad") {
      const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
      const filePath = path.join(tempDir, "logo.svg");

      try {
        await writeFile(filePath, '<svg viewBox="0 0 1 1"><path d="M0 0h1v1H0z" /></svg>');
        await plugin.load?.(\`\${filePath}?react\`);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    }

    console.log(JSON.stringify([...seen].sort()));
  `;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);

  return JSON.parse(result.stdout.trim()) as string[];
}

function ensurePackageBuilt() {
  if (packageBuildEnsured) {
    return;
  }

  const result = spawnSync("pnpm", ["build"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  packageBuildEnsured = true;
}

async function withLinkedPackage(
  run: (cwd: string) => Promise<void>,
) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-consumer-"));
  const nodeModulesDir = path.join(tempDir, "node_modules");
  const linkedPackageDir = path.join(nodeModulesDir, "vite-plugin-svgr");

  await mkdir(nodeModulesDir, { recursive: true });
  await symlink(repoRoot, linkedPackageDir, "dir");

  try {
    await run(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

test("vitePluginSvgr exposes a pre plugin and only transforms matching ids", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
  const includedFile = path.join(tempDir, "logo.svg");
  const excludedFile = path.join(tempDir, "blocked.svg");

  try {
    await writeFile(
      includedFile,
      '<svg viewBox="0 0 16 16"><path d="M0 0h16v16H0z" /></svg>',
    );
    await writeFile(
      excludedFile,
      '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" /></svg>',
    );

    const plugin = vitePluginSvgr({
      exclude: "**/blocked.svg?react",
    });

    assert.equal(plugin.name, "vite-plugin-svgr");
    assert.equal(plugin.enforce, "pre");
    assert.equal(await runLoad(plugin, `${includedFile}`), undefined);
    assert.equal(await runLoad(plugin, `${excludedFile}?react`), undefined);

    const transformed = expectTransformResult(
      await runLoad(plugin, `${includedFile}?react`),
    );
    assert.equal(transformed.map, null);
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /(React\.createElement|_jsx)\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("vitePluginSvgr lazy-loads SVGR only for matching SVG requests", () => {
  assert.deepEqual(inspectSvgrResolutions("createPlugin"), []);
  assert.deepEqual(inspectSvgrResolutions("nonMatchingLoad"), []);

  const seen = inspectSvgrResolutions("matchingLoad");

  assert.ok(seen.includes("@svgr/core"));
  assert.ok(seen.includes("@svgr/plugin-jsx"));
});

test("vitePluginSvgr respects a custom include pattern", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
  const filePath = path.join(tempDir, "logo.svg");

  try {
    await writeFile(filePath, '<svg viewBox="0 0 8 8"><path d="M0 0h8v8H0z" /></svg>');

    const plugin = vitePluginSvgr({
      include: "**/*.svg?component",
    });

    assert.equal(await runLoad(plugin, `${filePath}?react`), undefined);

    const transformed = expectTransformResult(
      await runLoad(plugin, `${filePath}?component`),
    );
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /(React\.createElement|_jsx)\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("vitePluginSvgr passes SVGR and esbuild options through the esbuild transform", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
  const filePath = path.join(tempDir, "logo.svg");

  try {
    await writeFile(
      filePath,
      '<svg viewBox="0 0 4 4"><path d="M0 0h4v4H0z" /></svg>',
    );

    const plugin = vitePluginSvgr({
      svgrOptions: { icon: true },
      esbuildOptions: { jsxFactory: "h" },
    });

    const transformed = expectTransformResult(
      await runLoad(plugin, `${filePath}?react`),
    );
    assert.equal(transformed.map, null);
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /h\(/);
    assert.match(transformed.code, /width: "1em"/);
    assert.match(transformed.code, /height: "1em"/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("vitePluginSvgr passes Oxc options through the rolldown transform", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
  const filePath = path.join(tempDir, "logo.svg");

  try {
    await writeFile(
      filePath,
      '<svg viewBox="0 0 4 4"><path d="M0 0h4v4H0z" /></svg>',
    );

    const plugin = vitePluginSvgr({
      oxcOptions: {
        jsx: {
          runtime: "classic",
          pragma: "h",
        },
      },
    });

    const transformed = expectTransformResult(
      await runLoad(plugin, `${filePath}?react`, {
        meta: { rolldownVersion: "1.0.0" },
      }),
    );

    assert.equal(transformed.map, null);
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /h\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("CommonJS require returns the plugin function", async () => {
  ensurePackageBuilt();

  await withLinkedPackage(async (cwd) => {
    const script = `
      const vitePluginSvgr = require("vite-plugin-svgr");

      if (typeof vitePluginSvgr !== "function") {
        throw new Error(\`Expected require("vite-plugin-svgr") to return a function, got \${typeof vitePluginSvgr}\`);
      }

      const plugin = vitePluginSvgr();

      if (plugin.name !== "vite-plugin-svgr") {
        throw new Error(\`Expected plugin name to be "vite-plugin-svgr", got \${plugin.name}\`);
      }
    `;
    const result = spawnSync(
      process.execPath,
      ["--input-type=commonjs", "--eval", script],
      {
        cwd,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test("CommonJS TypeScript consumers can use the package without .default", async () => {
  ensurePackageBuilt();

  await withLinkedPackage(async (cwd) => {
    const entryPath = path.join(cwd, "index.cts");

    await writeFile(
      entryPath,
      [
        'import vitePluginSvgr = require("vite-plugin-svgr");',
        "",
        "const plugin = vitePluginSvgr();",
        'const options: Parameters<typeof vitePluginSvgr>[0] = { include: "**/*.svg?react" };',
        "",
        'if (plugin.name !== "vite-plugin-svgr") {',
        '  throw new Error("unexpected plugin name");',
        "}",
        "",
        "void options;",
      ].join("\n"),
    );

    const result = spawnSync(
      process.execPath,
      [
        tscCliPath,
        "--pretty",
        "false",
        "--noEmit",
        "--skipLibCheck",
        "--module",
        "Node16",
        "--moduleResolution",
        "node16",
        "--target",
        "ES2022",
        "index.cts",
      ],
      {
        cwd,
        encoding: "utf8",
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});
