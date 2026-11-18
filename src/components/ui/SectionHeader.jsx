export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  right,
  uppercase = false,
  compact = false,
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-2.5">
      {Icon ? (
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
          <Icon size={compact ? 12 : 14} strokeWidth={2} />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2
          className={`text-[12px] font-semibold leading-tight text-slate-100 ${
            uppercase ? 'uppercase tracking-[0.18em]' : 'tracking-[0.015em]'
          }`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
    {right}
  </div>
)
