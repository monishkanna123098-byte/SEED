import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ApiError } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // Required for httpOnly refresh token cookie
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track if we're currently refreshing to avoid infinite loops
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

function onRefreshed(newToken: string) {
  pendingRequests.forEach((cb) => cb(newToken))
  pendingRequests = []
}

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401s with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await api.post<{ accessToken: string }>('/auth/refresh')
        const newToken = response.data.accessToken
        storeAccessToken(newToken)
        onRefreshed(newToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return api(originalRequest)
      } catch {
        // Refresh failed — clear auth state
        clearStoredAccessToken()
        pendingRequests = []
        // Signal to the app that user needs to re-login
        window.dispatchEvent(new CustomEvent('seed:auth:expired'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Token Storage (in-memory primary, sessionStorage fallback) ────────────
// Access tokens are short-lived (15min) — stored in memory, not localStorage
let inMemoryToken: string | null = null

export function storeAccessToken(token: string): void {
  inMemoryToken = token
}

export function getStoredAccessToken(): string | null {
  return inMemoryToken
}

export function clearStoredAccessToken(): void {
  inMemoryToken = null
}

// ─── Typed API error extractor ────────────────────────────────────────────
export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    if (data?.error) return data.error
    if (data?.details?.length) return data.details.map((d) => d.message).join('. ')
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
