'use client'
import { APP_STORAGE_KEY, AppState, defaultState } from './constants'

export function loadState(): AppState {
  if (typeof window === 'undefined') return structuredClone(defaultState)
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) return structuredClone(defaultState)
    const saved = JSON.parse(raw) as Partial<AppState>
    return { ...structuredClone(defaultState), ...saved, settings: { ...defaultState.settings, ...saved.settings }, categories: saved.categories ?? defaultState.categories, sites: saved.sites ?? defaultState.sites }
  } catch { return structuredClone(defaultState) }
}
export function saveState(state: AppState) {
  if (typeof window !== 'undefined') localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state))
}
