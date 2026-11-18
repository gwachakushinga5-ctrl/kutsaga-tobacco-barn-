import { useEffect, useState } from 'react'
import {
  Check,
  CircleHelp,
  Gauge,
  Layers,
  Link2,
  LockKeyhole,
  MapPin,
  Ruler,
  TriangleAlert,
  X,
  XCircle,
} from 'lucide-react'
import { REJECTION_REASONS, REJECTION_REASON_MAP } from '../data/rejectionReasons'
import {
  REVIEW_BANDS,
  STATUS_META,
  TRB_STATES,
  formatDateTime,
} from '../lib/constants'
import { formatArea } from '../lib/geo'
import { Z18Crop } from './ui/Z18Crop'
import { StatusPill } from './ui/StatusPill'

const MetaItem = ({ icon: Icon, label, value, accentClass = 'text-slate-200' }) => (
  <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-2.5 py-2">
    <div className="flex items-center gap-1.5 text-[7.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      <Icon size={9} />
      {label}
    </div>
    <p className={`mt-1 truncate text-[11px] font-medium ${accentClass}`}>{value}</p>
  </div>
)

export const DetectionInspector = ({
  detection,
  onClose,
  onReview,
  reviewing,
  onOpenTaxonomy,
  taxonomySelection,
}) => {
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    setRejectMode(false)
    setReason(detection?.rejectionReason ?? '')
  }, [detection?.id, detection?.rejectionReason])

  useEffect(() => {
    if (!taxonomySelection || !detection?.id) return
    setReason(taxonomySelection.code)
    setRejectMode(true)
  }, [detection?.id, taxonomySelection])

  useEffect(() => {
    if (!detection) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detection, onClose])

  if (!detection) return null

  const meta = STATUS_META[detection.status]
  const trb = TRB_STATES.find((state) => state.value === detection.trbState)
  const band = REVIEW_BANDS.find((item) => item.value === detection.reviewBand)
  const existingReason = detection.rejectionReason
    ? REJECTION_REASON_MAP[detection.rejectionReason]
    : null

  const handleReject = async () => {
    const success = await onReview(detection.id, 'rejected', reason)
    if (success) setRejectMode(false)
  }

  return (
    <div
      className="fade-in fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !reviewing) onClose()
      }}
    >
      <div className="glass-card modal-in max-h-[92vh] w-full max-w-4xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: meta.color,
                boxShadow: `0 0 0 4px ${meta.color}22, 0 0 14px ${meta.color}99`,
                opacity: detection.status === 'rejected' ? 0.6 : 1,
              }}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-cyan-300">
                  {detection.id}
                </span>
                <StatusPill status={detection.status} />
                {detection.small ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-rose-300">
                    <TriangleAlert size={8} />
                    Small structure
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 text-[15px] font-semibold text-slate-100">
                {detection.name}
              </h3>
              <p className="mt-0.5 text-[9.5px] text-slate-500">
                {detection.sector} · detected {formatDateTime(detection.detectedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-700/80 bg-slate-900/50 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>

        <div className="kutsaga-scroll max-h-[calc(92vh-64px)] overflow-y-auto">
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Z18 crop inspection
                </p>
                <span className="font-mono text-[8px] text-slate-600">
                  {detection.lat.toFixed(6)}, {detection.lng.toFixed(6)}
                </span>
              </div>
              <Z18Crop
                detectionId={detection.id}
                lat={detection.lat}
                lng={detection.lng}
                color={meta.color}
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-[0.14em] text-slate-500">
                    <Gauge size={9} />
                    Confidence
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-semibold text-cyan-300">
                    {(detection.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[7.5px] uppercase tracking-[0.14em] text-slate-500">
                    <Ruler size={9} />
                    Footprint
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-semibold text-slate-200">
                    {formatArea(detection.area)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="grid grid-cols-2 gap-2">
                <MetaItem
                  icon={Layers}
                  label="Review band"
                  value={band?.label ?? detection.reviewBand}
                  accentClass={
                    detection.reviewBand === 'STANDARD'
                      ? 'text-cyan-300'
                      : detection.reviewBand === 'SMALL_STRUCTURE_SCRUTINY'
                        ? 'text-rose-300'
                        : 'text-slate-300'
                  }
                />
                <MetaItem
                  icon={MapPin}
                  label="Priority"
                  value={detection.priority.toFixed(2)}
                  accentClass="text-amber-300"
                />
                <MetaItem
                  icon={Link2}
                  label="TRB state"
                  value={trb?.label ?? detection.trbState}
                  accentClass={
                    detection.trbState === 'POSSIBLE_EXISTING_MATCH'
                      ? 'text-emerald-300'
                      : detection.trbState === 'ADJACENT_STRUCTURE'
                        ? 'text-amber-300'
                        : 'text-slate-400'
                  }
                />
                <MetaItem
                  icon={Ruler}
                  label="Nearest TRB"
                  value={
                    detection.trbDistance == null
                      ? '—'
                      : `${detection.trbDistance.toFixed(1)} m`
                  }
                  accentClass={
                    detection.trbState === 'POSSIBLE_EXISTING_MATCH'
                      ? 'text-emerald-300'
                      : 'text-slate-300'
                  }
                />
              </div>

              {detection.trbId ? (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.055] px-2.5 py-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[9px] text-emerald-300">
                    <Link2 size={10} className="shrink-0" />
                    <span className="truncate">{detection.trbName}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-emerald-500/80">
                    {detection.trbId}
                  </span>
                </div>
              ) : null}

              {existingReason ? (
                <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/[0.045] px-2.5 py-2">
                  <p className="text-[7.5px] font-semibold uppercase tracking-[0.14em] text-red-400/80">
                    Active rejection reason
                  </p>
                  <p className="mt-1 text-[10px] text-red-200">{existingReason.label}</p>
                </div>
              ) : null}

              <div className="mt-3 flex-1 rounded-lg border border-slate-800/80 bg-slate-950/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Human review
                  </p>
                  <button
                    type="button"
                    onClick={onOpenTaxonomy}
                    className="flex items-center gap-1 rounded border border-slate-700/70 bg-slate-900/50 px-1.5 py-1 text-[7.5px] uppercase tracking-[0.1em] text-slate-400 transition hover:border-amber-500/35 hover:text-amber-300"
                  >
                    <LockKeyhole size={8} />
                    Taxonomy
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => onReview(detection.id, 'approved')}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-blue-500/35 bg-blue-500/10 px-2 py-2 text-[9px] font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    <Check size={11} />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => onReview(detection.id, 'uncertain')}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-purple-500/35 bg-purple-500/10 px-2 py-2 text-[9px] font-semibold text-purple-300 transition hover:bg-purple-500/20 disabled:opacity-50"
                  >
                    <CircleHelp size={11} />
                    Uncertain
                  </button>
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => setRejectMode((current) => !current)}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-2 text-[9px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle size={11} />
                    Reject
                  </button>
                </div>

                {rejectMode ? (
                  <div className="mt-2.5 rounded-md border border-red-500/20 bg-slate-950/50 p-2.5">
                    <label
                      htmlFor="rejection-reason"
                      className="text-[7.5px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      Frozen rejection reason
                    </label>
                    <div className="relative mt-1">
                      <select
                        id="rejection-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="kutsaga-select"
                      >
                        <option value="">Select a frozen reason...</option>
                        {REJECTION_REASONS.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.label}
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
                    <button
                      type="button"
                      disabled={!reason || reviewing}
                      onClick={handleReject}
                      className="mt-2 w-full rounded-md border border-red-500/35 bg-red-500/15 px-2 py-2 text-[9px] font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Confirm rejection
                    </button>
                  </div>
                ) : null}

                <p className="mt-2 text-[7.5px] leading-relaxed text-slate-600">
                  Reviews update the persistent registry and are written back through the
                  detection review API.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
