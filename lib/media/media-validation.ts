"use client"

export const POST_IMAGE_ASPECT_RATIO = 4 / 5
export const AVATAR_IMAGE_ASPECT_RATIO = 1
export const BEES_VIDEO_ASPECT_RATIO = 9 / 16
// Bees aceita qualquer ratio <= 0.6 (cobre 9:16 = 0.5625 com folga;
// alinhado com o backfill da migration 053).
export const BEES_VIDEO_ASPECT_RATIO_MAX = 0.6
export const POST_IMAGE_MAX_SIZE_BYTES = 3 * 1024 * 1024
export const AVATAR_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024
export const POST_IMAGE_OUTPUT = { width: 1080, height: 1350 }

/** Orientações que um post aceita — espelho de POST_ORIENTATIONS no backend
 *  (freelandoo-backend/src/utils/mediaProcessing.js). Se mudar de um lado,
 *  mudar do outro: é o backend que enquadra de verdade, isto aqui só decide o
 *  que o cortador oferece e o que passa direto sem cortar. */
export type PostOrientation = {
  id: "4:5" | "1:1" | "16:9"
  ratio: number
  width: number
  height: number
}

export const POST_ORIENTATIONS: PostOrientation[] = [
  { id: "4:5", ratio: 4 / 5, width: 1080, height: 1350 },
  { id: "1:1", ratio: 1, width: 1080, height: 1080 },
  { id: "16:9", ratio: 16 / 9, width: 1920, height: 1080 },
]
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

/** Orientação de post que a imagem já tem, ou null se não bate com nenhuma.
 *  Quem já está em uma delas não precisa passar pelo cortador. */
export function matchedPostOrientation(width: number, height: number): PostOrientation | null {
  return POST_ORIENTATIONS.find((o) => isAspectRatio(width, height, o.ratio)) ?? null
}

/** Orientação mais próxima — usada pra abrir o cortador já no formato certo.
 *  Mesma conta do backend: distância em escala log (3:4 fica igualmente longe
 *  de 1:1 e de 16:9) e, no empate, vence a que preserva deitado/em pé. */
export function nearestPostOrientation(width: number, height: number): PostOrientation {
  if (!width || !height) return POST_ORIENTATIONS[0]
  const exact = matchedPostOrientation(width, height)
  if (exact) return exact
  const ratio = width / height
  const ordered = ratio > 1 ? [...POST_ORIENTATIONS].reverse() : POST_ORIENTATIONS
  let best = ordered[0]
  let bestDist = Infinity
  for (const o of ordered) {
    const dist = Math.abs(Math.log(ratio / o.ratio))
    if (dist < bestDist - 1e-9) {
      bestDist = dist
      best = o
    }
  }
  return best
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

/**
 * Lê width/height de um arquivo de vídeo via <video> oculto.
 * Usado pra validar 9:16 nos uploads do Bees.
 */
export function getVideoDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.playsInline = true
    video.onloadedmetadata = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      URL.revokeObjectURL(url)
      if (!width || !height) {
        reject(new Error("Não foi possível ler esse vídeo. Tente outro arquivo."))
        return
      }
      resolve({ width, height, aspectRatio: width / height })
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Não foi possível ler esse vídeo. Tente outro arquivo."))
    }
    video.src = url
  })
}
