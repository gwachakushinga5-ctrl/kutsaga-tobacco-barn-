import { useEffect } from 'react'
import { Check, LockKeyhole, Snowflake, X } from 'lucide-react'
import { REJECTION_REASONS } from '../data/rejectionReasons'
import { GlassCard } from './ui/GlassCard'

export const RejectionTaxonomyDialog = ({ open, onClose, selectedCode, onSelectReason }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fade-in fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <GlassCard className="modal-in max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-300">
              <Snowflake size={17} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-100">
                Rejection taxonomy
              </h2>
              <p className="mt-0.5 text-[9.5px] text-slate-500">
                Select a frozen reason to apply it to the barn rejection you are reviewing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close taxonomy"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-700/80 bg-slate-900/50 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>

        <div className="kutsaga-scroll max-h-[calc(90vh-90px)] overflow-y-auto p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {REJECTION_REASONS.map((reason, index) => {
              const selected = selectedCode === reason.code
              return (
                <button
                  key={reason.code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectReason?.(reason.code)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition ${
                    selected
                      ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_20px_-8px_rgba(245,158,11,0.7)]'
                      : 'border-slate-800/80 bg-slate-950/35 hover:border-amber-500/40 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] text-slate-500">
                      {String(index + 1).padStart(2, '0')} · {reason.code}
                    </span>
                    {selected ? (
                      <Check size={10} className="text-amber-300" />
                    ) : (
                      <LockKeyhole size={9} className="text-amber-400/70" />
                    )}
                  </div>
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      selected ? 'text-amber-200' : 'text-slate-200'
                    }`}
                  >
                    {reason.label}
                  </p>
                  <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                    {reason.description}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.045] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[8.5px] text-amber-300/90">
              <Snowflake size={10} />
              Frozen by review policy · select a reason to apply it
            </span>
            <span className="font-mono text-[8px] text-slate-500">TAXONOMY v1.0</span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
