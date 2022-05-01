# vite-plugin-svgr

[![npm](https://img.shields.io/npm/v/vite-plugin-svgr.svg)](https://www.npmjs.com/package/vite-plugin-svgr)

Vite plugin to transform SVGs into React components. Uses [svgr](https://github.com/gregberge/svgr) under the hood.

## Usage

```js
// vite.config.js
import svgr from 'vite-plugin-svgr'

export default {
  // ...
  plugins: [svgr()],
}
```

Then SVG files can be imported as React components, just like [create-react-app](https://create-react-app.dev/docs/adding-images-fonts-and-files#adding-svgs) does:

```js
import { ReactComponent as Logo } from './logo.svg'
```

If you are using TypeScript, there is also a declaration helper for better type inference:

```ts
/// <reference types="vite-plugin-svgr/client" />
```

### Options

```js
svgr({
  svgrOptions: {
    // svgr options: https://react-svgr.com/docs/options/
  },
  esbuildOptions: {
    // esbuild options, to transform jsx to js
  },
})
```

## License

MIT
