"use client"

import { formatBytes } from "./media-validation"

export type CropTransform = {
  zoom: number
  position: { x: number; y: number }
  frameWidth: number
  frameHeight: number
}

export type ProcessedImage = {
  file: File
  width: number
  height: number
  sizeBytes: number
  mimeType: string
  previewUrl: string
}

type ImageOutputOptions = {
  outputWidth: number
  outputHeight: number
  maxSizeBytes: number
  fileName?: string
  mimeType?: "image/webp" | "image/jpeg"
  errorMessage?: string
}

function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Não foi possível carregar essa imagem."))
    }
    image.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Não foi possível otimizar esse arquivo. Tente outro."))
      },
      type,
      quality
    )
  })
}

function extForMime(mimeType: string) {
  return mimeType === "image/webp" ? "webp" : "jpg"
}

function outputName(originalName: string, mimeType: string) {
  const base = originalName.replace(/\.[^.]+$/, "") || "imagem"
  return `${base}.${extForMime(mimeType)}`
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Não foi possível preparar a imagem.")
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  return { canvas, ctx }
}

function drawCenterCrop(
  image: HTMLImageElement,
  outputWidth: number,
  outputHeight: number
) {
  const { canvas, ctx } = makeCanvas(outputWidth, outputHeight)
  const targetRatio = outputWidth / outputHeight
  const sourceRatio = image.naturalWidth / image.naturalHeight

  let sx = 0
  let sy = 0
  let sw = image.naturalWidth
  let sh = image.naturalHeight

  if (sourceRatio > targetRatio) {
    sw = image.naturalHeight * targetRatio
    sx = (image.naturalWidth - sw) / 2
  } else if (sourceRatio < targetRatio) {
    sh = image.naturalWidth / targetRatio
    sy = (image.naturalHeight - sh) / 2
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight)
  return canvas
}

function drawManualCrop(
  image: HTMLImageElement,
  crop: CropTransform,
  outputWidth: number,
  outputHeight: number
) {
  const { canvas, ctx } = makeCanvas(outputWidth, outputHeight)
  const frameRatio = crop.frameWidth / crop.frameHeight
  const imageRatio = image.naturalWidth / image.naturalHeight

  let baseWidth: number
  let baseHeight: number
  if (imageRatio > frameRatio) {
    baseHeight = crop.frameHeight
    baseWidth = crop.frameHeight * imageRatio
  } else {
    baseWidth = crop.frameWidth
    baseHeight = crop.frameWidth / imageRatio
  }

  const renderWidth = baseWidth * crop.zoom
  const renderHeight = baseHeight * crop.zoom
  const leftInRendered = (renderWidth - crop.frameWidth) / 2 - crop.position.x
  const topInRendered = (renderHeight - crop.frameHeight) / 2 - crop.position.y

  const sx = Math.max(0, leftInRendered * (image.naturalWidth / renderWidth))
  const sy = Math.max(0, topInRendered * (image.naturalHeight / renderHeight))
  const sw = Math.min(image.naturalWidth - sx, crop.frameWidth * (image.naturalWidth / renderWidth))
  const sh = Math.min(image.naturalHeight - sy, crop.frameHeight * (image.naturalHeight / renderHeight))

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight)
  return canvas
}

async function compressCanvasToFile(
  sourceCanvas: HTMLCanvasElement,
  sourceName: string,
  options: ImageOutputOptions
): Promise<ProcessedImage> {
  const mimeType = options.mimeType || "image/webp"
  let workingCanvas = sourceCanvas
  let quality = 0.85
  let scale = 1
  let lastBlob: Blob | null = null

  while (scale >= 0.55) {
    if (scale < 1) {
      const nextWidth = Math.max(320, Math.round(options.outputWidth * scale))
      const nextHeight = Math.max(320, Math.round(options.outputHeight * scale))
      const { canvas, ctx } = makeCanvas(nextWidth, nextHeight)
      ctx.drawImage(sourceCanvas, 0, 0, nextWidth, nextHeight)
      workingCanvas = canvas
    }

    quality = 0.85
    while (quality >= 0.55) {
      const blob = await canvasToBlob(workingCanvas, mimeType, quality)
      lastBlob = blob
      if (blob.size <= options.maxSizeBytes) {
        const file = new File([blob], options.fileName || outputName(sourceName, mimeType), {
          type: mimeType,
        })
        return {
          file,
          width: workingCanvas.width,
          height: workingCanvas.height,
          sizeBytes: file.size,
          mimeType,
          previewUrl: URL.createObjectURL(file),
        }
      }
      quality -= 0.07
    }
    scale -= 0.1
  }

  if (options.errorMessage) throw new Error(options.errorMessage)

  const size = lastBlob ? ` (${formatBytes(lastBlob.size)})` : ""
  throw new Error(`A imagem precisa ter no máximo ${formatBytes(options.maxSizeBytes)} após otimização${size}. Tente outra imagem.`)
}

export async function compressImageToMaxSize(
  file: File,
  options: ImageOutputOptions
): Promise<ProcessedImage> {
  const { image, url } = await loadImage(file)
  try {
    const canvas = drawCenterCrop(image, options.outputWidth, options.outputHeight)
    return await compressCanvasToFile(canvas, file.name, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function cropImageToAspectRatio(
  file: File,
  crop: CropTransform,
  options: ImageOutputOptions
): Promise<ProcessedImage> {
  const { image, url } = await loadImage(file)
  try {
    const canvas = drawManualCrop(image, crop, options.outputWidth, options.outputHeight)
    return await compressCanvasToFile(canvas, file.name, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const optimizeImageToAspect = compressImageToMaxSize
export const cropAndOptimizeImage = cropImageToAspectRatio
