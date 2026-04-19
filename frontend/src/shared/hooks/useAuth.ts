import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'
import type { UserPublic, LoginResponse } from '@shared/types/user.types'

interface AuthState {
  user: Pick<UserPublic, 'id' | 'nameAr' | 'nameEn' | 'role' | 'preferredLanguage' | 'email'> | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Module-level state so all hook instances share the same user
let globalUser: AuthState['user'] = null

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: globalUser,
    isLoading: !globalUser && !!sessionStorage.getItem('accessToken'),
    isAuthenticated: Boolean(globalUser),
  })

  // Restore session on mount if access token exists but user not set
  useEffect(() => {
    if (!globalUser && sessionStorage.getItem('accessToken')) {
      apiClient
        .get<{ success: true; data: UserPublic }>('/auth/me')
        .then(({ data }) => {
          globalUser = data.data
          setState({ user: data.data, isLoading: false, isAuthenticated: true })
        })
        .catch(() => {
          sessionStorage.removeItem('accessToken')
          setState({ user: null, isLoading: false, isAuthenticated: false })
        })
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [])

  // Listen for auth:logout events from the API interceptor
  useEffect(() => {
    const handler = () => {
      globalUser = null
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{ success: true; data: LoginResponse }>('/auth/login', {
      email,
      password,
    })
    const { accessToken, user } = data.data
    sessionStorage.setItem('accessToken', accessToken)
    globalUser = user
    setState({ user, isLoading: false, isAuthenticated: true })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      sessionStorage.removeItem('accessToken')
      globalUser = null
      setState({ user: null, isLoading: false, isAuthenticated: false })
    }
  }, [])

  return { ...state, login, logout }
}
