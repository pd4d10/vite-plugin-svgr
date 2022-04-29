import fs from 'fs'
import type { Config } from '@svgr/core'
import { transformWithEsbuild } from 'vite'
import type { Plugin } from 'vite'

type Options = {
  svgrOptions?: Config
  esbuildOptions?: Parameters<typeof transformWithEsbuild>[2]
  exportComponentAsDefault?: boolean
}

export = function svgrPlugin({
  svgrOptions,
  esbuildOptions,
  exportComponentAsDefault,
}: Options = {}): Plugin {
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg')) {
        const { transform: convert } = await import('@svgr/core')

        const svgCode = await fs.promises.readFile(id, 'utf8')

        const componentCode = await convert(svgCode, svgrOptions, {
          componentName: 'ReactComponent',
          filePath: id,
        }).then((res) => {
          if (!exportComponentAsDefault)
            return res.replace(
              'export default ReactComponent',
              `export { ReactComponent }`
            )
          return res
        })

        const res = await transformWithEsbuild(
          exportComponentAsDefault
            ? componentCode
            : `${componentCode}\n${code}`,
          id,
          { loader: 'jsx', ...esbuildOptions }
        )

        return {
          code: res.code,
          map: null, // TODO:
        }
      }
    },
  }
}
