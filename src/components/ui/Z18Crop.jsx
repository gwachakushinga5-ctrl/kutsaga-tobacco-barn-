import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getCandidateCrop } from '../../services/api'
import {
  analyzeBarnImage,
  getGeminiKey,
  saveGeminiKey,
} from '../../services/gemini'

const confidenceClass = {
  high: 'border-emerald-400 bg-emerald-400/10 text-emerald-300',
  medium: 'border-amber-400 bg-amber-400/10 text-amber-300',
  low: 'border-slate-400/70 bg-slate-400/10 text-slate-300',
}

const normalizeBox = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  const scaled = number >= 0 && number <= 1 ? number * 1000 : number
  return Math.min(1000, Math.max(0, scaled))
}

export const Z18Crop = ({ detectionId, lat, lng, color = '#22d3ee' }) => {
  const [crop, setCrop] = useState(null)
  const [status, setStatus] = useState(detectionId ? 'loading' : 'empty')
  const [boxes, setBoxes] = useState([])
  const [analysis, setAnalysis] = useState('idle')
  const [analysisError, setAnalysisError] = useState('')
  const [apiKey, setApiKey] = useState(getGeminiKey)
  const [keyDraft, setKeyDraft] = useState(getGeminiKey)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [imageRect, setImageRect] = useState(null)
  const containerRef = useRef(null)
  const imageRef = useRef(null)

  useEffect(() => {
    if (!detectionId) {
      setCrop(null)
      setStatus('empty')
      setBoxes([])
      setAnalysis('idle')
      setAnalysisError('')
      setImageRect(null)
      return undefined
    }

    let active = true
    let loaded = null
    const controller = new AbortController()
    setCrop(null)
    setStatus('loading')
    setBoxes([])
    setAnalysis('idle')
    setAnalysisError('')
    setImageRect(null)

    getCandidateCrop(detectionId, controller.signal)
      .then((result) => {
        if (!active) {
          if (result?.objectUrl) URL.revokeObjectURL(result.src)
          return
        }
        loaded = result
        if (result) {
          setCrop(result)
          setStatus('ready')
        } else {
          setStatus('empty')
        }
      })
      .catch(() => {
        if (active) setStatus('empty')
      })

    return () => {
      active = false
      controller.abort()
      if (loaded?.objectUrl) URL.revokeObjectURL(loaded.src)
    }
  }, [detectionId])

  const measureImage = useCallback(() => {
    const container = containerRef.current
    const image = imageRef.current
    if (!container || !image || !image.naturalWidth || !image.naturalHeight) return
    const width = container.clientWidth
    const height = container.clientHeight
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
    const displayWidth = image.naturalWidth * scale
    const displayHeight = image.naturalHeight * scale
    setImageRect({
      left: (width - displayWidth) / 2,
      top: (height - displayHeight) / 2,
      width: displayWidth,
      height: displayHeight,
    })
  }, [])

  useEffect(() => {
    if (!crop?.src) return undefined
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measureImage)
    observer.observe(container)
    return () => observer.disconnect()
  }, [crop?.src, measureImage])

  const runAnalysis = useCallback(
    async (source, key) => {
      if (!source || !key) return
      setAnalysis('loading')
      setAnalysisError('')
      setBoxes([])
      try {
        const detected = await analyzeBarnImage(source, key)
        setBoxes(detected)
        setAnalysis('done')
      } catch (error) {
        setAnalysisError(error.message || 'Gemini analysis failed')
        setAnalysis('error')
      }
    },
    [],
  )

  useEffect(() => {
    const key = getGeminiKey()
    setApiKey(key)
    if (!crop?.src || !key) return
    runAnalysis(crop.src, key)
  }, [crop?.src, runAnalysis])

  const handleMarkBarns = () => {
    if (!crop?.src) return
    if (!apiKey) {
      setShowKeyInput(true)
      return
    }
    runAnalysis(crop.src, apiKey)
  }

  const handleSaveKey = () => {
    const key = keyDraft.trim()
    saveGeminiKey(key)
    setApiKey(key)
    setShowKeyInput(false)
    if (key && crop?.src) runAnalysis(crop.src, key)
  }

  const analysisLabel =
    analysis === 'loading'
      ? 'Gemini is checking for barns…'
      : analysis === 'done'
        ? `${boxes.length} barn${boxes.length === 1 ? '' : 's'} boxed by Gemini`
        : analysis === 'error'
          ? analysisError
          : apiKey
            ? 'Gemini barn detection ready'
            : 'Save a Gemini key to mark barns'

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950"
      >
        {crop ? (
          <img
            ref={imageRef}
            src={crop.src}
            alt={`Crop for ${detectionId}`}
            draggable={false}
            onLoad={measureImage}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.9),rgba(2,6,23,1))]">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
              {status === 'loading' ? 'Loading crop…' : 'No crop available'}
            </p>
          </div>
        )}

        {imageRect
          ? boxes.map((item, index) => {
              const [yMin, xMin, yMax, xMax] = (item.box_2d ?? []).map(normalizeBox)
              if (xMax <= xMin || yMax <= yMin) return null
              return (
                <div
                  key={`barn-${index}`}
                  className={`pointer-events-none absolute border-2 ${confidenceClass[item.confidence] ?? confidenceClass.low}`}
                  style={{
                    left: imageRect.left + (xMin / 1000) * imageRect.width,
                    top: imageRect.top + (yMin / 1000) * imageRect.height,
                    width: ((xMax - xMin) / 1000) * imageRect.width,
                    height: ((yMax - yMin) / 1000) * imageRect.height,
                  }}
                >
                  <span className="absolute -top-4 left-0 whitespace-nowrap rounded border border-current bg-slate-950/85 px-1 font-mono text-[7.5px]">
                    #{index + 1} · {item.confidence ?? 'low'}
                  </span>
                </div>
              )
            })
          : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-slate-950/10" />
        {status === 'ready' ? (
          <div className="pointer-events-none absolute left-2 top-2 rounded border border-cyan-500/40 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.14em] text-cyan-300">
            Candidate crop
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute h-px w-7 -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '50%', backgroundColor: color }}
        />
        <div
          className="pointer-events-none absolute h-7 w-px -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '50%', backgroundColor: color }}
        />
        <div
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950"
          style={{
            left: '50%',
            top: '50%',
            backgroundColor: color,
            boxShadow: `0 0 0 2px ${color}55, 0 0 18px ${color}aa`,
          }}
        />
        <div className="pointer-events-none absolute bottom-2 left-2 rounded border border-slate-700/70 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8.5px] text-slate-400">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-slate-700/70 bg-slate-950/80 px-1.5 py-0.5 font-mono text-[8.5px] text-slate-500">
          {crop ? 'API crop' : 'No imagery'}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`min-w-0 font-mono text-[8px] ${analysis === 'error' ? 'text-red-300' : 'text-slate-500'}`}
        >
          {analysisLabel}
        </p>
        <button
          type="button"
          onClick={handleMarkBarns}
          disabled={!crop?.src || analysis === 'loading'}
          className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles size={9} />
          {analysis === 'loading' ? 'Checking…' : 'Mark barns'}
        </button>
      </div>

      {showKeyInput ? (
        <div className="mt-1.5 flex gap-1.5">
          <input
            type="password"
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
            placeholder="Gemini API key"
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950/70 px-2 py-1 font-mono text-[9px] text-slate-200 outline-none focus:border-emerald-400/60"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            disabled={!keyDraft.trim()}
            className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
          >
            Save & detect
          </button>
        </div>
      ) : null}
    </div>
  )
}
