// lib/camera/recorder.ts
// Gravação 100% no cliente (GPU-local). Caminho preferido: WebCodecs VideoEncoder
// (H.264 por hardware) + mux MP4 no browser (mp4-muxer). Áudio via AudioEncoder
// (AAC) quando disponível; senão grava vídeo sem áudio (audioDropped=true) — sem
// fingir. Fallback: MediaRecorder MP4 (canvas.captureStream) onde não há WebCodecs.

import { Muxer, ArrayBufferTarget } from "mp4-muxer"
import type { RecordPath } from "./capabilities"

declare global {
  interface Window {
    VideoEncoder: typeof VideoEncoder
    VideoFrame: typeof VideoFrame
    AudioEncoder: typeof AudioEncoder
    AudioData: typeof AudioData
  }
}

export interface RecorderOptions {
  getCanvas: () => HTMLCanvasElement
  audioTrack: MediaStreamTrack | null
  width: number
  height: number
  path: RecordPath
  fps?: number
  videoBitrate?: number
}

export interface RecordResult {
  blob: Blob
  durationSec: number
  encoder: "webcodecs" | "mediarecorder"
  audioDropped: boolean
  width: number
  height: number
}

export class StoryRecorder {
  private opts: Required<Pick<RecorderOptions, "fps" | "videoBitrate">> & RecorderOptions
  private recording = false
  private startMs = 0
  private frameCount = 0
  private lastEncodeMs = 0

  // WebCodecs
  private muxer: Muxer<ArrayBufferTarget> | null = null
  private vEncoder: VideoEncoder | null = null
  private aEncoder: AudioEncoder | null = null
  private audioCtx: AudioContext | null = null
  private audioNode: ScriptProcessorNode | null = null
  private audioSource: MediaStreamAudioSourceNode | null = null
  private audioSamples = 0
  private audioDropped = false
  private encodeError: Error | null = null

  // MediaRecorder fallback
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private captureStream: MediaStream | null = null

  constructor(options: RecorderOptions) {
    this.opts = { fps: 30, videoBitrate: 4_000_000, ...options }
  }

  get isRecording() { return this.recording }
  private get frameIntervalMs() { return 1000 / this.opts.fps }

  async start(): Promise<void> {
    if (this.recording) return
    this.frameCount = 0
    this.lastEncodeMs = 0
    this.audioSamples = 0
    this.audioDropped = false
    this.encodeError = null
    this.startMs = performance.now()

    if (this.opts.path === "webcodecs") {
      await this.startWebCodecs()
    } else if (this.opts.path === "mediarecorder") {
      this.startMediaRecorder()
    } else {
      throw new Error("Gravação não suportada neste navegador.")
    }
    this.recording = true
  }

