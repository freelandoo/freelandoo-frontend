// lib/camera/camera-stream.ts
// Ciclo de vida do MediaStream: abrir câmera+mic, trocar front/back, parar tudo.
// Cleanup é crítico (não deixar câmera ligada após sair da tela).

export type Facing = "user" | "environment"

export interface OpenCameraOptions {
  facing: Facing
  audio: boolean
  width?: number
  height?: number
}

export interface CameraHandle {
  stream: MediaStream
  facing: Facing
  hasAudio: boolean
}

export class CameraPermissionError extends Error {
  kind: "denied" | "notfound" | "insecure" | "unsupported" | "unknown"
  constructor(kind: CameraPermissionError["kind"], message: string) {
    super(message)
    this.name = "CameraPermissionError"
    this.kind = kind
  }
}

function mapError(err: unknown): CameraPermissionError {
  const e = err as { name?: string; message?: string }
  switch (e?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return new CameraPermissionError("denied", "Permissão de câmera negada.")
    case "NotFoundError":
    case "OverconstrainedError":
      return new CameraPermissionError("notfound", "Nenhuma câmera compatível encontrada.")
    case "NotReadableError":
      return new CameraPermissionError("unknown", "A câmera está em uso por outro app.")
    default:
      return new CameraPermissionError("unknown", e?.message || "Falha ao abrir a câmera.")
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      /* noop */
    }
  }
}

export async function openCamera(opts: OpenCameraOptions): Promise<CameraHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      throw new CameraPermissionError("insecure", "Câmera exige conexão segura (HTTPS).")
    }
    throw new CameraPermissionError("unsupported", "Câmera não suportada neste navegador.")
  }

  const video: MediaTrackConstraints = {
    facingMode: { ideal: opts.facing },
    width: { ideal: opts.width ?? 720 },
    height: { ideal: opts.height ?? 1280 },
    aspectRatio: { ideal: (opts.width ?? 720) / (opts.height ?? 1280) }, // dica de retrato
    frameRate: { ideal: 30, max: 30 },
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
      audio: opts.audio
        ? { echoCancellation: true, noiseSuppression: true }
        : false,
    })
    return {
      stream,
      facing: opts.facing,
      hasAudio: stream.getAudioTracks().length > 0,
    }
  } catch (err) {
    // Retry sem áudio (alguns devices falham se o mic estiver ocupado).
    if (opts.audio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
        return { stream, facing: opts.facing, hasAudio: false }
      } catch {
        /* cai pro throw abaixo */
      }
    }
    throw mapError(err)
  }
}

/** Troca front/back parando o stream antigo e abrindo o novo. */
export async function switchCamera(prev: CameraHandle, audio: boolean): Promise<CameraHandle> {
  const nextFacing: Facing = prev.facing === "user" ? "environment" : "user"
  stopStream(prev.stream)
  return openCamera({ facing: nextFacing, audio })
}
