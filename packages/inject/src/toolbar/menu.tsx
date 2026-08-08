import { type MouseEventHandler, type ReactNode, useId, useRef, useTransition } from "react"

import { cn } from "../utils/cn"

interface MenuButtonProps {
  label: string
  children: ReactNode
}
export function MenuButton({ label, children }: MenuButtonProps) {
  const id = useId()

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        popoverTargetAction="toggle"
        aria-haspopup="menu"
        aria-controls={id}
        className={cn(
          "px-2 py-1 text-sm rounded outline-none region-no-drag",
          "text-primary-light dark:text-primary-dark",
          "hover:bg-highlight-light dark:hover:bg-highlight-dark"
        )}
        style={{ anchorName: `--anchor-${id}` }}
      >
        {label}
      </button>

      <ul
        id={id}
        popover="auto"
        aria-label={label}
        className={cn(
          "absolute inset-auto m-0 p-1 rounded shadow-xl",
          "min-w-40",
          "[transition:display_150ms]",
          "transition-discrete",
          "top-[anchor(bottom)] left-[anchor(left)]",
          "text-primary-light dark:text-primary-dark",
          "bg-background-surface-light dark:bg-background-surface-dark"
        )}
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

  const handleMouseLeave: MouseEventHandler<HTMLLIElement> = (e) => {
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
        className={cn(
          "w-full flex justify-between px-4 py-1.5 text-sm",
          "text-primary-light dark:text-primary-dark",
          "hover:bg-highlight-light dark:hover:bg-highlight-dark"
        )}
      >
        {label} <span aria-hidden>›</span>
      </button>

      <ul
        ref={popoverRef}
        id={id}
        popover="auto"
        className={cn(
          "absolute inset-auto m-0 p-1 rounded shadow-xl",
          "min-w-40 top-[anchor(top)] left-[anchor(right)]",
          "bg-background-surface-light dark:bg-background-surface-dark",
          "text-primary-light dark:text-primary-dark"
        )}
        style={{ positionAnchor: `--anchor-${id}` }}
      >
        {children}
      </ul>
    </li>
  )
}

function closePopovers<E extends HTMLElement>(target: E) {
  const closestPopover = target.closest<E>("[popover]")
  closestPopover?.hidePopover()

  if (closestPopover?.parentElement) {
    closePopovers(closestPopover.parentElement)
  }
}

interface MenuItemProps {
  label: string
  onClick?: () => void | Promise<void>
}
export function MenuItem({ label, onClick }: MenuItemProps) {
  const [isBusy, startTransition] = useTransition()

  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className={cn(
          "w-full px-4 py-1.5 text-sm text-left",
          "bg-background-surface-light dark:bg-background-surface-dark",
          "hover:bg-highlight-light dark:hover:bg-highlight-dark"
        )}
        aria-busy={isBusy}
        onClick={async (e) => {
          startTransition(async () => {
            await onClick?.()
          })
          closePopovers(e.currentTarget)
        }}
      >
        {label}
      </button>
    </li>
  )
}

interface CheckboxMenuItemProps {
  label: string
  checked: boolean
  onChange: () => void | Promise<void>
}
export function CheckboxMenuItem({ label, checked, onChange }: CheckboxMenuItemProps) {
  const [isBusy, startTransition] = useTransition()

  return (
    <li role="none">
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        aria-busy={isBusy}
        className={cn(
          "w-full px-4 py-1.5 text-sm text-left flex items-center gap-2",
          "bg-background-surface-light dark:bg-background-surface-dark",
          "hover:bg-highlight-light dark:hover:bg-highlight-dark"
        )}
        onClick={() => {
          startTransition(async () => {
            await onChange()
          })
        }}
      >
        <span className="w-4 shrink-0 text-center" aria-hidden>
          {checked ? "✓" : ""}
        </span>
        {label}
      </button>
    </li>
  )
}
