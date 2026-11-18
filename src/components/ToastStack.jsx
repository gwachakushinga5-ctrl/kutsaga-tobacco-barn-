import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const toastStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/25',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-red-300',
    borderClass: 'border-red-500/30',
  },
  info: {
    icon: Info,
    iconClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/25',
  },
}

export const ToastStack = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[2200] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.type] || toastStyles.info
        const Icon = style.icon
        return (
          <div
            key={toast.id}
            className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border ${style.borderClass} bg-[#0f172a]/95 px-3 py-2.5 shadow-2xl backdrop-blur-md`}
          >
            <Icon size={14} className={`mt-0.5 shrink-0 ${style.iconClass}`} />
            <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-slate-300">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="grid h-4 w-4 shrink-0 place-items-center rounded text-slate-600 transition hover:text-slate-300"
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
