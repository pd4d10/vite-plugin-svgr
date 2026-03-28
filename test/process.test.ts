import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

import vitePluginSvgr from "../src/index.ts";

const fixtureRoot = fileURLToPath(new URL("./fixtures/basic", import.meta.url));
const reactStubPath = path.join(fixtureRoot, "react-stub.js");
const reactJsxRuntimeStubPath = path.join(fixtureRoot, "react-jsx-runtime-stub.js");

async function withServer(
  pluginOptions: Parameters<typeof vitePluginSvgr>[0],
  run: (server: Awaited<ReturnType<typeof createServer>>) => Promise<void>,
) {
  const server = await createServer({
    root: fixtureRoot,
    logLevel: "silent",
    resolve: {
      alias: [
        { find: "react/jsx-runtime", replacement: reactJsxRuntimeStubPath },
        { find: "react/jsx-dev-runtime", replacement: reactJsxRuntimeStubPath },
        { find: "react", replacement: reactStubPath },
      ],
    },
    plugins: [vitePluginSvgr(pluginOptions)],
  });

  try {
    await run(server);
  } finally {
    await server.close();
  }
}

test("vite transforms an svg request into a React component module", async () => {
  await withServer({}, async (server) => {
    const importer = await server.transformRequest("/main.jsx");
    const transformedSvg = await server.transformRequest("/logo.svg?react");

    assert.ok(importer);
    assert.match(importer.code, /logo\.svg\?/);
    assert.match(importer.code, /react/);

    assert.ok(transformedSvg);
    assert.match(transformedSvg.code, /(import \* as React from|react\/jsx-runtime)/);
    assert.match(transformedSvg.code, /(React\.createElement|_jsx)\(/);
    assert.match(transformedSvg.code, /viewBox: "0 0 10 10"/);
    assert.match(transformedSvg.code, /export default/);
  });
});

test("vite respects a custom include query in the full transform flow", async () => {
  await withServer({ include: "**/*.svg?component" }, async (server) => {
    const transformedSvg = await server.transformRequest("/logo.svg?component");

    assert.ok(transformedSvg);
    assert.match(transformedSvg.code, /(import \* as React from|react\/jsx-runtime)/);
    assert.match(transformedSvg.code, /(React\.createElement|_jsx)\(/);
    assert.match(transformedSvg.code, /export default/);
  });
});
