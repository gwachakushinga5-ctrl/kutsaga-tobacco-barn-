import { useEffect, useRef, useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { BASEMAPS } from '../lib/constants'

export const BasemapSwitcher = ({ basemap, onChange }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const active = BASEMAPS.find((item) => item.id === basemap) ?? BASEMAPS[0]

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleSelect = (id) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change basemap"
        className="glass-card flex items-center gap-2 px-2.5 py-2 text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200"
      >
        <Layers size={13} className="text-cyan-400/80" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">Basemap</span>
        <span className="max-w-[96px] truncate rounded border border-slate-700/70 bg-slate-900/70 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">
          {active.shortLabel}
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Basemap"
          className="glass-card absolute right-0 top-full mt-2 w-56 overflow-hidden p-1.5"
        >
          <p className="px-2 pb-1 pt-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Map imagery
          </p>
          {BASEMAPS.map((option) => {
            const selected = option.id === basemap
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(option.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition ${
                  selected
                    ? 'bg-cyan-400/10 text-cyan-200'
                    : 'text-slate-300 hover:bg-white/[0.045] hover:text-slate-100'
                }`}
              >
                <span className="grid h-3.5 w-3.5 shrink-0 place-items-center">
                  {selected ? <Check size={12} className="text-cyan-300" /> : null}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
