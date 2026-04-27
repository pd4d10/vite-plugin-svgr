import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import type { Config } from "@svgr/core";
import fs from "node:fs";
import type {
  EsbuildTransformOptions,
  Plugin,
  transformWithOxc,
} from "vite";

type OxcTransformOptions = NonNullable<Parameters<typeof transformWithOxc>[2]>;

/**
 * Rolldown-native id filter shape. When set on the plugin, Rolldown evaluates
 * the filter in Rust before crossing into JS, eliminating per-module FFI
 * overhead in the `load` hook for non-matching ids.
 *
 * https://rolldown.rs/in-depth/why-plugin-hook-filter
 */
type RolldownIdFilter = {
  id?: RegExp | { include?: RegExp | RegExp[]; exclude?: RegExp | RegExp[] };
};

interface VitePluginSvgrOptions {
  svgrOptions?: Config;
  esbuildOptions?: EsbuildTransformOptions;
  oxcOptions?: OxcTransformOptions;
  exclude?: FilterPattern;
  include?: FilterPattern;
  /**
   * Opt-in Rolldown-native id filter applied to the `load` hook. When set,
   * Rolldown rejects non-matching ids in Rust before invoking the hook,
   * avoiding the JS↔Rust FFI crossing for every module load. Has no effect
   * under non-Rolldown bundlers (the legacy JS-side `include`/`exclude`
   * filter still applies).
   *
   * @example
   * vitePluginSvgr({ rolldownFilter: { id: /\.svg\?react(?:[?#&]|$)/ } })
   */
  rolldownFilter?: RolldownIdFilter;
}

export default function vitePluginSvgr({
  svgrOptions,
  esbuildOptions,
  oxcOptions,
  include = "**/*.svg?react",
  exclude,
  rolldownFilter,
}: VitePluginSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  const handler: Extract<NonNullable<Plugin["load"]>, (...args: any[]) => any> =
    async function (id) {
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
      const componentCode = await svgrTransform(svgCode, svgrOptions, {
        filePath,
        caller: {
          defaultPlugins: [jsx],
        },
      });
      const meta = (this as { meta?: { rolldownVersion?: string } } | undefined)
        ?.meta;

      if (meta?.rolldownVersion != null) {
        /* c8 ignore next */
        const { transformWithOxc } = await import("vite");
        const res = await transformWithOxc(componentCode, id, {
          lang: "jsx",
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
        ...esbuildOptions,
      });

      return {
        code: res.code,
        map: null, // TODO:
      };
    };

  return {
    name: "vite-plugin-svgr",
    enforce: "pre", // to override `vite:asset`'s behavior
    load: rolldownFilter
      ? ({ filter: rolldownFilter, handler } as Plugin["load"])
      : handler,
  };
}
