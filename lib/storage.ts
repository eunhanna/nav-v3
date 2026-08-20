'use client'
import { APP_STORAGE_KEY, AppState, ThemeId, defaultState } from './constants'

const PUBLIC_SITES_CACHE_KEY = 'nova-public-sites-v1'

export function loadState(): AppState {
  if (typeof window === 'undefined') return structuredClone(defaultState)
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY)
    if (!raw) return structuredClone(defaultState)
    const saved = JSON.parse(raw) as Partial<Omit<AppState, 'theme'>> & { theme?: unknown }
    const savedTheme = typeof saved.theme === 'string' ? saved.theme : undefined
    const theme: ThemeId =
      savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
        ? savedTheme
        : defaultState.theme
    const wallpaper =
      typeof saved.wallpaper === 'number' && saved.wallpaper >= 0 && saved.wallpaper <= 3
        ? saved.wallpaper
        : defaultState.wallpaper
    return {
      ...structuredClone(defaultState),
      ...saved,
      theme,
      wallpaper,
      settings: { ...defaultState.settings, ...saved.settings },
      categories: saved.categories ?? defaultState.categories,
      // 公共网站入口只来自服务端；不再恢复旧版保存的自定义入口。
      sites: [],
    }
  } catch {
    return structuredClone(defaultState)
  }
}
export function saveState(state: AppState) {
  if (typeof window !== 'undefined') localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state))
}

export function loadPublicSitesCache(): AppState['sites'] | null {
  if (typeof window === 'undefined') return null
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PUBLIC_SITES_CACHE_KEY) ?? 'null')
    if (!Array.isArray(value)) return null
    return value.filter(
      (site): site is AppState['sites'][number] =>
        typeof site === 'object' &&
        site !== null &&
        typeof (site as { id?: unknown }).id === 'number' &&
        typeof (site as { name?: unknown }).name === 'string' &&
        typeof (site as { url?: unknown }).url === 'string' &&
        typeof (site as { category?: unknown }).category === 'string' &&
        typeof (site as { color?: unknown }).color === 'string' &&
        typeof (site as { icon?: unknown }).icon === 'string',
    )
  } catch {
    return null
  }
}

export function savePublicSitesCache(sites: AppState['sites']) {
  if (typeof window !== 'undefined') localStorage.setItem(PUBLIC_SITES_CACHE_KEY, JSON.stringify(sites))
}
