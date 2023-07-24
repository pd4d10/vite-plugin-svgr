import { createFilter, FilterPattern } from "@rollup/pluginutils";
import type { Config } from "@svgr/core";
import fs from "fs";
import type { Plugin } from "vite";
import { transformWithEsbuild } from "vite";

export interface ViteSvgrOptions {
  /**
   * Export React component as default. Notice that it will overrides
   * the default behavior of Vite, which exports the URL as default
   *
   * @default false
   */
  exportAsDefault?: boolean;
  svgrOptions?: Config;
  esbuildOptions?: Parameters<typeof transformWithEsbuild>[2];
  exclude?: FilterPattern;
  include?: FilterPattern;
}

export default function viteSvgr({
  exportAsDefault,
  svgrOptions,
  esbuildOptions,
  include = "**/*.svg",
  exclude,
}: ViteSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  return {
    name: "vite-plugin-svgr",
    async transform(code, id) {
      if (filter(id)) {
        const { transform } = await import("@svgr/core");
        const { default: jsx } = await import("@svgr/plugin-jsx");

        const filePath = id.replace(postfixRE, "");
        const svgCode = await fs.promises.readFile(filePath, "utf8");

        const componentCode = await transform(svgCode, svgrOptions, {
          filePath,
          caller: {
            previousExport: exportAsDefault ? null : code,
            defaultPlugins: [jsx],
          },
        });

        const res = await transformWithEsbuild(componentCode, id, {
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
