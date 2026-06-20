import { create } from 'zustand'
import { User, LoginResponse, RegisterResponse, InviteValidationResponse } from '@/types'
import { api, storeAccessToken, clearStoredAccessToken, extractApiError } from '@/utils/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterPayload) => Promise<RegisterResponse>
  logout: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  validateInviteCode: (code: string) => Promise<InviteValidationResponse>
  generateInviteCode: (expiryDays?: number) => Promise<{ code: string; expiresAt: string }>
  clearError: () => void
}

interface RegisterPayload {
  email: string
  password: string
  name: string
  role: 'PARENT' | 'CLINICIAN'
  inviteCode?: string
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      // Attempt silent refresh on app load to restore session
      const response = await api.post<LoginResponse>('/auth/refresh')
      storeAccessToken(response.data.accessToken)
      set({ user: response.data.user, isInitialized: true })
    } catch {
      // No valid session — user needs to log in
      clearStoredAccessToken()
      set({ user: null, isInitialized: true })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<LoginResponse>('/auth/login', { email, password })
      storeAccessToken(response.data.accessToken)
      set({ user: response.data.user, isLoading: false })
    } catch (err) {
      const message = extractApiError(err)
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  register: async (data: RegisterPayload) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<RegisterResponse>('/auth/register', data)
      set({ isLoading: false })
      return response.data
    } catch (err) {
      const message = extractApiError(err)
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await api.post('/auth/logout')
    } catch {
      // Proceed with local logout even if server call fails
    } finally {
      clearStoredAccessToken()
      set({ user: null, isLoading: false, error: null })
    }
  },

  verifyEmail: async (token: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(`/auth/verify-email/${token}`)
      set({ isLoading: false })
    } catch (err) {
      const message = extractApiError(err)
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  validateInviteCode: async (code: string) => {
    const response = await api.post<InviteValidationResponse>('/auth/validate-invite', { code })
    return response.data
  },

  generateInviteCode: async (expiryDays?: number) => {
    const response = await api.post<{ code: string; expiresAt: string; message: string }>(
      '/auth/clinician/invite-code',
      expiryDays ? { expiryDays } : {}
    )
    return { code: response.data.code, expiresAt: response.data.expiresAt }
  },

  clearError: () => set({ error: null }),
}))

// Listen for global auth expiry events (fired by axios interceptor)
window.addEventListener('seed:auth:expired', () => {
  clearStoredAccessToken()
  useAuthStore.setState({ user: null, error: 'Your session has expired. Please log in again.' })
})
