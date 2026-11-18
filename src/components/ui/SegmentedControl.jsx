export const SegmentedControl = ({
  options,
  value,
  onChange,
  variant = 'fill',
  ariaLabel,
  className = '',
}) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={`flex gap-1 rounded-lg border border-slate-800/90 bg-slate-950/65 p-1 ${className}`}
  >
    {options.map((option) => {
      const active = option.value === value
      const activeClass =
        variant === 'outline'
          ? 'border-cyan-400/55 bg-cyan-400/10 text-cyan-300 shadow-[0_0_14px_-6px_rgba(34,211,238,0.75)]'
          : 'border-cyan-400/40 bg-cyan-500 text-slate-950 shadow-[0_0_16px_-5px_rgba(34,211,238,0.8)]'
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md border px-2.5 py-1.5 text-[10px] font-semibold transition ${
            active
              ? activeClass
              : 'border-transparent text-slate-400 hover:bg-white/[0.035] hover:text-slate-200'
          }`}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)
