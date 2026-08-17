'use client'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''

export const isApiConfigured = API_URL.length > 0

export interface AuthUser { id: string; email: string }
export interface AuthSession { accessToken: string; user: AuthUser }

let accessToken = ''
let restorePromise: Promise<AuthSession> | null = null

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isApiConfigured) throw new Error('api_not_configured')
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? `request_failed_${response.status}`)
  return body as T
}

function remember(session: AuthSession) {
  accessToken = session.accessToken
  return session
}

export async function requestLoginCode(email: string) {
	return request<{ status: 'accepted' }>('/auth/code/request', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function verifyLoginCode(email: string, code: string) {
	return remember(await request<AuthSession>('/auth/code/verify', { method: 'POST', body: JSON.stringify({ email, code }) }))
}

export async function restoreSession() {
  if (!restorePromise) {
    restorePromise = request<AuthSession>('/auth/refresh', { method: 'POST' }).then(remember).finally(() => { restorePromise = null })
  }
  return restorePromise
}

export async function logout() {
  try { await request<null>('/auth/logout', { method: 'POST' }) } finally { accessToken = '' }
}

export function currentAccessToken() { return accessToken }
