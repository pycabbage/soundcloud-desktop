//
/* oxlint-disable typescript/consistent-type-assertions */

import { panic } from "./utils"

interface WebpackWindowProxy extends WindowProxy {
  webpackChunk_N_E: unknown[][]
}
interface WebpackIFrameElement extends HTMLIFrameElement {
  contentWindow: WebpackWindowProxy | null
}

function getFrame() {
  return (
    document.querySelector<WebpackIFrameElement>('iframe[src*="/n/pages/standby"]') ||
    panic("Could not find the standby iframe")
  )
}

interface WebpackRequireFeatures {
  c?: unknown
  m: Record<number, unknown>
}
type WebpackRequire = (<R = unknown>(id: string | number) => R) & WebpackRequireFeatures

function getFrameWebpackRequire(): WebpackRequire {
  const frame = getFrame()
  const id = `webpackModulesget_${Date.now()}`
  const state: { webpackRequire: WebpackRequire | null } = { webpackRequire: null }
  frame.contentWindow?.webpackChunk_N_E.push([
    [Symbol(id)],
    {},
    (req: WebpackRequire) => {
      state.webpackRequire = req
    },
  ])
  frame.contentWindow?.webpackChunk_N_E.pop()
  if (!state.webpackRequire) {
    panic("Could not get webpack require function")
  }
  return state.webpackRequire
}

interface CustomArray<T> extends Omit<Array<T>, "push"> {
  push(item: T): unknown
}
declare global {
  var webpackJsonp: CustomArray<
    [
      number[],
      {
        [key: string]: (
          module: { exports: unknown },
          exports: unknown,
          internalRequire: WebpackRequire
        ) => void
      },
      number[][],
    ]
  >
}

export function getWebpackRequire() {
  const id = Date.now()
  const webpackRequire = globalThis.webpackJsonp.push([
    [id],
    {
      [id]: (module, _exports, internalRequire) => {
        module.exports = internalRequire
      },
    },
    [[id]],
  ] as const)
  globalThis.webpackJsonp.pop()
  return webpackRequire as WebpackRequire
}

export function getAllModules(webpackRequire?: WebpackRequire) {
  if (!webpackRequire) webpackRequire = getFrameWebpackRequire()
  if (webpackRequire?.c) return webpackRequire.c
  const { m: modules } = webpackRequire
  return Object.fromEntries(
    Object.keys(modules).map((k) => {
      try {
        return [k, webpackRequire(k)]
      } catch {
        return [k, undefined]
      }
    })
  )
}

interface IModule {
  exports?: IModule
  __esModule?: true
  default?: IModule
  Z?: IModule
  ZP?: IModule
  A?: IModule
}

function getExports(mod: IModule, recursionLimit = 5) {
  if (!mod) return
  else if (mod?.exports && recursionLimit >= 0) return getExports(mod.exports, recursionLimit - 1)
  else if (mod.A) return mod.A
  else if (mod.Z) return mod.Z
  else if (mod.ZP) return mod.ZP
  else if (mod.__esModule && mod.default) return mod.default
  else return mod
}

export function getModule(member: string[], getAll = false, webpackRequire?: WebpackRequire) {
  if (!webpackRequire) webpackRequire = getFrameWebpackRequire()
  const modules = getAllModules(webpackRequire)
  const moduleKeys = Object.keys(modules)
  const moduleKey = moduleKeys[getAll ? "filter" : "find"]((key) => {
    const mod = modules[key as keyof typeof modules] as IModule
    const exports = getExports(mod)
    // Function exports (e.g. classes with static members like Sound.resolve)
    // are valid matches too, so accept any non-null export here.
    if (!exports) return false
    return member.every((m) => m in (exports as object))
  })
  return getAll
    ? (moduleKey as string[] | undefined)?.map((k) =>
        getExports(modules?.[k as keyof typeof modules])
      )
    : getExports(modules?.[moduleKey as keyof typeof modules])
}
