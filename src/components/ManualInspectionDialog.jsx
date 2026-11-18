import { useEffect, useState } from 'react'
import { Eye, Info, MapPin, Sparkles, X } from 'lucide-react'
import { captureCenteredCrop } from '../lib/imagery'
import {
  analyzeBarnImage,
  getGeminiKey,
  saveGeminiKey,
  verifyBarnAtCenter,
} from '../services/gemini'
import { GlassCard } from './ui/GlassCard'

const confidenceClass = {
  high: 'border-emerald-400/70 text-emerald-300',
  medium: 'border-amber-400/70 text-amber-300',
  low: 'border-slate-500/70 text-slate-400',
}

const prepareBox = (item) => {
  const values = (item?.box_2d ?? []).map((value) => {
    const number = Number(value)
    if (!Number.isFinite(number)) return 0
    const scaled = number >= 0 && number <= 1 ? number * 1000 : number
    return Math.min(1000, Math.max(0, scaled))
  })
  if (values.length !== 4) return null
  let [yMin, xMin, yMax, xMax] = values
  if (xMax <= xMin || yMax <= yMin) [xMin, yMin, xMax, yMax] = values
  if (xMax <= xMin || yMax <= yMin) return null
  return { ...item, box_2d: [yMin, xMin, yMax, xMax] }
}

