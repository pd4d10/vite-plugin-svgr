// https://github.com/facebook/create-react-app/blob/0ee4765c39f820e5f4820abf4bf2e47b3324da7f/packages/react-scripts/lib/react-app.d.ts#L47-L56
// https://github.com/pd4d10/vite-plugin-svgr/pull/56 for preact compatiblility

declare module '*.svg' {
  import * as React from 'react'

  export const ReactComponent: React.FunctionComponent<
    React.ComponentProps<'svg'> & { title?: string }
  >
}