  // ─── WebCodecs ─────────────────────────────────────────────────────────────
  private async startWebCodecs() {
    const { width, height, videoBitrate, fps, audioTrack } = this.opts
    const hasAudioEncoder = typeof window.AudioEncoder !== "undefined" && !!audioTrack

    let sampleRate = 48000
    let channels = 1
    if (hasAudioEncoder && audioTrack) {
      const settings = audioTrack.getSettings()
      sampleRate = settings.sampleRate || 48000
      channels = settings.channelCount || 1
    }

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      fastStart: "in-memory",
      video: { codec: "avc", width, height },
      ...(hasAudioEncoder ? { audio: { codec: "aac", sampleRate, numberOfChannels: channels } } : {}),
    })

    this.vEncoder = new window.VideoEncoder({
      output: (chunk, meta) => this.muxer?.addVideoChunk(chunk, meta),
      error: (e) => { this.encodeError = e as Error },
    })
    this.vEncoder.configure({
      codec: "avc1.42E01E",
      width,
      height,
      bitrate: videoBitrate,
      framerate: fps,
      avc: { format: "avc" },
      latencyMode: "realtime", // crucial p/ Safari/iOS (evita "Encoding task failed")
    })

    if (hasAudioEncoder && audioTrack) {
      try {
        await this.startAudio(audioTrack, sampleRate, channels)
      } catch {
        this.audioDropped = true
      }
    } else {
      this.audioDropped = !!audioTrack // tinha mic mas não dá pra encodar áudio
    }
  }

  private async startAudio(track: MediaStreamTrack, sampleRate: number, channels: number) {
    this.aEncoder = new window.AudioEncoder({
      output: (chunk, meta) => this.muxer?.addAudioChunk(chunk, meta),
      error: () => { this.audioDropped = true },
    })
    this.aEncoder.configure({
      codec: "mp4a.40.2",
      sampleRate,
      numberOfChannels: channels,
      bitrate: 128_000,
    })

    const Ac = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    this.audioCtx = new Ac({ sampleRate })
    const stream = new MediaStream([track])
    this.audioSource = this.audioCtx.createMediaStreamSource(stream)
    this.audioNode = this.audioCtx.createScriptProcessor(4096, channels, channels)

    this.audioNode.onaudioprocess = (ev) => {
      if (!this.recording || !this.aEncoder) return
      const inBuf = ev.inputBuffer
      const frames = inBuf.length
      const planar = new Float32Array(frames * channels)
      for (let ch = 0; ch < channels; ch++) {
        planar.set(inBuf.getChannelData(ch), ch * frames)
      }
      try {
        const audioData = new window.AudioData({
          format: "f32-planar",
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels: channels,
          timestamp: Math.round((this.audioSamples / sampleRate) * 1_000_000),
          data: planar,
        })
        this.aEncoder.encode(audioData)
        audioData.close()
        this.audioSamples += frames
      } catch {
        this.audioDropped = true
      }
    }
    this.audioSource.connect(this.audioNode)
    // ScriptProcessor precisa estar no grafo p/ disparar; liga num gain mudo.
    const sink = this.audioCtx.createGain()
    sink.gain.value = 0
    this.audioNode.connect(sink)
    sink.connect(this.audioCtx.destination)
  }

  /** Chamado a cada frame renderizado enquanto grava (caminho webcodecs). */
  captureVideoFrame(): void {
    if (!this.recording || this.opts.path !== "webcodecs" || !this.vEncoder) return
    if (this.encodeError) return
    const now = performance.now()
    // throttle ~fps (o rAF roda ~60fps; encodar tudo sobrecarrega o Safari)
    if (now - this.lastEncodeMs < this.frameIntervalMs - 2) return
    // não enfileira além da conta — fila cheia no iOS gera "Encoding task failed"
    if (this.vEncoder.encodeQueueSize > 2) return
    this.lastEncodeMs = now
    const ts = Math.round((now - this.startMs) * 1000) // micros
    const frame = new window.VideoFrame(this.opts.getCanvas(), { timestamp: ts })
    try {
      this.vEncoder.encode(frame, { keyFrame: this.frameCount % 60 === 0 })
    } catch (e) {
      this.encodeError = e as Error
    } finally {
      frame.close()
    }
    this.frameCount++
  }

  // ─── MediaRecorder fallback ────────────────────────────────────────────────
  private startMediaRecorder() {
    const canvas = this.opts.getCanvas() as HTMLCanvasElement & {
      captureStream?: (fps?: number) => MediaStream
    }
    if (!canvas.captureStream) throw new Error("captureStream indisponível.")
    const stream = canvas.captureStream(this.opts.fps)
    if (this.opts.audioTrack) stream.addTrack(this.opts.audioTrack)
    else this.audioDropped = false
    this.captureStream = stream

    const mime =
      MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E,mp4a.40.2")
        ? "video/mp4;codecs=avc1.42E01E,mp4a.40.2"
        : "video/mp4"
    this.chunks = []
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: this.opts.videoBitrate })
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data) }
    this.mediaRecorder.start(250)
  }

  // ─── Finalização ───────────────────────────────────────────────────────────
  async stop(): Promise<RecordResult> {
    if (!this.recording) throw new Error("Nada sendo gravado.")
    this.recording = false
    const durationSec = Math.max(1, Math.round((performance.now() - this.startMs) / 1000))
    const { width, height } = this.opts

    if (this.opts.path === "webcodecs") {
      if (this.encodeError) {
        throw new Error("Não foi possível codificar o vídeo neste navegador. Tente um trecho mais curto.")
      }
      await this.vEncoder?.flush()
      if (this.aEncoder) {
        try { await this.aEncoder.flush() } catch { this.audioDropped = true }
      }
      this.teardownAudio()
      this.muxer?.finalize()
      const buffer = (this.muxer?.target as ArrayBufferTarget).buffer
      this.vEncoder?.close()
      this.aEncoder?.close()
      const blob = new Blob([buffer], { type: "video/mp4" })
      this.muxer = null
      this.vEncoder = null
      this.aEncoder = null
      return { blob, durationSec, encoder: "webcodecs", audioDropped: this.audioDropped, width, height }
    }

    // mediarecorder
    const blob: Blob = await new Promise((resolve) => {
      const mr = this.mediaRecorder!
      mr.onstop = () => resolve(new Blob(this.chunks, { type: "video/mp4" }))
      mr.stop()
    })
    this.cleanupCaptureStream()
    return { blob, durationSec, encoder: "mediarecorder", audioDropped: this.audioDropped, width, height }
  }

  cancel(): void {
    this.recording = false
    try { this.vEncoder?.close() } catch { /* noop */ }
    try { this.aEncoder?.close() } catch { /* noop */ }
    this.teardownAudio()
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop() } catch { /* noop */ }
    }
    this.cleanupCaptureStream()
    this.muxer = null
    this.vEncoder = null
    this.aEncoder = null
  }

  private teardownAudio() {
    try { this.audioNode?.disconnect() } catch { /* noop */ }
    try { this.audioSource?.disconnect() } catch { /* noop */ }
    try { this.audioCtx?.close() } catch { /* noop */ }
    this.audioNode = null
    this.audioSource = null
    this.audioCtx = null
  }

  private cleanupCaptureStream() {
    // não paramos os tracks originais aqui (são do preview); só o clone do captureStream
    this.captureStream = null
    this.mediaRecorder = null
  }
}

/** Gera um poster WebP a partir do canvas (frame atual). */
export async function canvasToPoster(canvas: HTMLCanvasElement, maxBytes = 3 * 1024 * 1024): Promise<Blob | null> {
  for (const q of [0.85, 0.7, 0.6, 0.5]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", q))
    if (blob && blob.size <= maxBytes) return blob
    if (blob && q === 0.5) return blob
  }
  return null
}
