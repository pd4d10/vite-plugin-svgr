import fs from 'fs'
import type { Config } from '@svgr/core'
import { transformWithEsbuild } from 'vite'
import type { Plugin } from 'vite'

type Options = {
  svgrOptions?: Config
}

export = function svgrPlugin(options: Options = {}): Plugin {
  const { svgrOptions = {} } = options

  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg')) {
        const { transform: convert } = await import('@svgr/core')

        const svgCode = await fs.promises.readFile(id, 'utf8')

        const componentCode = await convert(svgCode, svgrOptions, {
          componentName: 'ReactComponent',
        }).then((res) => {
          return res.replace(
            'export default ReactComponent',
            `export { ReactComponent }`
          )
        })

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
