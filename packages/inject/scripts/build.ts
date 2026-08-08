/// <reference types="bun" />

import { transform } from "@svgr/core"
import tailwindPostCSSPlugin from "@tailwindcss/postcss"
import postcss from "postcss"
import { compileAsync } from "sass"

const isProd = Bun.env.NODE_ENV === "production"

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

const SVGComponentPlugin: Bun.BunPlugin = {
  name: "svg-component",
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async ({ path }) => {
      const svg = await Bun.file(path).text()
      const name =
        path
          .split(/[/\\]/)
          .pop()
          ?.replace(/\.svg$/, "") ?? "SvgComponent"
      const componentName = name.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())
      const contents = transform.sync(
        svg,
        {
          plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
          icon: true,
          dimensions: false,
          jsxRuntime: "automatic",
        },
        { componentName }
      )
      return { contents, loader: "jsx" }
    })
  },
}

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "browser",
  format: "iife",
  outdir: "./dist",
  minify: isProd,
  plugins: [SCSSLoaderPlugin, PostCSSLoaderPlugin, SVGComponentPlugin],
})
