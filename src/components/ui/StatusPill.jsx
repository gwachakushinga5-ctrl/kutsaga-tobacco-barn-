import { STATUS_META } from '../../lib/constants'

export const StatusPill = ({ status, label, className = '' }) => {
  const meta = STATUS_META[status]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] ${meta.pillClass} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {label ?? meta.label}
    </span>
  )
}
