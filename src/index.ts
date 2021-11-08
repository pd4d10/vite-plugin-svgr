import fs from 'fs'
import { transformWithEsbuild, Plugin } from 'vite'

export = function svgrPlugin(): Plugin {
  // TODO: options
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg') && !id.includes('node_modules')) {
        const svgr = require('@svgr/core').default

        const svgCode = await fs.promises.readFile(id, 'utf8')
        const componentCode = await svgr(
          svgCode,
          {},
          { componentName: 'ReactComponent' }
        )
        code =
          code +
          '\n' +
          componentCode.replace(
            'export default ReactComponent',
            'export { ReactComponent }'
          )

        const res = await transformWithEsbuild(code, id, { loader: 'jsx' })

        return {
          code: res.code,
          map: null, // TODO:
        }
      }
    },
  }
}
