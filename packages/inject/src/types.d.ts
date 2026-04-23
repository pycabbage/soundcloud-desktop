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
