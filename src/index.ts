import fs from 'fs'
import type {Plugin} from 'vite'
import type * as E from 'esbuild'

export interface Options {
  svgr?: {};
  svgrState?: {};
  esbuild?: {}
  defaultExport?: boolean;
};

export default function svgrPlugin(options?: Options): Plugin {
  return {
    name: 'vite:svgr',
    async transform(code: string, id: string) {
      if (id.endsWith('.svg')) {
        const svgr = require('@svgr/core').default
        const esbuild = require('esbuild') as typeof E

        const svg = await fs.promises.readFile(id, 'utf8')

        const componentCode = await svgr(
          svg,
          {...options?.svgr},
          {componentName: 'ReactComponent', ...options?.svgrState}
        ).then((res: string) => {
          return options?.defaultExport ? res : res.replace(
            /export default ([a-zA-Z0-9_$]+)/,
            `export { $1 }`
          );
        })

        const res = await esbuild.transform(componentCode + '\n' + code, {
          loader: 'jsx',
          ...options?.esbuild
        })
        return {
          code: res.code,
          map: null,
        }
      }
    },
  }
}
