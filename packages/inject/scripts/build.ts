/// <reference types="bun" />

await Bun.build({
  entrypoints: ["./src/index.ts"],
  target: "browser",
  format: "iife",
  outdir: "./dist",
})
