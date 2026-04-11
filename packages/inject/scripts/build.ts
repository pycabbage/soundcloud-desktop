/// <reference types="bun" />

import { compileAsync } from "sass"

const isProd = Bun.env.NODE_ENV === "production"

/**
 * Bundle SCSS
 */
const SCSSLoaderPlugin: Bun.BunPlugin = {
  name: "scss-loader",
  setup(build) {
    build.onLoad({ filter: /\.scss$/ }, async (args) => {
      const { css } = await compileAsync(args.path, {
        style: isProd ? "compressed" : "expanded",
      })
      return {
        contents: css,
        loader: "text",
      }
    })
  },
}

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "browser",
  format: "iife",
  outdir: "./dist",
  minify: isProd,
  plugins: [SCSSLoaderPlugin],
})
