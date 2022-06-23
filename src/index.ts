import fs from 'fs'
import type { Config } from '@svgr/core'
import { transformWithEsbuild } from 'vite'
import type { Plugin } from 'vite'
import { createFilter, FilterPattern } from '@rollup/pluginutils'

export interface ViteSvgrOptions {
  /**
   * Export React component as default. Notice that it will overrides
   * the default behavior of Vite, which exports the URL as default
   *
   * @default false
   */
  exportAsDefault?: boolean
  svgrOptions?: Config
  esbuildOptions?: Parameters<typeof transformWithEsbuild>[2]
  exclude?: FilterPattern
  include?: FilterPattern
}

export default function viteSvgr({
  exportAsDefault,
  svgrOptions,
  esbuildOptions,
  include = '**/*.svg',
  exclude,
}: ViteSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude)
  return {
    name: 'vite-plugin-svgr',
    async transform(code, id) {
      if (filter(id)) {
        const { transform } = await import('@svgr/core')
        const svgCode = await fs.promises.readFile(id, 'utf8')

        const componentCode = await transform(svgCode, svgrOptions, {
          filePath: id,
          caller: {
            previousExport: exportAsDefault ? null : code,
          },
        })

        const res = await transformWithEsbuild(componentCode, id, {
          loader: 'jsx',
          ...esbuildOptions,
        })

        return {
          code: res.code,
          map: null, // TODO:
        }
      }
    },
  }
}
