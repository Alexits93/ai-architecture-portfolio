// Types `.astro` imports for `tsc --noEmit`, which `typecheck` runs for the TS5101 diagnostics astro check omits.
declare module '*.astro' {
  type AstroComponentFactory = import('astro/runtime/server/index.js').AstroComponentFactory;
  const component: AstroComponentFactory;
  export default component;
}
