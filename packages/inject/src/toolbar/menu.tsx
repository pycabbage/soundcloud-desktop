import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { usePortalRoot } from "./usePortalRoot"

type Pos = { x: number; y: number }

interface MenuBarCtx {
  activeId: string | null
  activate: (id: string) => void
  deactivate: () => void
}
const MenuBarContext = createContext<MenuBarCtx>({
  activeId: null,
  activate: () => {},
  deactivate: () => {},
})

interface MenuCtx {
  portalRoot: Element
  activeSubId: string | null
  activateSub: (id: string) => void
  deactivateSub: () => void
  closeAll: () => void
}
const MenuContext = createContext<MenuCtx | null>(null)

const useMenu = () => {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error("useMenu must be inside MenuList")
  return ctx
}

function MenuList({
  pos,
  portalRoot,
  onClose,
  children,
  hasBackdrop = false,
}: {
  pos: Pos
  portalRoot: Element
  onClose: () => void
  children: ReactNode
  hasBackdrop?: boolean
}) {
  const [activeSubId, setActiveSubId] = useState<string | null>(null)

  return (
    <>
      {/* top-levelのみbackdropを持つ。クリックで全閉じ */}
      {hasBackdrop && (
        <button
          className="fixed inset-0 z-9998"
          onClick={onClose}
          type="button"
        />
      )}
      <MenuContext.Provider
        value={{
          portalRoot,
          activeSubId,
          activateSub: setActiveSubId,
          deactivateSub: () => setActiveSubId(null),
          closeAll: onClose,
        }}
      >
        <ul
          className="fixed z-9999 min-w-36 rounded bg-zinc-800 py-1 shadow-xl ring-1 ring-white/10"
          style={{ left: pos.x, top: pos.y }}
        >
          {children}
        </ul>
      </MenuContext.Provider>
    </>
  )
}

export function MenuBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  return (
    <MenuBarContext.Provider
      value={{
        activeId,
        activate: setActiveId,
        deactivate: () => setActiveId(null),
      }}
    >
      <nav className={className}>{children}</nav>
    </MenuBarContext.Provider>
  )
}

export function MenuButton({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const id = useId()
  const { activeId, activate, deactivate } = useContext(MenuBarContext)
  const isOpen = activeId === id
  const ref = useRef<HTMLButtonElement>(null)
  const portalRoot = usePortalRoot()
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })

  const toggle = () => {
    if (isOpen) {
      deactivate()
      return
    }
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPos({ x: rect.left, y: rect.bottom })
    activate(id)
  }

  return (
    <>
      <button
        ref={ref}
        onClick={toggle}
        className="px-2 py-1 text-sm hover:bg-zinc-700 rounded"
        type="button"
      >
        {label}
      </button>
      {isOpen &&
        createPortal(
          <MenuList
            pos={pos}
            portalRoot={portalRoot}
            onClose={deactivate}
            hasBackdrop
          >
            {children}
          </MenuList>,
          portalRoot
        )}
    </>
  )
}

export function MenuItem({
  label,
  onClick,
}: {
  label: string
  onClick?: () => void
}) {
  const { deactivateSub, closeAll } = useMenu()
  const handlePress = () => {
    onClick?.()
    closeAll()
  }

  return (
    <li
      className="cursor-pointer px-4 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
      onMouseEnter={deactivateSub}
      onClick={handlePress}
      onKeyDown={({ key }) => {
        if (key === "Enter") handlePress()
      }}
    >
      {label}
    </li>
  )
}

export function SubMenuItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const id = useId()
  const { activeSubId, activateSub, portalRoot, closeAll } = useMenu()
  const isOpen = activeSubId === id
  const ref = useRef<HTMLLIElement>(null)
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })

  const handleMouseEnter = () => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPos({ x: rect.right, y: rect.top })
    activateSub(id)
  }

  return (
    <>
      <li
        ref={ref}
        className="flex cursor-pointer items-center justify-between px-4 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        onMouseEnter={handleMouseEnter}
      >
        {label}
        <span className="ml-4 text-zinc-400">›</span>
      </li>
      {isOpen &&
        createPortal(
          <MenuList pos={pos} portalRoot={portalRoot} onClose={closeAll}>
            {children}
          </MenuList>,
          portalRoot
        )}
    </>
  )
}
