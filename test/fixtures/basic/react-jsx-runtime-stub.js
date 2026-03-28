export const Fragment = Symbol.for("react.fragment");

export function jsx(type, props) {
  return { type, props };
}

export const jsxs = jsx;
export const jsxDEV = jsx;
