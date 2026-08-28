/// <reference types="bun" />

import { transform } from "@svgr/core"
import tailwindPostCSSPlugin from "@tailwindcss/postcss"
import postcss from "postcss"
import { compileAsync } from "sass"

import pkg from "../package.json"

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
  // Emits the `sourceMappingURL` comment and a content-derived `debugId`.
  sourcemap: "linked",
  // Names the eval'd bundle so its stack frames carry a filename.
  footer: "//# sourceURL=app:///inject/index.js",
  define: {
    // Public ingest key, not a secret. Also in src-tauri/src/telemetry.rs.
    __SENTRY_DSN__: JSON.stringify(
      "https://f78ee57daddf5e3c3bfc83dee8abff2b@o4504452056875008.ingest.us.sentry.io/4511989617983488"
    ),
    // Must equal what the Rust SDK reports: `CARGO_PKG_NAME@CARGO_PKG_VERSION`.
    __SENTRY_RELEASE__: JSON.stringify(`soundcloud-desktop@${pkg.version}`),
    __SENTRY_ENVIRONMENT__: JSON.stringify(isProd ? "production" : "development"),
  },
  plugins: [SCSSLoaderPlugin, PostCSSLoaderPlugin, SVGComponentPlugin],
})
