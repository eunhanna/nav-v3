export type BackdropProfile = {
  tone: 'light' | 'dark'
  texture: 'calm' | 'mixed' | 'busy'
}

const FALLBACK_PROFILE: BackdropProfile = { tone: 'dark', texture: 'mixed' }

function extractImageUrl(background: string) {
  const match = background.match(/url\((['"]?)(.*?)\1\)/i)
  return match?.[2]
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = source
  })
}

function profilePixels(data: Uint8ClampedArray): BackdropProfile {
  let luminanceTotal = 0
  let luminanceSquaredTotal = 0
  const count = data.length / 4

  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255
    luminanceTotal += luminance
    luminanceSquaredTotal += luminance * luminance
  }

  const average = luminanceTotal / count
  const deviation = Math.sqrt(Math.max(0, luminanceSquaredTotal / count - average * average))
  return {
    tone: average > 0.58 ? 'light' : 'dark',
    texture: deviation > 0.24 ? 'busy' : deviation > 0.12 ? 'mixed' : 'calm',
  }
}

async function inspectImage(searchBox: HTMLElement, source: string): Promise<BackdropProfile> {
  const image = await loadImage(source)
  const rect = searchBox.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const scale = Math.max(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight)
  const renderedWidth = image.naturalWidth * scale
  const renderedHeight = image.naturalHeight * scale
  const offsetX = (renderedWidth - viewportWidth) / 2
  const offsetY = (renderedHeight - viewportHeight) / 2
  const sourceX = Math.max(0, (rect.left + offsetX) / scale)
  const sourceY = Math.max(0, (rect.top + offsetY) / scale)
  const sourceWidth = Math.min(image.naturalWidth - sourceX, rect.width / scale)
  const sourceHeight = Math.min(image.naturalHeight - sourceY, rect.height / scale)
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 8
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || sourceWidth <= 0 || sourceHeight <= 0) return FALLBACK_PROFILE
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return profilePixels(context.getImageData(0, 0, canvas.width, canvas.height).data)
}

export async function inspectSearchBackdrop(
  searchBox: HTMLElement,
  background: string,
): Promise<BackdropProfile> {
  const imageUrl = extractImageUrl(background)
  if (imageUrl) {
    try {
      return await inspectImage(searchBox, imageUrl)
    } catch {
      return FALLBACK_PROFILE
    }
  }

  // Built-in wallpapers are translucent gradients over a known dark-to-teal base.
  return { tone: 'dark', texture: background.includes('radial-gradient') ? 'mixed' : 'calm' }
}
