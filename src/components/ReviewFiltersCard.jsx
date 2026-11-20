import { LockKeyhole, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { REVIEW_BANDS, STATUS_META, STATUS_ORDER, TRB_STATES } from '../lib/constants'
import { GlassCard } from './ui/GlassCard'
import { RangeSlider } from './ui/RangeSlider'
import { SectionHeader } from './ui/SectionHeader'
import { ToggleRow } from './ui/ToggleRow'

const SelectField = ({ id, label, value, onChange, children }) => (
  <div>
    <label
      htmlFor={id}
      className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-500"
    >
      {label}
    </label>
    <div className="relative mt-1">
      <select id={id} value={value} onChange={onChange} className="kutsaga-select">
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  </div>
)

export const ReviewFiltersCard = ({
  statusFilter,
  onStatusChange,
  trbFilter,
  onTrbChange,
  bandFilter,
  onBandChange,
  minPriority,
  onMinPriorityChange,
  bboxEnabled,
  onBboxChange,
  onReset,
  onOpenTaxonomy,
}) => (
  <GlassCard className="shrink-0 p-4">
    <SectionHeader
      icon={SlidersHorizontal}
      title="Review filters"
      uppercase
      right={
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] px-1.5 py-1 font-mono text-[8px] font-semibold tracking-[0.13em] text-cyan-300 transition hover:border-cyan-400/45 hover:bg-cyan-400/10"
        >
          <RotateCcw size={9} />
          RESET
        </button>
      }
    />

    <div className="mt-3 space-y-2.5">
      <SelectField
        id="review-status"
        label="Review status"
        value={statusFilter}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="all">All statuses</option>
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="trb-match"
        label="TRB match"
        value={trbFilter}
        onChange={(event) => onTrbChange(event.target.value)}
      >
        <option value="all">All TRB states</option>
        {TRB_STATES.map((state) => (
          <option key={state.value} value={state.value}>
            {state.label}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="review-band"
        label="Review band"
        value={bandFilter}
        onChange={(event) => onBandChange(event.target.value)}
      >
        <option value="all">All bands</option>
        {REVIEW_BANDS.map((band) => (
          <option key={band.value} value={band.value}>
            {band.label}
          </option>
        ))}
      </SelectField>
    </div>

    <div className="mt-4">
      <RangeSlider
        id="min-priority"
        label="Min priority score"
        value={minPriority}
        min={0}
        max={1}
        step={0.01}
        onChange={onMinPriorityChange}
      />
    </div>

    <div className="mt-2 rounded-lg border border-slate-800/80 bg-slate-950/25 py-1">
      <ToggleRow
        label="Spatial prefilter · map view"
        checked={bboxEnabled}
        onChange={onBboxChange}
        dotClass="bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
      />
    </div>

    <div className="mt-4 border-t border-slate-800/80 pt-2.5">
      <button
        type="button"
        onClick={onOpenTaxonomy}
        className="flex w-full items-start gap-2 rounded-md px-0.5 py-0.5 text-left text-[8.5px] leading-relaxed text-slate-500 transition hover:text-slate-300"
      >
        <LockKeyhole size={10} className="mt-0.5 shrink-0 text-amber-400/70" />
        <span>
          <span className="font-semibold text-slate-400">8 frozen rejection reasons</span>{' '}
          available in the taxonomy dialog.
        </span>
      </button>
    </div>
  </GlassCard>
)
