/// <reference types="bun" />

import tailwindPostCSSPlugin from "@tailwindcss/postcss"
import postcss from "postcss"
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

const PostCSSLoaderPlugin: Bun.BunPlugin = {
  name: "postcss-loader",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const processor = postcss([tailwindPostCSSPlugin])
      const css = await Bun.file(args.path).text()
      const result = await processor.process(css, { from: args.path })
      return {
        contents: result.css,
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
  plugins: [SCSSLoaderPlugin, PostCSSLoaderPlugin],
})
