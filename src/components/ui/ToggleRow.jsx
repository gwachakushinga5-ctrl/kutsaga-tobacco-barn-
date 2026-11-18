export const ToggleRow = ({ label, checked, onChange, shortcut, dotClass }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/[0.035]"
  >
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
          checked
            ? dotClass || 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            : 'bg-slate-600'
        }`}
      />
      <span className="truncate text-[11px] text-slate-300 group-hover:text-slate-100">
        {label}
      </span>
      {shortcut ? (
        <kbd className="rounded border border-slate-700 bg-slate-900/80 px-1 py-0.5 font-mono text-[8.5px] leading-none text-slate-400">
          {shortcut}
        </kbd>
      ) : null}
    </span>
    <span
      className={`shrink-0 font-mono text-[8.5px] font-semibold tracking-[0.12em] ${
        checked ? 'text-emerald-300' : 'text-slate-500'
      }`}
    >
      {checked ? 'ON' : 'OFF'}
    </span>
  </button>
)
