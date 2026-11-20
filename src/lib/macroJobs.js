const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'DONE', 'SUCCESS'])

export const isActiveMacroJob = (job) => {
  const value = `${String(job?.status ?? '')} ${String(job?.progress_status ?? '')}`.toUpperCase()
  if (TERMINAL_STATUSES.has(String(job?.status ?? '').toUpperCase())) return false
  return /RUNNING|IN_PROGRESS|PROGRESS|ACTIVE|PENDING|QUEUED|STARTING/.test(value)
}

export const isResumableMacroJob = (job) => {
  const status = String(job?.status ?? '').toUpperCase()
  return status !== 'COMPLETED' && !isActiveMacroJob(job)
}
