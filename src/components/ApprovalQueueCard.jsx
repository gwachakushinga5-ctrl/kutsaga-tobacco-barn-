import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Link2,
  Loader2,
  Radar,
  SearchX,
  Trash2,
} from 'lucide-react'
import {
  REVIEW_BANDS,
  STATUS_META,
  STATUS_ORDER,
  TRB_STATES,
  formatDateTime,
} from '../lib/constants'
import { formatArea } from '../lib/geo'
import { GlassCard } from './ui/GlassCard'
import { SectionHeader } from './ui/SectionHeader'
import { SegmentedControl } from './ui/SegmentedControl'

const trbBadgeClass = {
  POSSIBLE_EXISTING_MATCH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  ADJACENT_STRUCTURE: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  NO_MATCH: 'border-slate-700/70 bg-slate-900/50 text-slate-400',
}

const bandClass = {
  STANDARD: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  SMALL_STRUCTURE_SCRUTINY: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
}

export const ApprovalQueueCard = ({
  activeTab,
  onTabChange,
  counts,
  statusFilter,
  onStatusFilter,
  page,
  pageCount,
  onPageChange,
  rows,
  filteredTotal,
  selectedId,
  onSelectDetection,
  onRemoveDetection,
  onRemoveAll,
  onExport,
  exporting,
}) => {
  const tabs = [
    { value: 'global', label: 'Global Registry' },
    { value: 'current', label: 'Current Scan' },
  ]

  return (
    <GlassCard className="shrink-0 p-4">
      <SectionHeader
        icon={ClipboardCheck}
        title="Approval Queue"
        subtitle="Persistent registry. Click a row to inspect its Z18 crop."
        right={
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onRemoveAll}
              disabled={!counts.total}
              title="Remove all mapped barns from the approval queue"
              className="flex items-center gap-1 rounded-md border border-red-500/25 bg-red-500/[0.07] px-1.5 py-1 text-[7.5px] font-semibold uppercase tracking-[0.1em] text-red-300 transition hover:border-red-500/45 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={9} />
              Remove all
            </button>
            <span className="grid h-6 min-w-6 place-items-center rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 font-mono text-[10px] font-bold text-amber-300 shadow-[0_0_16px_-4px_rgba(245,158,11,0.7)]">
              {counts.waiting}
            </span>
          </div>
        }
      />

      <div className="mt-3">
        <SegmentedControl
          options={tabs}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel="Registry scope"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status]
          const active = statusFilter === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusFilter(status)}
              className={`rounded-lg border px-2.5 py-2 text-left transition ${
                active
                  ? meta.activeCardClass
                  : 'border-slate-800/80 bg-slate-950/35 hover:border-slate-700 hover:bg-slate-900/40'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                <span className="truncate text-[8.5px] font-medium uppercase tracking-[0.11em] text-slate-400">
                  {meta.label}
                </span>
              </span>
              <span
                className={`mt-1 block font-mono text-[18px] font-semibold leading-none ${
                  active ? meta.textClass : 'text-slate-200'
                }`}
              >
                {counts[status] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 space-y-1.5">
        {rows.length ? (
          rows.map((detection) => {
            const meta = STATUS_META[detection.status]
            const band = REVIEW_BANDS.find((item) => item.value === detection.reviewBand)
            const trb = TRB_STATES.find((item) => item.value === detection.trbState)
            const selected = selectedId === detection.id
            return (
              <div
                key={detection.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDetection(detection.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onSelectDetection(detection.id)
                }}
                className={`group w-full cursor-pointer rounded-lg border px-2.5 py-2 text-left transition ${
                  selected
                    ? 'border-cyan-400/45 bg-cyan-400/[0.065] shadow-[0_0_20px_-10px_rgba(34,211,238,0.6)]'
                    : 'border-slate-800/75 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: meta.color,
                      boxShadow: `0 0 0 3px ${meta.color}1f`,
                      opacity: detection.status === 'rejected' ? 0.6 : 1,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[10px] font-medium text-slate-200">
                        {detection.id}
                        <span className="ml-1.5 font-sans text-[9px] font-normal text-slate-500">
                          {detection.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-slate-400">
                        {Math.round(detection.confidence * 100)}%
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="font-mono text-[8.5px] text-slate-500">
                        {formatArea(detection.area)}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1 py-0.5 text-[7.5px] uppercase tracking-[0.08em] ${trbBadgeClass[detection.trbState]}`}
                      >
                        <Link2 size={7.5} />
                        {trb?.label ?? detection.trbState}
                      </span>
                      <span
                        className={`rounded border px-1 py-0.5 text-[7.5px] uppercase tracking-[0.08em] ${bandClass[detection.reviewBand]}`}
                      >
                        {band?.label ?? detection.reviewBand}
                      </span>
                      <span className="ml-auto font-mono text-[7.5px] text-slate-600">
                        {formatDateTime(detection.detectedAt, {
                          day: undefined,
                          month: undefined,
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                    <button
                      type="button"
                      title="Remove wrong barn"
                      aria-label={`Remove ${detection.id} from the approval queue`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveDetection(detection.id)
                      }}
                      className="grid h-5 w-5 place-items-center rounded border border-transparent text-slate-600 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={11} />
                    </button>
                    <ChevronRight
                      size={12}
                      className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-800 bg-slate-950/25 px-4 py-6 text-center">
            {activeTab === 'current' ? (
              <Radar size={20} className="text-slate-600" />
            ) : (
              <SearchX size={20} className="text-slate-600" />
            )}
            <p className="text-[10px] text-slate-400">
              {activeTab === 'current'
                ? 'No current scan results yet. Run a zone scan or inspect the imagery manually.'
                : 'No candidates to show. The registry is empty or the active filters exclude everything.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/35 p-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[9px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={11} />
          Prev
        </button>
        <span className="font-mono text-[8.5px] text-slate-500">
          Page {page} of {pageCount}{' '}
          <span className="text-slate-600">({filteredTotal} total)</span>
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[9px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next
          <ChevronRight size={11} />
        </button>
      </div>

      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#7f1d1d] bg-red-950/30 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-red-300 transition hover:bg-red-950/45 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} />
        )}
        {exporting ? 'Exporting…' : 'Export Rejected to Active Learning'}
      </button>
    </GlassCard>
  )
}
