import {
  Crosshair,
  Loader2,
  MapPin,
  Maximize2,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { ZONES } from '../lib/constants'
import { formatArea } from '../lib/geo'
import { GlassCard } from './ui/GlassCard'
import { RangeSlider } from './ui/RangeSlider'
import { SectionHeader } from './ui/SectionHeader'
import { ToggleRow } from './ui/ToggleRow'

export const ScanSectorCard = ({
  zoneId,
  onZoneChange,
  onCurrentSector,
  onDrawAoi,
  drawing,
  confidence,
  onConfidenceChange,
  onRun,
  onClear,
  running,
  aoi,
  geminiLocate,
  onGeminiLocateChange,
}) => {
  const selectedZone = ZONES.find((zone) => zone.id === zoneId)
  const hasSelection = Boolean(selectedZone || aoi)
  const selectionLabel = aoi?.label ?? selectedZone?.name
  const selectionMeta = aoi?.area ? `${formatArea(aoi.area)} AOI` : 'Zone bounds'

  return (
    <GlassCard className="shrink-0 p-4">
      <SectionHeader
        icon={Crosshair}
        title="Scan sector"
        subtitle="AI discovers - you audit. Pick a zone or scan the current view."
      />

      <div className="mt-4">
        <label
          htmlFor="tobacco-zone"
          className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500"
        >
          Tobacco zone
        </label>
        <div className="relative mt-1.5">
          <select
            id="tobacco-zone"
            value={zoneId}
            onChange={(event) => onZoneChange(event.target.value)}
            className="kutsaga-select"
          >
            <option value="">Select a tobacco zone...</option>
            {ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
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

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCurrentSector}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-950/40 px-2 py-2 text-[10px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900/70 hover:text-slate-100"
        >
          <Maximize2 size={11} />
          Current sector
        </button>
        <button
          type="button"
          onClick={onDrawAoi}
          aria-pressed={drawing}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[10px] font-medium transition ${
            drawing
              ? 'border-teal-300/75 bg-teal-400/15 text-teal-100 shadow-[0_0_20px_-6px_rgba(20,184,166,0.8)]'
              : 'border-teal-500/35 bg-teal-400/[0.055] text-teal-300 hover:border-teal-400/65 hover:bg-teal-400/10'
          }`}
        >
          <Pencil size={11} />
          {drawing ? 'Drawing…' : 'Draw AOI'}
        </button>
      </div>

      <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
        {drawing
          ? 'Click to place corners, then double-click or press Enter to close the polygon.'
          : 'Select a zone, use the current viewport, or draw three or more corners.'}
      </p>

      {hasSelection ? (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-teal-500/20 bg-teal-400/[0.045] px-2.5 py-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[9.5px] text-teal-200">
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{selectionLabel}</span>
          </span>
          <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.1em] text-teal-400/90">
            {selectionMeta}
          </span>
        </div>
      ) : null}

      <div className="mt-3.5">
        <RangeSlider
          id="confidence-threshold"
          label="Confidence threshold"
          value={confidence}
          min={0.1}
          max={0.95}
          step={0.01}
          onChange={onConfidenceChange}
        />
      </div>

      <div className="mt-2.5 rounded-lg border border-emerald-500/15 bg-emerald-400/[0.035] px-1.5 py-1">
        <ToggleRow
          label="Gemini locate barns"
          checked={Boolean(geminiLocate)}
          onChange={onGeminiLocateChange}
          dotClass="bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
        />
      </div>
      <p className="mt-1.5 text-[8.5px] leading-relaxed text-slate-600">
        Also scans the sector imagery with Gemini and boxes each barn it finds.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-400 to-emerald-400 px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_10px_26px_-12px_rgba(34,211,238,0.95)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {running ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
          {running ? 'Scanning sector…' : 'Run Zone Scan'}
        </button>
        <button
          type="button"
          onClick={onClear}
          title="Clear scan sector"
          aria-label="Clear scan sector"
          className="grid w-10 shrink-0 place-items-center rounded-lg border border-slate-700/90 bg-slate-950/45 text-slate-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </GlassCard>
  )
}