export const ManualInspectionDialog = ({ point, onClose, onCaptureMapArea }) => {
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState('')
  const [apiKey, setApiKey] = useState(getGeminiKey)
  const [keyDraft, setKeyDraft] = useState(getGeminiKey)
  const [analyzing, setAnalyzing] = useState('')
  const [boxes, setBoxes] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const [verificationNote, setVerificationNote] = useState('')

  useEffect(() => {
    if (!point) return undefined
    let active = true
    setImageUrl('')
    setImageError('')
    setBoxes([])
    setAnalysisError('')
    setVerificationNote('')

    captureCenteredCrop(point.lat, point.lng, { zoom: 19, size: 512 })
      .then((captured) => {
        if (active) setImageUrl(captured.src)
      })
      .catch((error) => {
        if (active) setImageError(error.message)
      })

    return () => {
      active = false
    }
  }, [point])

  useEffect(() => {
    if (!point) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, point])

  if (!point) return null

  const handleSaveKey = () => {
    const next = keyDraft.trim()
    saveGeminiKey(next)
    setApiKey(next)
  }

  const handleAnalyze = async (mode) => {
    if (!apiKey) {
      setAnalysisError('Add a Gemini API key first')
      return
    }
    setAnalyzing(mode)
    setAnalysisError('')
    setVerificationNote('')
    setBoxes([])
    try {
      const source = mode === 'map' ? await onCaptureMapArea?.() : imageUrl
      if (!source) throw new Error('No image available to analyze')

      if (mode === 'crop') {
        // The crop is centred on the inspection point, so confirm that point
        // first. No confirmation means no boxes.
        const verification = await verifyBarnAtCenter(source, apiKey)
        if (!verification.isBarn) {
          setVerificationNote(
            verification.reason
              ? `Not a barn — ${verification.reason}`
              : 'No barn at the inspection point',
          )
          return
        }
      }

      const detected = await analyzeBarnImage(source, apiKey)
      const prepared = detected.map(prepareBox).filter(Boolean)
      setBoxes(prepared)
      if (mode === 'map') setVerificationNote('Map area search — centre check not applicable')
      if (!prepared.length) {
        setVerificationNote('Gemini found no tight barn box in this image')
      }
    } catch (error) {
      setAnalysisError(error.message)
    } finally {
      setAnalyzing('')
    }
  }

  return (
    <div
      className="fade-in fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !analyzing) onClose()
      }}
    >
      <GlassCard className="modal-in max-h-[92vh] w-full max-w-5xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-teal-500/25 bg-teal-500/10 text-teal-300">
              <Eye size={17} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-slate-100">
                Manual imagery check
              </h2>
              <p className="mt-0.5 text-[9.5px] text-slate-500">
                Inspect the satellite crop and confirm the structure with your own eyes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close manual inspection"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-700/80 bg-slate-900/50 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>

        <div className="kutsaga-scroll max-h-[calc(92vh-64px)] overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div>
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
                {imageUrl ? (
                  <img src={imageUrl} alt="Satellite crop" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
                    {imageError || 'Loading crop…'}
                  </div>
                )}
                {boxes.map((item, index) => {
                  const [yMin, xMin, yMax, xMax] = item.box_2d
                  return (
                    <div
                      key={`box-${index}`}
                      className="pointer-events-none absolute border-2 border-cyan-300 shadow-[0_0_14px_-2px_rgba(34,211,238,0.8)]"
                      style={{
                        left: `${(xMin / 1000) * 100}%`,
                        top: `${(yMin / 1000) * 100}%`,
                        width: `${((xMax - xMin) / 1000) * 100}%`,
                        height: `${((yMax - yMin) / 1000) * 100}%`,
                      }}
                    >
                      <span
                        className={`absolute -top-4 left-0 whitespace-nowrap rounded border bg-slate-950/85 px-1 font-mono text-[8px] ${
                          confidenceClass[item.confidence] ?? confidenceClass.low
                        }`}
                      >
                        #{index + 1} · {item.confidence}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
                {boxes.length
                  ? `${boxes.length} Gemini detection${boxes.length === 1 ? '' : 's'}`
                  : 'Satellite crop · Z19'}
              </p>
              {verificationNote ? (
                <p className="mt-1 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1 font-mono text-[8.5px] leading-relaxed text-amber-200">
                  {verificationNote}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  <MapPin size={9} />
                  Inspection point
                </p>
                <p className="mt-1 font-mono text-[11px] text-teal-300">
                  {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                </p>
              </div>

              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-cyan-300/80">
                  <Sparkles size={9} />
                  Gemini analysis
                </p>
                <label
                  htmlFor="gemini-key"
                  className="mt-2 block text-[8px] uppercase tracking-[0.12em] text-slate-500"
                >
                  API key (stored on this device)
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    id="gemini-key"
                    type="password"
                    value={keyDraft}
                    onChange={(event) => setKeyDraft(event.target.value)}
                    placeholder="AIza…"
                    className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-[9px] text-slate-200 outline-none focus:border-cyan-400/60"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-300 transition hover:bg-cyan-500/20"
                  >
                    Save
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!imageUrl || Boolean(analyzing)}
                    onClick={() => handleAnalyze('crop')}
                    className="rounded border border-teal-500/35 bg-teal-500/10 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-40"
                  >
                    {analyzing === 'crop' ? 'Analyzing…' : 'Analyze crop'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(analyzing)}
                    onClick={() => handleAnalyze('map')}
                    className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-40"
                  >
                    {analyzing === 'map' ? 'Analyzing…' : 'Analyze map area'}
                  </button>
                </div>
                {analysisError ? (
                  <p className="mt-2 rounded border border-red-500/25 bg-red-500/10 px-2 py-1.5 text-[9px] text-red-200">
                    {analysisError}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.055] px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.15em] text-amber-300/80">
                  <Info size={9} />
                  Model status
                </p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-slate-400">
                  This is a manual satellite review. Confirmed barns are written back through the
                  candidate verification API when you run a zone scan.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Look for
                </p>
                <ul className="mt-1.5 space-y-1 text-[9.5px] leading-relaxed text-slate-400">
                  <li>
                    Rectangular or elongated boxy structures, often in neat rows, clusters, or
                    batteries beside grading sheds and farm tracks.
                  </li>
                  <li>
                    Distinct pitched or gable roofs (corrugated metal, asbestos, or dark
                    weathered roofing) with shadow edges showing tall vertical walls.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.045] px-3 py-2.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-red-300/80">
                  Do not detect
                </p>
                <ul className="mt-1.5 space-y-1 text-[9.5px] leading-relaxed text-slate-400">
                  <li>Small circular thatched huts, scattered dwellings, or homesteads.</li>
                  <li>Trees, bushes, water tanks, livestock kraals, or bare soil patches.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 px-3 py-2.5">
                <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Box output
                </p>
                <p className="mt-1.5 text-[9.5px] leading-relaxed text-slate-400">
                  Tight, individual boxes per barn — never one box around a whole cluster.{' '}
                  <span className="font-mono text-cyan-300">box_2d</span> ={' '}
                  <span className="font-mono text-cyan-300">[y_min, x_min, y_max, x_max]</span>{' '}
                  normalized 0–1000, confidence high, medium, or low.
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
