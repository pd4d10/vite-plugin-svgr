import fs from 'fs'
import type { Config } from '@svgr/core'
import { transformWithEsbuild } from 'vite'
import type { Plugin } from 'vite'

type Options = {
  svgrOptions?: Config
  esbuildOptions?: Parameters<typeof transformWithEsbuild>[2]
  localStyle?: boolean
}

export = function svgrPlugin({
  svgrOptions,
  esbuildOptions,
  localStyle
}: Options = {}): Plugin {
  return {
    name: 'vite:svgr',
    async transform(code, id) {
      if (id.endsWith('.svg')) {
        const { transform: convert } = await import('@svgr/core')

        let svgCode = await fs.promises.readFile(id, 'utf8')

        if (localStyle) {
          const regex = new RegExp(/[>|\}]\s*\.([^\{]+)\{/gm)
          let match: RegExpExecArray | null; 
          let classMap : Record<string, string>= {};
          while ((match = regex.exec(svgCode)) !== null) {
            let classes = match[1].split(".")
            classes = classes.map(c => c.replace(",",""))
            classes.forEach(c => {
              let uid = Math.random().toString(16).substr(2);
              classMap[c] = uid;
            })
          }
          let keys = Object.keys(classMap);
          keys.forEach(key => {
            svgCode = svgCode.replace(new RegExp(key, "g"), `__svg__${classMap[key]}`)
          })
        }
        
        const componentCode = await convert(svgCode, svgrOptions, {
          componentName: 'ReactComponent',
          filePath: id,
        }).then((res) => {
          return res.replace(
            'export default ReactComponent',
            `export { ReactComponent }`
          )
        })

        const res = await transformWithEsbuild(
          componentCode + '\n' + code,
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
