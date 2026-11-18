export const RangeSlider = ({
  id,
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  valueLabel,
  showBounds = false,
}) => {
  const numericValue = Number(value)
  const percent = ((numericValue - min) / (max - min)) * 100
  const display = valueLabel ?? numericValue.toFixed(2)

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[9.5px] font-semibold uppercase tracking-[0.17em] text-slate-400"
        >
          {label}
        </label>
        <span className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-medium text-cyan-300">
          {display}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="kutsaga-range mt-2"
        style={{ '--range-progress': `${percent}%` }}
      />
      {showBounds ? (
        <div className="mt-0.5 flex justify-between font-mono text-[9px] text-slate-600">
          <span>{min.toFixed(2)}</span>
          <span>{max.toFixed(2)}</span>
        </div>
      ) : null}
    </div>
  )
}
