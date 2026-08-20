'use client'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''

export const isApiConfigured = API_URL.length > 0

export type UserRole = 'user' | 'admin'
export interface AuthUser {
  id: string
  email: string
  role: UserRole
}
export interface AuthSession {
  accessToken: string
  user: AuthUser
}
export interface PublicSite {
  id: string
  name: string
  url: string
  category: string
  iconUrl?: string
  fallbackIcon: string
  fallbackColor?: string
  enabled: boolean
  position: number
  createdAt: string
  updatedAt: string
}

let accessToken = ''
let restorePromise: Promise<AuthSession> | null = null

function canRefreshAfterUnauthorized(path: string) {
  return !['/auth/refresh', '/auth/password/login', '/auth/code/verify'].includes(path)
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retriedAfterRefresh = false,
): Promise<T> {
  if (!isApiConfigured) throw new Error('api_not_configured')
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (response.status === 401 && !retriedAfterRefresh && canRefreshAfterUnauthorized(path)) {
    await restoreSession()
    return request<T>(path, init, true)
  }
  if (!response.ok) throw new Error(body?.error ?? `request_failed_${response.status}`)
  return body as T
}

function remember(session: AuthSession) {
  accessToken = session.accessToken
  return session
}

export async function requestLoginCode(email: string) {
  return request<{ status: 'accepted' }>('/auth/code/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyLoginCode(email: string, code: string) {
  return remember(
    await request<AuthSession>('/auth/code/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  )
}
export async function loginWithPassword(email: string, password: string) {
  return remember(
    await request<AuthSession>('/auth/password/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  )
}
export async function setupPassword(password: string) {
  return request<null>('/auth/password/setup', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}
export async function resetPassword(email: string, code: string, password: string) {
  return request<null>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  })
}

export async function restoreSession() {
  if (!restorePromise) {
    restorePromise = request<AuthSession>('/auth/refresh', { method: 'POST' })
      .then(remember)
      .finally(() => {
        restorePromise = null
      })
  }
  return restorePromise
}

export async function getCurrentUser() {
  const response = await request<{ user: AuthUser }>('/me')
  return response.user
}
export function getPublicSites() {
  return request<{ sites: PublicSite[] }>('/public/sites')
}
export async function logout() {
  try {
    await request<null>('/auth/logout', { method: 'POST' })
  } finally {
    accessToken = ''
  }
}

export function currentAccessToken() {
  return accessToken
}
