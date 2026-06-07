import type { User } from '../types'
import { apiUrl } from '../config/app'

const tokenKey = 'decisionlog:token'
const userKey = 'decisionlog:user'

export function getInitialAuthError() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const oidcError = params.get('auth_error')

  if (!oidcError) return null

  return params.get('auth_message') || 'Sua conta não possui autorização para acessar esta empresa no DecisionLog.'
}

export function getInitialInviteCode() {
  return new URLSearchParams(window.location.search).get('convite')?.toUpperCase() || ''
}

export function getInitialResetToken() {
  return new URLSearchParams(window.location.search).get('resetToken') || ''
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string }
    return data.error || fallback
  } catch {
    return fallback
  }
}

export function readStoredToken() {
  return localStorage.getItem(tokenKey) || ''
}

export function readStoredUser() {
  const storedUser = localStorage.getItem(userKey)
  return storedUser ? (JSON.parse(storedUser) as User) : null
}

export function persistSession(token: string, user: User) {
  localStorage.setItem(tokenKey, token)
  localStorage.setItem(userKey, JSON.stringify(user))
}

export function persistToken(token: string) {
  localStorage.setItem(tokenKey, token)
}

export function persistUser(user: User) {
  localStorage.setItem(userKey, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(tokenKey)
  localStorage.removeItem(userKey)
}

export async function refreshSession() {
  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Sessão expirada.')
  }

  const data = (await response.json()) as { token: string; user: User }
  persistSession(data.token, data.user)
  return data
}

export async function requestLogout() {
  await fetch(`${apiUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined)
  clearSession()
}
