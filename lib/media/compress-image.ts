"use client"

// Compressão de imagem no navegador para a ferramenta "Comprimir mídia":
// preserva o enquadramento (NÃO corta como o compressImageToMaxSize do crop),
// só reduz peso — opcionalmente reescala se a imagem for gigante. Sempre
// devolve um resultado (best-effort), porque é uma ferramenta, não um gate.

export interface CompressedImageResult {
  blob: Blob
  fileName: string
  width: number
  height: number
}

const MAX_DIMENSION = 2560 // teto de lado maior (downscale só acima disso)

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Não foi possível carregar essa imagem."))
    img.src = url
  })
}

function draw(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Não foi possível preparar a imagem.")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao otimizar."))),
      type,
      quality,
    )
  })
}

function renameTo(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "imagem"
  return `${base}-comprimida.${ext}`
}

/**
 * Comprime tentando ficar <= targetBytes. Reduz qualidade e, se preciso,
 * reescala. Se não alcançar o alvo, devolve a menor versão que conseguiu.
 */
export async function compressImage(
  file: File,
  targetBytes: number,
): Promise<CompressedImageResult> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    const baseScale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
    const mime = "image/webp"
    let best: { blob: Blob; w: number; h: number } | null = null

    for (let s = baseScale; s >= 0.3; s -= 0.15) {
      const w = Math.max(160, Math.round(img.naturalWidth * s))
      const h = Math.max(160, Math.round(img.naturalHeight * s))
      const canvas = draw(img, w, h)
      for (let q = 0.82; q >= 0.4; q -= 0.1) {
        const blob = await toBlob(canvas, mime, q)
        if (!best || blob.size < best.blob.size) best = { blob, w, h }
        if (blob.size <= targetBytes) {
          return { blob, fileName: renameTo(file.name, "webp"), width: w, height: h }
        }
      }
    }

    if (!best) throw new Error("Não foi possível comprimir essa imagem.")
    return { blob: best.blob, fileName: renameTo(file.name, "webp"), width: best.w, height: best.h }
  } finally {
    URL.revokeObjectURL(url)
  }
}
