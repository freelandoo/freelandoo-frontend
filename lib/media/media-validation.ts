"use client"

export const POST_IMAGE_ASPECT_RATIO = 4 / 5
export const AVATAR_IMAGE_ASPECT_RATIO = 1
export const POST_IMAGE_MAX_SIZE_BYTES = 3 * 1024 * 1024
export const AVATAR_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024
export const POST_IMAGE_OUTPUT = { width: 1080, height: 1350 }
export const AVATAR_IMAGE_OUTPUT = { width: 800, height: 800 }
export const ASPECT_RATIO_TOLERANCE = 0.01

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

export type ImageDimensions = {
  width: number
  height: number
  aspectRatio: number
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** idx
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

export function isAspectRatio(
  width: number,
  height: number,
  targetRatio: number,
  tolerance = ASPECT_RATIO_TOLERANCE
): boolean {
  if (!width || !height) return false
  return Math.abs(width / height - targetRatio) <= tolerance
}

export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Não foi possível ler essa imagem. Tente outro arquivo."))
    }
    img.src = url
  })
}

export function validateImageFile(file: File, maxSizeBytes: number) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false as const, error: "Formato não aceito. Envie JPG, PNG ou WebP." }
  }
  if (file.size > Math.max(maxSizeBytes * 6, 20 * 1024 * 1024)) {
    return {
      ok: false as const,
      error: "Essa imagem é muito grande para otimizar. Tente outra imagem.",
    }
  }
  return { ok: true as const }
}

export function validateVideoFile(file: File) {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { ok: false as const, error: "Formato de vídeo não aceito. Envie MP4 ou WebM." }
  }
  if (file.size > 100 * 1024 * 1024) {
    return { ok: false as const, error: "O vídeo precisa ter no máximo 100MB." }
  }
  return { ok: true as const }
}
