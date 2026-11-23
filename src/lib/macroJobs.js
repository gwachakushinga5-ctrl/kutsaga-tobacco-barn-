const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'DONE', 'SUCCESS'])

const CELL_SUFFIX =
  /(?:[\s·|/_-]*(?:cell|subsector|sub-sector|chunk|batch|tile|sector|part)[\s#:-]*\d+(?:\s*of\s*\d+)?|[\s·|/_-]*#\d+|[\s·|/_-]*\(\d+\)|[\s·|/_-]*\[[^\]]*\d+[^\]]*\]|[\s·|/_-]*\d+\s*\/\s*\d+)$/i

export const isActiveMacroJob = (job) => {
  const value = `${String(job?.status ?? '')} ${String(job?.progress_status ?? '')}`.toUpperCase()
  if (TERMINAL_STATUSES.has(String(job?.status ?? '').toUpperCase())) return false
  return /RUNNING|IN_PROGRESS|PROGRESS|ACTIVE|PENDING|QUEUED|STARTING/.test(value)
}

export const isResumableMacroJob = (job) => {
  const status = String(job?.status ?? '').toUpperCase()
  return status !== 'COMPLETED' && !isActiveMacroJob(job)
}

const provinceKeyOf = (job) => {
  const explicit =
    job?.province ?? job?.boundary_name ?? job?.boundaryName ?? job?.cell?.province
  if (explicit) return String(explicit).trim()

  const name = String(job?.name ?? '')
    .replace(/^MACRO:\s*/i, '')
    .replace(CELL_SUFFIX, '')
    .replace(/[\s·|/_-]+$/, '')
    .trim()

  return name || 'Unknown province'
}

export const groupMacroJobsByProvince = (jobs) => {
  const groups = new Map()
  const list = Array.isArray(jobs) ? jobs : []

  list.forEach((job) => {
    const province = provinceKeyOf(job)
    if (!groups.has(province)) groups.set(province, [])
    groups.get(province).push(job)
  })

  return [...groups.entries()]
    .map(([province, provinceJobs]) => {
      const sorted = [...provinceJobs].sort(
        (a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0),
      )
      const newest = sorted[0]
      const active = provinceJobs.some(isActiveMacroJob)
      const allCompleted = provinceJobs.every(
        (job) => String(job?.status ?? '').toUpperCase() === 'COMPLETED',
      )
      const status = active
        ? newest.progress_status || newest.status
        : allCompleted
          ? 'COMPLETED'
          : newest.progress_status || newest.status

      return {
        key: province,
        label: province,
        jobs: sorted,
        newest,
        active,
        status,
        totalTiles: provinceJobs.reduce((sum, job) => sum + Number(job?.total_tiles ?? 0), 0),
        processedTiles: provinceJobs.reduce(
          (sum, job) => sum + Number(job?.processed_tiles ?? 0),
          0,
        ),
        resumable: sorted.find(isResumableMacroJob) ?? null,
      }
    })
    .sort((a, b) => Date.parse(b.newest.created_at ?? 0) - Date.parse(a.newest.created_at ?? 0))
}
