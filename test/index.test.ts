import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import vitePluginSvgr from "../src/index.ts";

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
    assert.equal(await plugin.load?.(`${includedFile}`), undefined);
    assert.equal(await plugin.load?.(`${excludedFile}?react`), undefined);

    const transformed = await plugin.load?.(`${includedFile}?react`);

    assert.equal(typeof transformed, "object");
    assert.ok(transformed);
    assert.equal(transformed.map, null);
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /(React\.createElement|_jsx)\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("vitePluginSvgr respects a custom include pattern", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vite-plugin-svgr-"));
  const filePath = path.join(tempDir, "logo.svg");

  try {
    await writeFile(filePath, '<svg viewBox="0 0 8 8"><path d="M0 0h8v8H0z" /></svg>');

    const plugin = vitePluginSvgr({
      include: "**/*.svg?component",
    });

    assert.equal(await plugin.load?.(`${filePath}?react`), undefined);

    const transformed = await plugin.load?.(`${filePath}?component`);

    assert.equal(typeof transformed, "object");
    assert.ok(transformed);
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

    const transformed = await plugin.load?.(`${filePath}?react`);

    assert.equal(typeof transformed, "object");
    assert.ok(transformed);
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

    const transformed = await plugin.load?.call(
      { meta: { rolldownVersion: "1.0.0" } },
      `${filePath}?react`,
    );

    assert.equal(typeof transformed, "object");
    assert.ok(transformed);
    assert.equal(transformed.map, null);
    assert.match(transformed.code, /export default/);
    assert.match(transformed.code, /h\(/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
