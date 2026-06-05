// lib/camera/upload.ts
// Upload zero-servidor: pede presigned PUT ao backend → sobe vídeo+poster DIRETO
// pro R2 (bytes não passam pelo backend) → registra a story por metadados.

import { getPublicBackendUrl } from "@/lib/backend-public"
import { FilterMeta, StoryKind } from "./types"

interface PresignSlot {
  key: string
  url: string
  content_type: string
  max_bytes: number
}
interface UploadUrls {
  expires_in: number
  video: PresignSlot
  poster: PresignSlot
}

async function postJson<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${getPublicBackendUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = {}
  try { data = text ? JSON.parse(text) : {} } catch { /* non-json */ }
  if (!res.ok) {
    const err = (data as { error?: string })?.error || `Erro ${res.status}`
    throw new Error(err)
  }
  return data as T
}

function putToR2(slot: PresignSlot, blob: Blob, onProgress?: (frac: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", slot.url, true)
    xhr.setRequestHeader("Content-Type", slot.content_type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no upload (${xhr.status})`))
    xhr.onerror = () => reject(new Error("Falha de rede no upload"))
    xhr.send(blob)
  })
}

export interface UploadStoryParams {
  token: string
  id_profile: string
  kind: StoryKind
  /** "video" (default) ou "image" (story de foto). */
  mediaType?: "video" | "image"
  /** Mídia principal — vídeo MP4 ou imagem WebP (o campo segue chamando videoBlob). */
  videoBlob: Blob
  posterBlob: Blob | null
  durationSeconds: number
  width: number
  height: number
  caption?: string
  filterMeta: FilterMeta
  /** Música anexada (metadado — não queimada). Opcional. */
  audioTrackId?: string | null
  audioStartMs?: number
  onProgress?: (frac: number) => void
}

export interface PublishedStory {
  story: unknown
}

export async function uploadStory(p: UploadStoryParams): Promise<PublishedStory> {
  const isImage = p.mediaType === "image"
  if (!isImage && p.videoBlob.size > 80 * 1024 * 1024) {
    throw new Error("O vídeo excede 80MB. Grave um trecho menor.")
  }
  if (isImage && p.videoBlob.size > 8 * 1024 * 1024) {
    throw new Error("A imagem excede 8MB. Use uma foto menor.")
  }

  // 1) presigned URLs
  const urls = await postJson<UploadUrls>("/me/stories/upload-url", p.token, {
    id_profile: p.id_profile,
    kind: p.kind,
    media_type: isImage ? "image" : "video",
  })

  // 2) PUT direto pro R2 (mídia principal = 85% da barra; poster = 15%)
  await putToR2(urls.video, p.videoBlob, (f) => p.onProgress?.(f * 0.85))
  let thumbnailKey: string | null = null
  if (p.posterBlob && p.posterBlob.size <= urls.poster.max_bytes) {
    try {
      await putToR2(urls.poster, p.posterBlob, (f) => p.onProgress?.(0.85 + f * 0.15))
      thumbnailKey = urls.poster.key
    } catch {
      thumbnailKey = null // poster é best-effort
    }
  }
  p.onProgress?.(1)

  // 3) registra a story (só metadados)
  return postJson<PublishedStory>("/me/stories/from-upload", p.token, {
    id_profile: p.id_profile,
    kind: p.kind,
    media_type: isImage ? "image" : "video",
    duration_seconds: p.durationSeconds,
    width: p.width,
    height: p.height,
    caption: p.caption || undefined,
    filter_meta: p.filterMeta,
    audio_track_id: p.audioTrackId || undefined,
    audio_start_ms: p.audioTrackId ? (p.audioStartMs ?? 0) : undefined,
    storage_key: urls.video.key,
    thumbnail_key: thumbnailKey,
  })
}
