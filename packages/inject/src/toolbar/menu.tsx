import { type ReactNode, useId, useRef } from "react"

export function MenuButton({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const id = useId()
  const popoverRef = useRef<HTMLUListElement>(null)

  const devToggleButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={devToggleButtonRef}
        onClick={() => {
          console.log("[dev] toggle menu", id, devToggleButtonRef.current)
        }}
        type="button"
        popoverTarget={id}
        popoverTargetAction="toggle"
        aria-haspopup="menu"
        aria-controls={id}
        className="px-2 py-1 text-sm hover:bg-zinc-700 rounded outline-none"
        style={{ anchorName: `--anchor-${id}` }}
      >
        {label}
      </button>

      <ul
        ref={popoverRef}
        id={id}
        popover="auto"
        aria-label={label}
        className="menu-panel m-0 p-1 rounded bg-zinc-800 shadow-xl"
        style={{ positionAnchor: `--anchor-${id}` }}
      >
        {children}
      </ul>
    </>
  )
}

interface SubMenuItemProps {
  label: string
  children: ReactNode
}
export function SubMenuItem({ label, children }: SubMenuItemProps) {
  const id = useId()
  const popoverRef = useRef<HTMLUListElement>(null)

  const handleMouseLeave = (e: React.MouseEvent<HTMLLIElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    popoverRef.current?.hidePopover()
  }

  return (
    <li
      role="none"
      onMouseEnter={() => popoverRef.current?.showPopover()}
      onMouseLeave={handleMouseLeave}
      style={{ anchorName: `--anchor-${id}` }}
    >
      <button
        type="button"
        popoverTarget={id}
        role="menuitem"
        aria-haspopup="menu"
        aria-controls={id}
        aria-expanded={false}
        className="w-full flex justify-between px-4 py-1.5 text-sm hover:bg-zinc-700"
      >
        {label} <span aria-hidden>›</span>
      </button>

      <ul
        ref={popoverRef}
        id={id}
        popover="auto"
        className="submenu-panel m-0 p-1 rounded bg-zinc-800 shadow-xl"
        style={{ positionAnchor: `--anchor-${id}` }}
      >
        {children}
      </ul>
    </li>
  )
}

interface MenuItemProps {
  label: string
  onClick?: () => void
}
export function MenuItem({ label, onClick }: MenuItemProps) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className="w-full px-4 py-1.5 text-sm text-left hover:bg-zinc-700"
        onClick={onClick}
      >
        {label}
      </button>
    </li>
  )
}
