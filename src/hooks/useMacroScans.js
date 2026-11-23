import { useCallback, useEffect, useMemo, useState } from 'react'
import { isActiveMacroJob, macroJobMatchesBoundary } from '../lib/macroJobs'
import {
  getMacroEstimate,
  launchMacroScan,
  listMacroBoundaries,
  listMacroScans,
  resumeMacroScan,
} from '../services/api'

const mergeJobs = (incoming, current) => {
  const byId = new Map(current.map((job) => [job.job_id, job]))
  incoming.forEach((job) => byId.set(job.job_id, job))
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0),
  )
}

const BOUNDARY_MAP_KEY = 'kutsaga.macroJobBoundaries'

const loadJobBoundaryIds = () => {
  try {
    const raw = localStorage.getItem(BOUNDARY_MAP_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const persistJobBoundaryIds = (map) => {
  try {
    localStorage.setItem(BOUNDARY_MAP_KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable */
  }
}

export const useMacroScans = ({ addToast, enabled = true, pollingEnabled = true }) => {
  const [boundaries, setBoundaries] = useState([])
  const [jobs, setJobs] = useState([])
  const [hiddenJobIds, setHiddenJobIds] = useState(() => new Set())
  const [jobBoundaryIds, setJobBoundaryIds] = useState(loadJobBoundaryIds)
  const [selectedBoundaryId, setSelectedBoundaryId] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [resumingId, setResumingId] = useState('')
  const [error, setError] = useState('')

  const loadBoundaries = useCallback(async () => {
    try {
      const data = await listMacroBoundaries()
      const items = Array.isArray(data) ? data : []
      setBoundaries(items)
      const national = items.find((item) => item.kind === 'national') ?? items[0]
      setSelectedBoundaryId((current) => current || national?.boundary_id || '')
    } catch (loadError) {
      setError(loadError.message || 'Unable to load national scan boundaries')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadJobs = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      const data = await listMacroScans()
      setJobs(Array.isArray(data) ? data : [])
      setError('')
    } catch (loadError) {
      if (!quiet) setError(loadError.message || 'Unable to load macro scan jobs')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  const selectedBoundary = useMemo(
    () => boundaries.find((item) => item.boundary_id === selectedBoundaryId) ?? null,
    [boundaries, selectedBoundaryId],
  )

  const visibleJobs = useMemo(() => {
    const withBoundary = jobs.map((job) =>
      jobBoundaryIds[job.job_id]
        ? { ...job, boundary_id: jobBoundaryIds[job.job_id] }
        : job,
    )
    return withBoundary.filter(
      (job) =>
        !hiddenJobIds.has(job.job_id) &&
        macroJobMatchesBoundary(job, selectedBoundary, selectedBoundaryId),
    )
  }, [hiddenJobIds, jobBoundaryIds, jobs, selectedBoundary, selectedBoundaryId])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setBoundaries([])
      setJobs([])
      setSelectedBoundaryId('')
      setEstimate(null)
      setError('')
      return undefined
    }
    loadBoundaries()
    loadJobs()
    return undefined
  }, [enabled, loadBoundaries, loadJobs])

  useEffect(() => {
    if (!enabled || !selectedBoundaryId) {
      setEstimate(null)
      return undefined
    }

    const controller = new AbortController()
    setEstimateLoading(true)
    getMacroEstimate(selectedBoundaryId, controller.signal)
      .then((data) => setEstimate(data))
      .catch((estimateError) => {
        if (estimateError?.name !== 'AbortError') setEstimate(null)
      })
      .finally(() => setEstimateLoading(false))

    return () => controller.abort()
  }, [enabled, selectedBoundaryId])

  useEffect(() => {
    if (!enabled || !pollingEnabled) return undefined
    const hasActiveJob = visibleJobs.some(isActiveMacroJob)
    const interval = window.setInterval(
      () => loadJobs({ quiet: true }),
      hasActiveJob ? 5000 : 15000,
    )
    return () => window.clearInterval(interval)
  }, [enabled, pollingEnabled, visibleJobs, loadJobs])

  const launch = useCallback(
    async (confidence) => {
      if (!enabled) {
        addToast('Admin role required to launch national scans', 'error')
        return null
      }
      if (!selectedBoundaryId) {
        addToast('Select a national or provincial boundary first', 'error')
        return null
      }

      setLaunching(true)
      try {
        const result = await launchMacroScan({
          boundaryId: selectedBoundaryId,
          name: estimate?.name ? `MACRO: ${estimate.name}` : null,
          confidenceThreshold: confidence,
        })
        const launchedJobs = Array.isArray(result?.jobs) ? result.jobs : []
        setJobs((current) => mergeJobs(launchedJobs, current))
        if (launchedJobs.length) {
          const nextMap = { ...jobBoundaryIds }
          launchedJobs.forEach((job) => {
            nextMap[job.job_id] = selectedBoundaryId
          })
          setJobBoundaryIds(nextMap)
          persistJobBoundaryIds(nextMap)
        }
        addToast(
          `${result?.job_count ?? launchedJobs.length} unattended macro scan job${
            result?.job_count === 1 ? '' : 's'
          } queued`,
          'success',
        )
        return result
      } catch (launchError) {
        addToast(launchError.message || 'Unable to launch the macro scan', 'error')
        return null
      } finally {
        setLaunching(false)
      }
    },
    [addToast, enabled, estimate?.name, jobBoundaryIds, selectedBoundaryId],
  )

  const resume = useCallback(
    async (jobId) => {
      if (!enabled) {
        addToast('Admin role required to resume national scans', 'error')
        return false
      }
      setResumingId(jobId)
      try {
        await resumeMacroScan(jobId)
        await loadJobs({ quiet: true })
        addToast('Macro scan re-enqueued', 'success')
        return true
      } catch (resumeError) {
        addToast(resumeError.message || 'Unable to resume the macro scan', 'error')
        return false
      } finally {
        setResumingId('')
      }
    },
    [addToast, enabled, loadJobs],
  )

  const hideJob = useCallback(
    (jobIdOrIds) => {
      const ids = Array.isArray(jobIdOrIds) ? jobIdOrIds : [jobIdOrIds]
      setHiddenJobIds((current) => {
        const next = new Set(current)
        ids.forEach((id) => next.add(id))
        return next
      })
      addToast(
        `${ids.length} macro job${ids.length === 1 ? '' : 's'} hidden from this list. The backend job${
          ids.length === 1 ? ' is' : 's are'
        } unchanged.`,
        'info',
      )
    },
    [addToast],
  )

  return {
    boundaries,
    jobs: visibleJobs,
    selectedBoundaryId,
    setSelectedBoundaryId,
    estimate,
    loading,
    estimateLoading,
    launching,
    resumingId,
    error,
    launch,
    resume,
    hideJob,
    refreshJobs: loadJobs,
  }
}
