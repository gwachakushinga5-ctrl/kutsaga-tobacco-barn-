import { Info, Layers, Trash2 } from 'lucide-react'
import { formatDateTime } from '../lib/constants'
import { GlassCard } from './ui/GlassCard'
import { SectionHeader } from './ui/SectionHeader'
import { ToggleRow } from './ui/ToggleRow'

const LAYER_ROWS = [
  { key: 'trb', label: 'TRB registry layer', dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' },
  {
    key: 'rings',
    label: '55 m proximity rings',
    dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
  },
  { key: 'boxes', label: 'Show Box Overlay', shortcut: 'B', dotClass: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' },
  { key: 'dim', label: 'Dim Pre-Scanned Areas', dotClass: 'bg-slate-400' },
]

export const MapLayersPanel = ({
  layers,
  onToggleLayer,
  sectors,
  onDeleteSector,
}) => (
  <GlassCard className="flex min-h-0 flex-col p-4">
    <SectionHeader icon={Layers} title="Map layers" uppercase />

    <div className="mt-3 space-y-0.5 border-t border-slate-800/80 pt-2">
      {LAYER_ROWS.map((row) => (
        <ToggleRow
          key={row.key}
          label={row.label}
          shortcut={row.shortcut}
          dotClass={row.dotClass}
          checked={Boolean(layers[row.key])}
          onChange={() => onToggleLayer(row.key)}
        />
      ))}
    </div>

    <div className="mt-3 flex min-h-0 flex-1 flex-col border-t border-slate-800/80 pt-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Pre-scanned sectors
        </p>
        <span className="rounded-full border border-slate-700/80 bg-slate-900/60 px-1.5 py-0.5 font-mono text-[8px] text-slate-400">
          {sectors.length}
        </span>
      </div>

      <div className="kutsaga-scroll mt-2 min-h-[72px] flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sectors.length ? (
          sectors.map((sector) => (
            <div
              key={sector.id}
              className="rounded-lg border border-slate-800/75 bg-slate-950/35 px-2 py-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[9.5px] text-slate-300">{sector.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[8px] text-slate-500">
                    {formatDateTime(sector.timestamp)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteSector(sector.id)}
                  aria-label={`Delete ${sector.name}`}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded border border-transparent text-slate-600 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span
                  className={`rounded border px-1 py-0.5 font-mono text-[7px] font-semibold tracking-[0.13em] ${
                    sector.status === 'COMPLETED'
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {sector.status}
                </span>
                <span className="font-mono text-[7.5px] text-slate-600">
                  {sector.bounds ? 'Z18 AOI' : 'Viewport'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex h-full min-h-[72px] items-center justify-center rounded-lg border border-dashed border-slate-800 px-3 text-center text-[9px] text-slate-600">
            No sectors scanned yet.
          </div>
        )}
      </div>
    </div>

    <div className="mt-3 flex gap-1.5 border-t border-slate-800/80 pt-2.5">
      <Info size={10} className="mt-0.5 shrink-0 text-cyan-400/60" />
      <p className="text-[8px] leading-relaxed text-slate-500">
        Google satellite with place labels is the only basemap. Detection overlays always
        stay above the imagery.
      </p>
    </div>
  </GlassCard>
)
