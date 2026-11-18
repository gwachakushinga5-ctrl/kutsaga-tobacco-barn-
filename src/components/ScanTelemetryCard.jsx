import { Activity, ScanLine, Timer } from 'lucide-react'
import { formatDateTime } from '../lib/constants'
import { GlassCard } from './ui/GlassCard'
import { SectionHeader } from './ui/SectionHeader'

export const ScanTelemetryCard = ({ telemetry, scanStatus }) => {
  const running = scanStatus === 'RUNNING'

  return (
    <GlassCard className="shrink-0 p-4">
      <SectionHeader
        icon={ScanLine}
        title="Scan telemetry"
        uppercase
        right={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[8px] font-semibold tracking-[0.14em] ${
              running
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-slate-700/80 bg-slate-900/60 text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                running ? 'animate-pulse bg-amber-400' : 'bg-slate-500'
              }`}
            />
            {running ? 'RUNNING' : 'IDLE'}
          </span>
        }
      />

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.15em] text-slate-500">
            <Activity size={9} />
            Tiles
          </div>
          <div className="mt-1 font-mono text-[14px] font-semibold text-slate-200">
            {telemetry.tilesDone}
            <span className="text-[10px] font-normal text-slate-500">
              {' '}
              / {telemetry.tilesTotal}
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.15em] text-slate-500">
            <Timer size={9} />
            Progress
          </div>
          <div className="mt-1 font-mono text-[14px] font-semibold text-cyan-300">
            {telemetry.percent}
            <span className="text-[10px] font-normal text-cyan-500/70">%</span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full border border-slate-800/80 bg-slate-950/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.55)] transition-[width] duration-200 ease-out"
            style={{ width: `${telemetry.percent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[8.5px] text-slate-500">
          <span className="truncate">
            {telemetry.label}
            <span className="text-slate-700"> · </span>
            confidence ≥ {Number(telemetry.threshold).toFixed(2)}
          </span>
          <span className="shrink-0 font-mono text-slate-500">
            {telemetry.lastScan ? formatDateTime(telemetry.lastScan) : 'Not scanned'}
          </span>
        </div>
      </div>
    </GlassCard>
  )
}
