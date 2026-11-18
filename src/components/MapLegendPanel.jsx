import { Map } from 'lucide-react'
import { MAP_COLORS, STATUS_META } from '../lib/constants'
import { GlassCard } from './ui/GlassCard'
import { SectionHeader } from './ui/SectionHeader'

const legendItems = [
  {
    label: 'Waiting approval',
    color: STATUS_META.waiting.color,
    pulse: true,
  },
  {
    label: 'Approved barn',
    color: STATUS_META.approved.color,
  },
  {
    label: 'Rejected (60% opacity)',
    color: STATUS_META.rejected.color,
    opacity: 0.6,
  },
  {
    label: 'Uncertain',
    color: STATUS_META.uncertain.color,
  },
  {
    label: 'TRB registry + 55 m rings',
    color: MAP_COLORS.trb,
    dashed: true,
  },
  {
    label: 'Small structure < 35 m²',
    color: MAP_COLORS.small,
    outline: true,
  },
]

export const MapLegendPanel = () => (
  <GlassCard className="p-4">
    <SectionHeader icon={Map} title="Map legend" uppercase />
    <div className="mt-3 space-y-1.5">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          {item.dashed ? (
            <span
              className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-dashed"
              style={{ borderColor: item.color }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            </span>
          ) : (
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                item.pulse ? 'legend-pulse' : ''
              } ${item.outline ? 'border border-dashed' : ''}`}
              style={{
                backgroundColor: item.outline ? 'transparent' : item.color,
                borderColor: item.outline ? item.color : undefined,
                opacity: item.opacity ?? 1,
                boxShadow: item.outline ? 'none' : `0 0 8px ${item.color}55`,
              }}
            />
          )}
          <span className="text-[9.5px] text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
      <p className="text-[8px] leading-relaxed text-slate-500">
        Dashed emerald rings are 55 m TRB proximity buffers.
      </p>
    </div>
  </GlassCard>
)
