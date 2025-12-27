import { createFilter, FilterPattern } from "@rollup/pluginutils";
import type { Config } from "@svgr/core";
import fs from "fs";
import type { Plugin } from "vite";
import { transformWithEsbuild } from "vite";
import * as viteModule from "vite";

// @ts-ignore - check if transformWithOxc is available, i.e. rolldown-vite is installed and aliased
let useOxc = viteModule.transformWithOxc != null;
// @ts-ignore - assign transformer function
let transformWith: typeof transformWithEsbuild = useOxc
  ? viteModule.transformWithOxc
  : transformWithEsbuild;

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

  let config: any;

  return {
    name: "vite-plugin-svgr",
    enforce: "pre", // to override `vite:asset`'s behavior
    // NEW: Get resolved Vite config
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async load(id) {
      if (filter(id)) {
        const { transform } = await import("@svgr/core");
        const { default: jsx } = await import("@svgr/plugin-jsx");

        const filePath = id.replace(postfixRE, "");
        // NEW: Use Vite's path resolution if needed
        if (filePath.startsWith("/") && config) {
          const path = await import("path");
          const publicPath = path.join(config.root, config.publicDir, filePath);
          try {
            await fs.promises.access(publicPath);
          } catch {
            // not found in public, use normal filePath
          }
        }
        const svgCode = await fs.promises.readFile(filePath, "utf8");

        const componentCode = await transform(svgCode, svgrOptions, {
          filePath,
          caller: {
            defaultPlugins: [jsx],
          },
        });

        const res = await transformWith(
          componentCode,
          id,
          useOxc
            ? {
                // @ts-ignore - "lang" is required for transformWithOxc
                lang: "jsx",
                ...esbuildOptions,
              }
            : {
                loader: "jsx",
                ...esbuildOptions,
              }
        );

        return {
          code: res.code,
          map: null, // TODO:
        };
      }
    },
  };
}
