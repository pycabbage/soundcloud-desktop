import { panic } from "./utils"
import { getModule, getWebpackRequire } from "./webpack"

// ── SoundCloud App Version ────────────────────────────────────────────────
// サーバーが HTML 内のインライン <script> で注入する window.__sc_version を読む。
// 例: "1774492604"（Unix エポックベースのビルドタイムスタンプ）

declare global {
  interface Window {
    __sc_version?: string
  }
}

export function getSoundCloudVersion(): string {
  return window.__sc_version ?? panic("window.__sc_version is not set")
}

// ── Backbone Version ──────────────────────────────────────────────────────
// レガシー SPA（webpackJsonp）の 1-76ec11d8.js チャンクに含まれる。
// emulateHTTP / emulateJSON は Backbone 固有プロパティで、Underscore と区別可能。

interface BackboneExports {
  VERSION: string
  noConflict: () => BackboneExports
  emulateHTTP: boolean
  emulateJSON: boolean
}

export function getBackboneVersion(): string {
  const backbone = getModule(
    ["VERSION", "noConflict", "emulateHTTP", "emulateJSON"],
    false,
    getWebpackRequire()
  ) as BackboneExports | undefined
  return backbone?.VERSION ?? panic("Could not find Backbone module")
}

// ── React Version ─────────────────────────────────────────────────────────
// React はレガシー SPA には存在しない。
// Next.js webi iframe（/n/pages/standby）の webpackChunk_N_E ランタイムにのみ存在する。
// __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED は React 固有の識別子。
//
// 注意: HAR 解析では .version の semver 文字列が直接確認できなかったが、
// React 17 以降はすべて version プロパティをエクスポートする仕様のため、
// フィンガープリントに "version" を含めることで存在を保証する。

interface ReactExports {
  version: string
  createElement: (...args: unknown[]) => unknown
  // biome-ignore lint/suspicious/noExplicitAny: React internal type is opaque
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: any
}

export function getReactVersion(): string {
  // webpackRequire 省略 → getFrameWebpackRequire()（iframe 側）がデフォルト
  const react = getModule([
    "version",
    "createElement",
    "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
  ]) as ReactExports | undefined
  return react?.version ?? panic("Could not find React module")
}
