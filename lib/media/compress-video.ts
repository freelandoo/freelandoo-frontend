// lib/media/compress-video.ts
// Aba "Vídeo" da ferramenta /comprimir. Vídeo grande sobe DIRETO pro R2 via
// presigned PUT (não passa pelo backend → não estoura memória/limite do Vercel);
// depois o backend baixa do R2, roda ffmpeg e devolve a URL de download.
// O from-upload é uma chamada longa (minutos) — vai DIRETO pro backend público,
// não pelo proxy /api (função serverless do Vercel estouraria o timeout).

import { getPublicBackendUrl } from "@/lib/backend-public"

const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"]
const MAX_INPUT = 500 * 1024 * 1024

interface PresignInput {
  key: string
  url: string
  content_type: string
  max_bytes: number
}
interface UploadUrl {
  expires_in: number
  max_bytes: number
  input: PresignInput
}
export interface CompressResult {
  download_url: string
  size_bytes: number
  original_bytes: number
  saved_percent: number
}

async function postJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${getPublicBackendUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    /* non-json */
  }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || `Erro ${res.status}`
    throw new Error(err)
  }
  return data as T
}

function putToR2(slot: PresignInput, file: File, onProgress?: (frac: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", slot.url, true)
    xhr.setRequestHeader("Content-Type", slot.content_type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha no upload (${xhr.status})`))
    xhr.onerror = () => reject(new Error("Falha de rede no upload"))
    xhr.send(file)
  })
}

export function isAllowedVideo(type: string): boolean {
  return ALLOWED.includes(type.toLowerCase())
}
export const MAX_VIDEO_INPUT_BYTES = MAX_INPUT

export interface CompressVideoParams {
  token: string
  file: File
  /** 0..1 do upload (a compressão no servidor não reporta progresso). */
  onUploadProgress?: (frac: number) => void
}

export async function compressVideo(p: CompressVideoParams): Promise<CompressResult> {
  if (!isAllowedVideo(p.file.type)) {
    throw new Error("Formato de vídeo não aceito. Envie MP4, WebM ou MOV.")
  }
  if (p.file.size > MAX_INPUT) {
    throw new Error("O vídeo excede o limite de 500MB.")
  }

  // 1) presigned PUT
  const urls = await postJson<UploadUrl>("/me/compress/upload-url", p.token, {
    content_type: p.file.type.toLowerCase(),
  })

  // 2) upload direto pro R2
  await putToR2(urls.input, p.file, p.onUploadProgress)
  p.onUploadProgress?.(1)

  // 3) compressão no servidor + link de download (chamada longa)
  return postJson<CompressResult>("/me/compress/from-upload", p.token, {
    storage_key: urls.input.key,
    file_name: p.file.name,
  })
}
