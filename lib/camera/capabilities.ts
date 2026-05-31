// lib/camera/capabilities.ts
// Detecção de capacidade em runtime (NUNCA por user-agent). Decide o caminho
// de gravação: WebCodecs (GPU-local, ideal) → MediaRecorder MP4 → fallback file.

export type RecordPath = "webcodecs" | "mediarecorder" | "none"

export interface CameraCapabilities {
  getUserMedia: boolean
  webgl: boolean
  webgl2: boolean
  webcodecsVideo: boolean // VideoEncoder + VideoFrame
  webcodecsAudio: boolean // AudioEncoder
  mediaRecorder: boolean
  mediaRecorderMp4: boolean
  mediaRecorderWebm: boolean
  recordPath: RecordPath
  canFilter: boolean
}

function hasWebGL(version: 1 | 2): boolean {
  if (typeof document === "undefined") return false
  try {
    const c = document.createElement("canvas")
    const ctx =
      version === 2 ? c.getContext("webgl2") : c.getContext("webgl") || c.getContext("experimental-webgl")
    return !!ctx
  } catch {
    return false
  }
}

function mediaRecorderSupportsMp4(): boolean {
  if (typeof MediaRecorder === "undefined") return false
  try {
    return (
      MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2") ||
      MediaRecorder.isTypeSupported("video/mp4;codecs=avc1") ||
      MediaRecorder.isTypeSupported("video/mp4")
    )
  } catch {
    return false
  }
}

function mediaRecorderSupportsWebm(): boolean {
  if (typeof MediaRecorder === "undefined") return false
  try {
    return (
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ||
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus") ||
      MediaRecorder.isTypeSupported("video/webm")
    )
  } catch {
    return false
  }
}

export function detectCapabilities(): CameraCapabilities {
  const getUserMedia =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"

  const webgl2 = hasWebGL(2)
  const webgl = webgl2 || hasWebGL(1)

  const webcodecsVideo =
    typeof window !== "undefined" &&
    typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !== "undefined" &&
    typeof (window as unknown as { VideoFrame?: unknown }).VideoFrame !== "undefined"

  const webcodecsAudio =
    typeof window !== "undefined" &&
    typeof (window as unknown as { AudioEncoder?: unknown }).AudioEncoder !== "undefined"

  const mediaRecorder = typeof MediaRecorder !== "undefined"
  const mediaRecorderMp4 = mediaRecorderSupportsMp4()
  const mediaRecorderWebm = mediaRecorderSupportsWebm()

  // WebCodecs só vale a pena com WebGL (precisamos renderizar frames filtrados).
  let recordPath: RecordPath = "none"
  if (webcodecsVideo && webgl) recordPath = "webcodecs"
  else if (mediaRecorder && mediaRecorderMp4) recordPath = "mediarecorder"

  return {
    getUserMedia,
    webgl,
    webgl2,
    webcodecsVideo,
    webcodecsAudio,
    mediaRecorder,
    mediaRecorderMp4,
    mediaRecorderWebm,
    recordPath,
    canFilter: webgl,
  }
}

/**
 * Detecta navegador embutido (in-app webview) — onde a câmera costuma vir
 * travada em paisagem. Heurística por user-agent (não 100%, mas cobre os apps
 * comuns). Chrome/Firefox iOS contam como navegador "de verdade".
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  const apps =
    /(FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|MicroMessenger|WhatsApp|Snapchat|Pinterest|LinkedInApp|GSA\/|TikTok|musical_ly|Telegram)/i
  if (apps.test(ua)) return true
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  if (isIOS) {
    const chromeOrFx = /CriOS|FxiOS|EdgiOS/i.test(ua) // navegadores de verdade
    const realSafari = /Safari/i.test(ua) && /Version\//i.test(ua)
    if (!chromeOrFx && !realSafari) return true // WKWebView in-app
  }
  if (/Android/i.test(ua) && /; wv\)/i.test(ua)) return true // WebView Android
  return false
}

/**
 * Checagem assíncrona fina do VideoEncoder (config H.264 realmente suportada).
 * Chamar antes de gravar pelo caminho webcodecs; se falhar, cair p/ mediarecorder.
 */
export async function isH264EncodeSupported(width: number, height: number): Promise<boolean> {
  const w = window as unknown as {
    VideoEncoder?: { isConfigSupported?: (c: unknown) => Promise<{ supported?: boolean }> }
  }
  if (!w.VideoEncoder?.isConfigSupported) return false
  try {
    const even = (n: number) => (n % 2 === 0 ? n : n - 1)
    const res = await w.VideoEncoder.isConfigSupported({
      codec: "avc1.42E01E", // H.264 Baseline 3.0
      width: even(width),
      height: even(height),
      bitrate: 4_000_000,
      framerate: 30,
    })
    return !!res?.supported
  } catch {
    return false
  }
}
