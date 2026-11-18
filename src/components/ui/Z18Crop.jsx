import { useEffect, useState } from 'react'
import { getCandidateCrop } from '../../services/api'

export const Z18Crop = ({ detectionId, lat, lng, color = '#22d3ee' }) => {
  const [crop, setCrop] = useState(null)
  const [status, setStatus] = useState(detectionId ? 'loading' : 'empty')

  useEffect(() => {
    if (!detectionId) {
      setCrop(null)
      setStatus('empty')
      return undefined
    }

    let active = true
    let loaded = null
    const controller = new AbortController()
    setCrop(null)
    setStatus('loading')

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

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
      {crop ? (
        <img
          src={crop.src}
          alt={`Crop for ${detectionId}`}
          draggable={false}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.9),rgba(2,6,23,1))]">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
            {status === 'loading' ? 'Loading crop…' : 'No crop available'}
          </p>
        </div>
      )}
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
  )
}
