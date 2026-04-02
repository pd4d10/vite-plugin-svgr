import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import { transform as svgrTransform, type Config } from "@svgr/core";
import jsx from "@svgr/plugin-jsx";
import fs from "node:fs";
import type {
  EsbuildTransformOptions,
  Plugin,
  transformWithOxc,
} from "vite";

type OxcTransformOptions = NonNullable<Parameters<typeof transformWithOxc>[2]>;

export interface VitePluginSvgrOptions {
  svgrOptions?: Config;
  esbuildOptions?: EsbuildTransformOptions;
  oxcOptions?: OxcTransformOptions;
  exclude?: FilterPattern;
  include?: FilterPattern;
}

export default function vitePluginSvgr({
  svgrOptions,
  esbuildOptions,
  oxcOptions,
  include = "**/*.svg?react",
  exclude,
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
      const componentCode = await svgrTransform(svgCode, svgrOptions, {
        filePath,
        caller: {
          defaultPlugins: [jsx],
        },
      });
      const meta = (this as { meta?: { rolldownVersion?: string } } | undefined)?.meta;

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
    },
  };
}
