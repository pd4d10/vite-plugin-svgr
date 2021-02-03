# vite-plugin-svgr

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
import { ReactComponent as Logo } from './logo.svg';
```

## License

MIT
