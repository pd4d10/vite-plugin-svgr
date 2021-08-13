import {join} from 'path';
import svgr from '.';
describe('svgr plugin', () => {
	it('should work with no configs', async () => {
		expect(
await svgr().transform(
'// some code here',
join(__dirname, 'test.svg'))).
toMatchInlineSnapshot(`
Object {
  "code": "import * as React from \\"react\\";
function ReactComponent(props) {
  return /* @__PURE__ */ React.createElement(\\"svg\\", {
    xmlns: \\"http://www.w3.org/2000/svg\\",
    ...props
  }, /* @__PURE__ */ React.createElement(\\"text\\", null, \\"SVG\\"));
}
export { ReactComponent };
",
  "map": null,
}
`)
	})
})
