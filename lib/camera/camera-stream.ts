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

function audioConstraint(audio: boolean): MediaStreamConstraints["audio"] {
  return audio ? { echoCancellation: true, noiseSuppression: true } : false
}

export async function openCamera(opts: OpenCameraOptions): Promise<CameraHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      throw new CameraPermissionError("insecure", "Câmera exige conexão segura (HTTPS).")
    }
    throw new CameraPermissionError("unsupported", "Câmera não suportada neste navegador.")
  }

  const w = opts.width ?? 720
  const h = opts.height ?? 1280
  const fm = { ideal: opts.facing }
  const fr = { ideal: 30, max: 30 }

  // Webviews in-app costumam ignorar width/height "ideal" e devolver paisagem.
  // Tentamos FORÇAR retrato progressivamente (exact → aspectRatio → ideal →
  // qualquer um). O 1º que o aparelho aceitar vence.
  const tries: MediaTrackConstraints[] = [
    { facingMode: fm, width: { exact: w }, height: { exact: h }, frameRate: fr },
    { facingMode: fm, width: { exact: 1080 }, height: { exact: 1920 }, frameRate: fr },
    { facingMode: fm, aspectRatio: { exact: w / h }, width: { ideal: w }, height: { ideal: h }, frameRate: fr },
    { facingMode: fm, width: { ideal: w }, height: { ideal: h }, frameRate: fr },
    { facingMode: fm },
  ]

  let lastErr: unknown = null
  for (const video of tries) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: audioConstraint(opts.audio) })
      return { stream, facing: opts.facing, hasAudio: stream.getAudioTracks().length > 0 }
    } catch (err) {
      lastErr = err
    }
  }

  // último recurso: sem áudio (mic pode estar ocupado) com constraint mínima
  if (opts.audio) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fm }, audio: false })
      return { stream, facing: opts.facing, hasAudio: false }
    } catch (e2) {
      lastErr = e2
    }
  }

  throw mapError(lastErr)
}

/** Troca front/back parando o stream antigo e abrindo o novo. */
export async function switchCamera(prev: CameraHandle, audio: boolean): Promise<CameraHandle> {
  const nextFacing: Facing = prev.facing === "user" ? "environment" : "user"
  stopStream(prev.stream)
  return openCamera({ facing: nextFacing, audio })
}
