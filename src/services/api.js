// Same origin by default: the Vite dev/preview proxy and Vercel rewrites both
// forward /api and /health to the deployed backend. Set VITE_API_BASE_URL only
// when serving the built files without a proxy.
const DEFAULT_BASE_URL = ''

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

export const API_BASE_URL = (configuredBaseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')

export const API_KEY = (import.meta.env.VITE_API_KEY || '').trim()

const TOKEN_KEY = 'kutsaga.token'
const USER_KEY = 'kutsaga.user'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const storeUser = (user) => {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* storage unavailable */
  }
}

const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const clearSession = () => {
  setToken(null)
  storeUser(null)
}

export const hasCredentials = () => Boolean(getToken() || API_KEY)

const authHeaders = () => {
  const headers = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  } else if (API_KEY) {
    headers['X-API-Key'] = API_KEY
  }
  return headers
}

const toQuery = (params = {}) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, value)
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

const extractDetail = async (response) => {
  try {
    const data = await response.json()
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail) && data.detail.length) {
      return data.detail
        .map((item) => item?.msg ?? JSON.stringify(item))
        .join('; ')
    }
    if (data?.message) return data.message
  } catch {
    /* not JSON */
  }
  return null
}

const request = async (path, { method = 'GET', body, headers = {}, signal } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    clearSession()
    throw new ApiError('Your session expired. Please sign in again.', 401)
  }

  if (!response.ok) {
    const detail = await extractDetail(response)
    throw new ApiError(detail || `Request failed (${response.status})`, response.status)
  }

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()
  return response.text()
}

export const login = async (username, password) => {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  })
  setToken(data.access_token)
  storeUser(data.user ?? null)
  return data.user ?? { username }
}

export const fetchCurrentUser = async (signal) => {
  const user = await request('/api/v1/auth/me', { signal })
  storeUser(user)
  return user
}

export const logout = () => clearSession()

export const getHealth = () => request('/health/ready')

export const submitScan = ({ name, aoi, confidenceThreshold }) =>
  request('/api/v1/scans', {
    method: 'POST',
    body: {
      name,
      aoi,
      confidence_threshold: confidenceThreshold,
    },
  })

export const getScanStatus = (jobId, signal) =>
  request(`/api/v1/scans/${jobId}`, { signal })

export const getCandidates = (params = {}, signal) =>
  request(`/api/v1/candidates${toQuery(params)}`, { signal })

export const getCandidateCounts = (params = {}, signal) =>
  request(`/api/v1/candidates/counts${toQuery(params)}`, { signal })

export const verifyCandidate = (complexId, payload) =>
  request(`/api/v1/candidates/${complexId}/verify`, {
    method: 'PATCH',
    body: payload,
  })

export const listMacroBoundaries = (signal) =>
  request('/api/v1/admin/macro-scans/boundaries', { signal })

export const getMacroEstimate = (boundaryId, signal) =>
  request(`/api/v1/admin/macro-scans/estimate/${encodeURIComponent(boundaryId)}`, {
    signal,
  })

export const listMacroScans = (signal) =>
  request('/api/v1/admin/macro-scans', { signal })

export const launchMacroScan = ({ boundaryId, name, confidenceThreshold }) =>
  request('/api/v1/admin/macro-scans', {
    method: 'POST',
    body: {
      boundary_id: boundaryId,
      name: name ?? null,
      confidence_threshold: confidenceThreshold,
    },
  })

export const resumeMacroScan = (jobId) =>
  request(`/api/v1/admin/macro-scans/${encodeURIComponent(jobId)}/resume`, {
    method: 'POST',
  })

const sourceFromCropData = (data) => {
  if (!data) return null
  if (typeof data === 'string') {
    const value = data.trim()
    if (/^(data:|https?:|\/)/i.test(value)) return value
    if (/^(iVBORw0KGgo|\/9j\/)/.test(value)) return `data:image/png;base64,${value}`
    return null
  }
  if (typeof data !== 'object') return null
  const keys = [
    'image_url',
    'crop_url',
    'url',
    'image',
    'image_base64',
    'crop_base64',
    'png_base64',
    'jpeg_base64',
    'image_data',
    'base64',
    'data',
    'crop',
  ]
  for (const key of keys) {
    const value = sourceFromCropData(data[key])
    if (value) return value
  }
  return null
}

export const getCandidateCrop = async (complexId, signal) => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/candidates/${encodeURIComponent(complexId)}/crop`,
    { headers: authHeaders(), signal },
  )

  if (response.status === 401) {
    clearSession()
    throw new ApiError('Your session expired. Please sign in again.', 401)
  }
  if (!response.ok) {
    const detail = await extractDetail(response)
    throw new ApiError(detail || `Crop unavailable (${response.status})`, response.status)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('image/')) {
    const blob = await response.blob()
    return { src: URL.createObjectURL(blob), objectUrl: true }
  }

  let data
  try {
    data = await response.json()
  } catch {
    return null
  }
  const src = sourceFromCropData(data)
  return src ? { src, objectUrl: false } : null
}

export const getGroundTruth = (params = {}, signal) =>
  request(`/api/v1/ground-truth${toQuery(params)}`, { signal })

export const exportRejectedNegatives = () =>
  request('/api/v1/active-learning/export', { method: 'POST' })
