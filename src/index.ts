import fs from 'fs'
import type { Plugin } from 'vite'
import type * as E from 'esbuild'

interface svgrPluginOpts {
  defaultExport?: 'url' | 'component'
}

export = function svgrPlugin(opts?: svgrPluginOpts): Plugin {
  // TODO: options
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg')) {
        const svgr = require('@svgr/core').default
        const esbuild = require('esbuild') as typeof E

        const svg = await fs.promises.readFile(id, 'utf8')

        const componentCode = await svgr(
          svg,
          {},
          { componentName: 'ReactComponent' }
        )
        if (opts?.defaultExport === 'component') {
          const res = await esbuild.transform(componentCode, {
            loader: 'jsx',
          })

          return {
            code: res.code,
            // map: res.map, // TODO:
          }
        } else {
          const res = await esbuild.transform(
            componentCode.replace(
              'export default ReactComponent',
              `export { ReactComponent }`
            ) +
              '\n' +
              code,
            {
              loader: 'jsx',
            }
          )

          return {
            code: res.code,
            // map: res.map, // TODO:
          }
        }
      }
    },
  }
}
