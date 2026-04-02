import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import type { Config } from "@svgr/core";
import fs from "node:fs";
import type {
  EsbuildTransformOptions,
  Plugin,
  transformWithOxc,
} from "vite";

type OxcTransformOptions = NonNullable<Parameters<typeof transformWithOxc>[2]>;

interface VitePluginSvgrOptions {
  svgrOptions?: Config;
  esbuildOptions?: EsbuildTransformOptions;
  oxcOptions?: OxcTransformOptions;
  exclude?: FilterPattern;
  include?: FilterPattern;
  jsxRuntime?: "classic" | "automatic";
}

export default function vitePluginSvgr({
  svgrOptions,
  esbuildOptions,
  oxcOptions,
  include = "**/*.svg?react",
  exclude,
  jsxRuntime,
}: VitePluginSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  return {
    name: "vite-plugin-svgr",
    enforce: "pre", // to override `vite:asset`'s behavior
    async load(id) {
      if (!filter(id)) {
        return;
      }

      const filePath = id.replace(postfixRE, "");
      const svgCode = await fs.promises.readFile(filePath, "utf8");
      // `tsx` injects an import-interop helper here during tests, which adds
      // an unreachable branch to coverage for these ESM-only modules.
      /* c8 ignore next 2 */
      const { transform: svgrTransform } = await import("@svgr/core");
      const { default: jsx } = await import("@svgr/plugin-jsx");
      const componentCode = await svgrTransform(
        svgCode,
        {
          jsxRuntime,
          ...svgrOptions,
        },
        {
          filePath,
          caller: {
            defaultPlugins: [jsx],
          },
        },
      );
      const meta = (this as { meta?: { rolldownVersion?: string } } | undefined)
        ?.meta;

      if (meta?.rolldownVersion != null) {
        /* c8 ignore next */
        const { transformWithOxc } = await import("vite");
        const res = await transformWithOxc(componentCode, id, {
          lang: "jsx",
          jsx: { runtime: jsxRuntime },
          ...oxcOptions,
        });

        return {
          code: res.code,
          map: null, // TODO:
        };
      }

      /* c8 ignore next */
      const { transformWithEsbuild } = await import("vite");
      const res = await transformWithEsbuild(componentCode, id, {
        loader: "jsx",
        ...(jsxRuntime === "automatic" ? { jsx: "automatic" } : {}),
        ...esbuildOptions,
      });

      return {
        code: res.code,
        map: null, // TODO:
      };
    },
  };
}
