/** Substituted by `Bun.build`'s `define` in `scripts/build.ts`. */
declare const __SENTRY_DSN__: string
declare const __SENTRY_RELEASE__: string
declare const __SENTRY_ENVIRONMENT__: string

declare module "*.scss" {
  const content: string
  export default content
}

declare module "*.css" {
  const content: string
  export default content
}

declare module "*.svg" {
  import type { FC, SVGAttributes } from "react"
  const Component: FC<SVGAttributes<SVGSVGElement>>
  export default Component
}
