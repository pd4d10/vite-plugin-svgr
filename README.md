# vite-plugin-svgr

[![npm](https://img.shields.io/npm/v/vite-plugin-svgr.svg)](https://www.npmjs.com/package/vite-plugin-svgr)

Vite plugin to transform SVGs into React components. Uses [svgr](https://github.com/gregberge/svgr) under the hood.

## Usage

```js
// vite.config.js
import svgr from "vite-plugin-svgr";

export default {
  // ...
  plugins: [svgr()],
};
```

Then SVG files can be imported as React components, just like [create-react-app](https://create-react-app.dev/docs/adding-images-fonts-and-files#adding-svgs) does:

```js
import { ReactComponent as Logo } from "./logo.svg";
```

If you are using TypeScript, there is also a declaration helper for better type inference:

```ts
/// <reference types="vite-plugin-svgr/client" />
```

### Options

```js
svgr({
  // Set it to `true` to export React component as default.
  // Notice that it will override the default behavior of Vite.
  exportAsDefault: false,

  // svgr options: https://react-svgr.com/docs/options/
  svgrOptions: {
    // ...
  },

  // esbuild options, to transform jsx to js
  esbuildOptions: {
    // ...
  },

  //  A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should include. By default all svg files will be included.
  include: "**/*.svg",

  //  A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should ignore. By default no files are ignored.
  exclude: "",
});
```

## License

MIT
