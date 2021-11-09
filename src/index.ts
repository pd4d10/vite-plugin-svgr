import fs from 'fs'
import { transformWithEsbuild, Plugin } from 'vite'

export default function svgrPlugin(): Plugin {
  // TODO: options
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg')) {
        // TODO: exclude node_modules as an option
        const { default: convert } = await import('@svgr/core')

        const svgCode = await fs.promises.readFile(id, 'utf8')
        let componentCode = await convert(
          svgCode,
          {},
          { componentName: 'ReactComponent' }
        )
        componentCode = componentCode.replace(
          'export default ReactComponent',
          'export { ReactComponent }'
        )

        const res = await transformWithEsbuild(
          componentCode + '\n' + code,
          id,
          { loader: 'jsx' }
        )

        return {
          code: res.code,
          map: null, // TODO:
        }
      }
    },
  }
}
