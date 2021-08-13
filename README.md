# vite-plugin-svgr

[![npm](https://img.shields.io/npm/v/vite-plugin-svgr.svg)](https://www.npmjs.com/package/vite-plugin-svgr)

Vite plugin to transform SVGs into React components. Uses [svgr](https://github.com/gregberge/svgr) under the hood.

## Usage

```js
// vite.config.js
import svgrPlugin from 'vite-plugin-svgr'

export default {
  // ...
  plugins: [
    svgrPlugin({
      svgr: {/* SVGR config */},
      svgrState: {/* SVGR state */},
      esbuild: {/* esbuild config */},
      defaultExport: false, // uses export default when true. See typescript section below
    })
  ],
}
```

Then SVG files can be imported as React components, just like [create-react-app](https://create-react-app.dev/docs/adding-images-fonts-and-files#adding-svgs) does:

```js
import { ReactComponent as Logo } from './logo.svg'
```

### TypeScript

Add `vite-plugin-svgr/client` (or `vite-plugin/client-default` if using `options.defaultExport`) to [`compilerOptions.types`](https://www.typescriptlang.org/tsconfig#types) in `tsconfig.json`:

```json
{
  // ...
  "compilerOptions": {
    // ...
    "types": ["vite-plugin-svgr/client"]
  }
}
```

## License

MIT
