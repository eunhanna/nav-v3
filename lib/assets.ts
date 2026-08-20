const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')

/**
 * Returns a URL for a file in the application's public directory.
 * This is intentionally separate from page routes and external URLs.
 */
export function assetUrl(path: `/${string}`): string {
  return `${basePath}${path}`
}
