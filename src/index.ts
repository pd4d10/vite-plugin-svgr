import { createFilter, FilterPattern } from "@rollup/pluginutils";
import type { Config } from "@svgr/core";
import fs from "fs";
import type { Plugin } from "vite";
import { transformWithEsbuild } from "vite";
import * as viteModule from "vite";

// @ts-ignore - check if transformWithOxc is available, i.e. rolldown-vite is installed and aliased
let useOxc = viteModule.transformWithOxc != null;
// @ts-ignore - assign transformer function
let transformWith: typeof transformWithEsbuild = useOxc ? viteModule.transformWithOxc : transformWithEsbuild;

export interface VitePluginSvgrOptions {
  svgrOptions?: Config;
  esbuildOptions?: Parameters<typeof transformWithEsbuild>[2];
  exclude?: FilterPattern;
  include?: FilterPattern;
}

export default function vitePluginSvgr({
  svgrOptions,
  esbuildOptions,
  include = "**/*.svg?react",
  exclude,
}: VitePluginSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  return {
    name: "vite-plugin-svgr",
    enforce: "pre", // to override `vite:asset`'s behavior
    async load(id) {
      if (filter(id)) {
        const { transform } = await import("@svgr/core");
        const { default: jsx } = await import("@svgr/plugin-jsx");

        const filePath = id.replace(postfixRE, "");
        const svgCode = await fs.promises.readFile(filePath, "utf8");

        const componentCode = await transform(svgCode, svgrOptions, {
          filePath,
          caller: {
            defaultPlugins: [jsx],
          },
        });

        const res = await transformWith(componentCode, id, useOxc ? {
          // @ts-ignore - "lang" is required for transformWithOxc
          lang: "jsx",
          ...esbuildOptions,
        } : {
          loader: "jsx",
          ...esbuildOptions,
        });

        return {
          code: res.code,
          map: null, // TODO:
        };
      }
    },
  };
}
