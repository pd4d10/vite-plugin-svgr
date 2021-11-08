import fs from 'fs'
import type { Plugin } from 'vite'
import type * as E from 'esbuild'

export = function svgrPlugin(): Plugin {
  // TODO: options
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg') && !id.includes('node_modules')) {
        const svgr = require('@svgr/core').default
        const esbuild = require('esbuild') as typeof E

        const svg = await fs.promises.readFile(id, 'utf8')

        const componentCode = await svgr(
          svg,
          {},
          { componentName: 'ReactComponent' }
        ).then((res: string) => {
          return res.replace(
            'export default ReactComponent',
            `export { ReactComponent }`
          )
        })

        const res = await esbuild.transform(componentCode + '\n' + code, {
          loader: 'jsx',
        })

        return {
          code: res.code,
          map: null, // TODO:
        }
      }
    },
  }
}
