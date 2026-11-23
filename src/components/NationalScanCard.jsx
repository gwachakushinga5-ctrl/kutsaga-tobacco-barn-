import { useMemo } from 'react'
import {
  Activity,
  ChevronRight,
  Globe,
  Loader2,
  LockKeyhole,
  MapPin,
  Pause,
  Play,
  RotateCw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { formatDateTime } from '../lib/constants'
import { groupMacroJobsByProvince } from '../lib/macroJobs'
import { GlassCard } from './ui/GlassCard'
import { SectionHeader } from './ui/SectionHeader'

const statusClasses = (job) => {
  const value = String(job?.status ?? '').toUpperCase()
  if (/RUNNING|IN_PROGRESS|PROGRESS|ACTIVE|PENDING|QUEUED|STARTING/.test(value)) {
    return 'border-cyan-500/35 bg-cyan-500/10 text-cyan-300'
  }
  if (value === 'COMPLETED') return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
  if (value === 'FAILED' || value === 'CANCELLED') {
    return 'border-red-500/35 bg-red-500/10 text-red-300'
  }
  return 'border-slate-700/70 bg-slate-900/60 text-slate-400'
}

const progressOf = (job) => {
  const total = Number(job?.total_tiles ?? 0)
  const done = Number(job?.processed_tiles ?? 0)
  if (!total) return 0
  return Math.min(100, Math.round((done / total) * 100))
}

const EstimateItem = ({ label, value, tone = 'text-slate-200' }) => (
  <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-2 py-1.5">
    <p className="text-[7px] font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
    <p className={`mt-0.5 truncate font-mono text-[11px] font-semibold ${tone}`}>{value}</p>
  </div>
)

export const NationalScanCard = ({
  boundaries,
  selectedBoundaryId,
  onBoundaryChange,
  estimate,
  estimateLoading,
  jobs,
  loading,
  launching,
  resumingId,
  error,
  confidence,
  canLaunch,
  restricted,
  role,
  livePollingEnabled,
  onLaunch,
  onWatchGlobal,
  onToggleLivePolling,
  onDeleteWaiting,
  onHideJobs,
  onResume,
  onActivateJobs,
  onFitBounds,
}) => {
  const provinceGroups = useMemo(() => groupMacroJobsByProvince(jobs), [jobs])
  const activeCount = provinceGroups.filter((group) => group.active).length

  if (restricted) {
    return (
      <GlassCard className="shrink-0 p-4">
        <SectionHeader
          icon={Globe}
          title="National scan"
          subtitle={`Unattended Azure macro scan · role: ${role ?? 'unknown'}`}
          right={
            <span className="flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/60 px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-slate-500">
              <LockKeyhole size={8} />
              Admin only
            </span>
          }
        />
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[9.5px] leading-relaxed text-amber-200/90">
          <LockKeyhole size={11} className="mt-0.5 shrink-0 text-amber-400/80" />
          <span>
            National scan controls require an admin role. Ask an administrator to launch the
            countrywide scan. You can still watch detections arrive in the Global Registry tab —
            it refreshes automatically.
          </span>
        </div>
        <div className="mt-2 flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={onWatchGlobal}
            className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/[0.07] px-1.5 text-[7.5px] font-semibold uppercase tracking-[0.06em] text-cyan-300 transition hover:bg-cyan-500/15"
          >
            <Activity size={10} />
            <span className="truncate">Watch waiting</span>
          </button>
          <button
            type="button"
            onClick={onToggleLivePolling}
            title={
              livePollingEnabled
                ? 'Pause dashboard polling only; the Azure scan keeps running'
                : 'Resume live review polling'
            }
            className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 text-[7.5px] font-semibold uppercase tracking-[0.06em] transition ${
              livePollingEnabled
                ? 'border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            {livePollingEnabled ? <Pause size={10} /> : <Play size={10} />}
            <span className="truncate">
              {livePollingEnabled ? 'Stop watching' : 'Resume watching'}
            </span>
          </button>
          <button
            type="button"
            onClick={onDeleteWaiting}
            aria-label="Delete waiting candidates"
            title="Delete waiting candidates from this browser queue only"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-500/25 bg-red-500/[0.06] text-red-300 transition hover:bg-red-500/15"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {!livePollingEnabled ? (
          <p className="mt-1.5 rounded-md border border-slate-700/70 bg-slate-900/50 px-2 py-1.5 font-mono text-[7.5px] leading-relaxed text-slate-500">
            Live review polling is paused. The Azure scan continues in the background.
          </p>
        ) : null}
      </GlassCard>
    )
  }

  return (
    <GlassCard className="shrink-0 p-4">
      <SectionHeader
        icon={Globe}
        title="National scan"
        subtitle={`Unattended Azure macro scan · role: ${role ?? 'admin'}`}
        right={
          <span
            className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[7.5px] uppercase tracking-[0.12em] ${
              activeCount
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-700/70 bg-slate-900/60 text-slate-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeCount ? 'animate-pulse bg-cyan-300' : 'bg-slate-600'
              }`}
            />
            {activeCount ? `${activeCount} live` : 'Idle'}
          </span>
        }
      />

      <div className="mt-2.5 flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={onWatchGlobal}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/[0.07] px-1.5 text-[7.5px] font-semibold uppercase tracking-[0.06em] text-cyan-300 transition hover:bg-cyan-500/15"
        >
          <Activity size={10} />
          <span className="truncate">Watch waiting</span>
        </button>
        <button
          type="button"
          onClick={onToggleLivePolling}
          title={
            livePollingEnabled
              ? 'Pause dashboard polling only; the Azure scan keeps running'
              : 'Resume live review polling'
          }
          className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 text-[7.5px] font-semibold uppercase tracking-[0.06em] transition ${
            livePollingEnabled
              ? 'border-slate-700/70 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-slate-100'
              : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          {livePollingEnabled ? <Pause size={10} /> : <Play size={10} />}
          <span className="truncate">
            {livePollingEnabled ? 'Stop watching' : 'Resume watching'}
          </span>
        </button>
        <button
          type="button"
          onClick={onDeleteWaiting}
          aria-label="Delete waiting candidates"
          title="Delete waiting candidates from this browser queue only"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-500/25 bg-red-500/[0.06] text-red-300 transition hover:bg-red-500/15"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {!livePollingEnabled ? (
        <p className="mt-1.5 rounded-md border border-slate-700/70 bg-slate-900/50 px-2 py-1.5 font-mono text-[7.5px] leading-relaxed text-slate-500">
          Live review polling is paused. The Azure scan continues in the background.
        </p>
      ) : null}

      <div className="mt-3">
        <label
          htmlFor="macro-boundary"
          className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-500"
        >
          Boundary
        </label>
        <div className="relative mt-1">
          <select
            id="macro-boundary"
            value={selectedBoundaryId}
            onChange={(event) => onBoundaryChange(event.target.value)}
            className="kutsaga-select"
          >
            <option value="">Select a boundary…</option>
            {boundaries.map((boundary) => (
              <option key={boundary.boundary_id} value={boundary.boundary_id}>
                {boundary.name} · {boundary.kind}
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

      {estimateLoading ? (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
          <Loader2 size={10} className="animate-spin" />
          Loading estimate…
        </div>
      ) : estimate ? (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <EstimateItem
            label="Tiles"
            value={Number(estimate.estimated_tiles ?? 0).toLocaleString()}
            tone="text-cyan-300"
          />
          <EstimateItem
            label="Est. days"
            value={Number(estimate.estimated_days ?? 0).toFixed(1)}
          />
          <EstimateItem
            label="Jobs"
            value={
              estimate.requires_subsectors
                ? estimate.cells?.length ?? 0
                : estimate.launchable
                  ? 1
                  : 0
            }
            tone="text-amber-300"
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-red-500/25 bg-red-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-red-300">
          <TriangleAlert size={10} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!selectedBoundaryId || launching || !canLaunch}
        onClick={onLaunch}
        title={canLaunch ? 'Launch unattended macro scan' : 'Admin role required'}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {launching ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {launching ? 'Queueing…' : 'Launch unattended scan'}
      </button>
      <p className="mt-1 text-center font-mono text-[7.5px] text-slate-600">
        threshold {Math.round(confidence * 100)}% · {canLaunch ? 'admin controls' : 'admin role required'}
      </p>

      <div className="mt-3 border-t border-slate-800/80 pt-2.5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Activity size={10} />
            Macro jobs
          </p>
          <span className="font-mono text-[8px] text-slate-600">
            {provinceGroups.length} province{provinceGroups.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-2 space-y-1.5">
          {provinceGroups.length ? (
            provinceGroups.slice(0, 5).map((group) => {
              const percent = progressOf(group)
              const busy = group.active
              const newestStatus = String(group.newest?.status ?? '').toUpperCase()
              return (
                <div
                  key={group.key}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-2 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[9px] font-medium text-slate-200">
                        {group.label}
                      </p>
                      <p className="mt-0.5 truncate text-[8px] text-slate-600">
                        {formatDateTime(group.newest?.created_at)} · {group.jobs.length} cell job
                        {group.jobs.length === 1 ? '' : 's'} · {group.processedTiles}/
                        {group.totalTiles} tiles
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-1 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] ${statusClasses({ status: group.status })}`}
                    >
                      {group.status}
                    </span>
                  </div>

                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className={`h-full rounded-full transition-all ${
                        newestStatus === 'FAILED' || newestStatus === 'CANCELLED'
                          ? 'bg-red-500/70'
                          : newestStatus === 'COMPLETED'
                            ? 'bg-emerald-500/70'
                            : 'bg-cyan-400/70'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="mt-1.5 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onActivateJobs(group.jobs.map((job) => job.job_id))
                        if (group.bounds) onFitBounds(group.bounds)
                      }}
                      className="flex items-center gap-1 rounded border border-cyan-500/25 bg-cyan-500/[0.06] px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-cyan-300 transition hover:bg-cyan-500/15"
                    >
                      <MapPin size={8} />
                      {busy ? 'Watch waiting' : 'Review'}
                      <ChevronRight size={8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onHideJobs(group.jobs.map((job) => job.job_id))}
                      aria-label={`Hide all macro jobs in ${group.label}`}
                      title="Hide all cell jobs for this province; the backend jobs are unchanged"
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded border border-red-500/25 bg-red-500/[0.06] text-red-300 transition hover:bg-red-500/15"
                    >
                      <Trash2 size={9} />
                    </button>
                    {group.resumable ? (
                      <button
                        type="button"
                        disabled={Boolean(resumingId)}
                        onClick={() => onResume(group.resumable.job_id)}
                        className="flex items-center gap-1 rounded border border-amber-500/25 bg-amber-500/[0.06] px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-amber-300 transition hover:bg-amber-500/15 disabled:opacity-40"
                      >
                        {resumingId === group.resumable.job_id ? (
                          <Loader2 size={8} className="animate-spin" />
                        ) : (
                          <RotateCw size={8} />
                        )}
                        Resume
                      </button>
                    ) : busy ? (
                      <span className="font-mono text-[7.5px] text-cyan-500/80">
                        {percent}%
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/25 px-3 py-3 text-center text-[9px] text-slate-500">
              {loading
                ? 'Loading macro jobs…'
                : selectedBoundaryId
                  ? 'No macro scans for this boundary yet.'
                  : 'Select a boundary to see its macro jobs.'}
            </div>
          )}
        </div>
        <p className="mt-2 font-mono text-[7px] leading-relaxed text-slate-600">
          Trash icons hide every cell job for that province in this browser only; they do not cancel
          Azure jobs or change backend verdicts.
        </p>
      </div>
    </GlassCard>
  )
}
