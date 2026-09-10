// lib/camera/recorder.ts
// Gravação 100% no cliente (GPU-local). Caminho preferido: WebCodecs VideoEncoder
// (H.264 por hardware) + mux MP4 no browser (mp4-muxer). Áudio via AudioEncoder
// (AAC) quando disponível; senão grava vídeo sem áudio (audioDropped=true) — sem
// fingir. Fallback: MediaRecorder MP4/WebM (canvas.captureStream) onde não há WebCodecs.

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
  /**
   * ⚠️ "realtime" foi aprendido na CÂMERA AO VIVO, onde evita o "Encoding task
   * failed" do Safari sob pressão de tempo real — e lá ele fica. Mas no Safari
   * esse modo usa o encoder de baixa latência, que pode emitir chunks SEM o
   * `decoderConfig`; sem ele o mp4-muxer não aprende o formato da trilha e o
   * finalize estoura em "...decoderConfig.colorSpace". EXPORTAR ARQUIVO não tem
   * pressão de tempo real, então o padrão aqui é "quality", que traz a config.
   */
  latencyMode?: "quality" | "realtime"
}

/**
 * Falha de CAPTURA do caminho webcodecs: o encoder não produziu vídeo utilizável.
 * É tipada porque quem chama (compose) precisa distinguir "não deu pra capturar,
 * tente outro caminho" de um erro qualquer — e cair no MediaRecorder em vez de
 * devolver erro ao usuário.
 */
export class VideoCaptureError extends Error {
  readonly code: "no_frames" | "no_chunks" | "encode_failed"
  constructor(code: "no_frames" | "no_chunks" | "encode_failed", message: string) {
    super(message)
    this.name = "VideoCaptureError"
    this.code = code
  }
}

export interface RecordResult {
  blob: Blob
  mimeType: string
  durationSec: number
  encoder: "webcodecs" | "mediarecorder"
  audioDropped: boolean
  width: number
  height: number
}

function pickMediaRecorderMime(): { mimeType: string; blobType: string } {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", blobType: "video/mp4" },
    { mimeType: "video/mp4;codecs=avc1", blobType: "video/mp4" },
    { mimeType: "video/mp4", blobType: "video/mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", blobType: "video/webm" },
    { mimeType: "video/webm;codecs=vp8,opus", blobType: "video/webm" },
    { mimeType: "video/webm", blobType: "video/webm" },
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) return c
  }
  return { mimeType: "", blobType: "video/webm" }
}

export class StoryRecorder {
  private opts: Required<Pick<RecorderOptions, "fps" | "videoBitrate" | "latencyMode">> & RecorderOptions
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
  /** Chunks que SAÍRAM do encoder (≠ frames enviados) e se o mux recebeu config. */
  private outputChunks = 0
  private sawDecoderConfig = false

  // MediaRecorder fallback
  private mediaRecorder: MediaRecorder | null = null
  private mediaRecorderMime = "video/mp4"
  private chunks: Blob[] = []
  private captureStream: MediaStream | null = null

  constructor(options: RecorderOptions) {
    this.opts = { fps: 30, videoBitrate: 4_000_000, latencyMode: "quality", ...options }
  }

  get isRecording() { return this.recording }
  /** Frames de vídeo efetivamente enviados ao encoder (caminho webcodecs). */
  get encodedFrames() { return this.frameCount }
  /** O mux já aprendeu o formato do vídeo? Sem isto não há arquivo possível. */
  get hasDecoderConfig() { return this.sawDecoderConfig }
  private get frameIntervalMs() { return 1000 / this.opts.fps }

  async start(): Promise<void> {
    if (this.recording) return
    this.frameCount = 0
    this.lastEncodeMs = 0
    this.audioSamples = 0
    this.audioDropped = false
    this.encodeError = null
    this.outputChunks = 0
    this.sawDecoderConfig = false
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
    const { width, height, videoBitrate, fps, audioTrack, latencyMode } = this.opts
    const wantAudio = typeof window.AudioEncoder !== "undefined" && !!audioTrack

    // Áudio: cria o AudioContext PRIMEIRO e dá resume() (no iOS ele nasce
    // suspenso — sem isso o onaudioprocess nunca dispara e o vídeo sai mudo).
    // Usa o sampleRate REAL do contexto (Safari coage o valor pedido).
    let audioCfg: { sampleRate: number; channels: number } | null = null
    if (wantAudio && audioTrack) {
      try {
        const Ac =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.audioCtx = new Ac()
        await this.audioCtx.resume().catch(() => {})
        audioCfg = { sampleRate: Math.round(this.audioCtx.sampleRate), channels: 1 }
      } catch {
        this.audioCtx = null
        audioCfg = null
      }
    }

    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      fastStart: "in-memory",
      video: { codec: "avc", width, height },
      ...(audioCfg
        ? { audio: { codec: "aac", sampleRate: audioCfg.sampleRate, numberOfChannels: audioCfg.channels } }
        : {}),
    })

    this.vEncoder = new window.VideoEncoder({
      output: (chunk, meta) => {
        // ⚠️ O mp4-muxer só aprende o formato do vídeo pelo `decoderConfig` do
        // PRIMEIRO chunk. Sem ele, `finalize()` estoura lá dentro com o críptico
        // "null is not an object (evaluating 't.info.decoderConfig.colorSpace')".
        // Contamos aqui para RECUSAR o finalize em vez de deixar quebrar.
        if (meta?.decoderConfig) this.sawDecoderConfig = true
        // ⚠️ Chunk ANTES do decoderConfig é DESCARTADO: ele viraria sample de uma
        // trilha sem formato declarado, que é exatamente o estado que faz o
        // finalize quebrar. Nada se perde — sem config não há vídeo legível.
        if (!this.sawDecoderConfig) return
        // ⚠️ Este callback roda DENTRO do WebCodecs, fora do try/catch de quem
        // publica: uma exceção aqui não seria capturada por ninguém. Vira estado.
        try {
          this.muxer?.addVideoChunk(chunk, meta)
          this.outputChunks++
        } catch (e) {
          this.encodeError = e as Error
        }
      },
      error: (e) => { this.encodeError = e as Error },
    })
    this.vEncoder.configure({
      codec: "avc1.42E01E",
      width,
      height,
      bitrate: videoBitrate,
      framerate: fps,
      avc: { format: "avc" }, // AVCC — é este formato que carrega a description
      latencyMode,
    })

    if (audioCfg && audioTrack && this.audioCtx) {
      try {
        this.startAudioGraph(audioTrack, audioCfg.sampleRate, audioCfg.channels)
      } catch {
        this.audioDropped = true
        this.teardownAudio()
      }
    } else {
      // tinha mic mas o navegador não tem AudioEncoder (ex.: iOS < 26)
      this.audioDropped = !!audioTrack
    }
  }

  private startAudioGraph(track: MediaStreamTrack, sampleRate: number, channels: number) {
    const ctx = this.audioCtx
    if (!ctx) throw new Error("AudioContext indisponível")

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

    const stream = new MediaStream([track])
    this.audioSource = ctx.createMediaStreamSource(stream)
    this.audioNode = ctx.createScriptProcessor(4096, channels, channels)

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
    // ScriptProcessor só dispara se estiver no grafo; liga num gain mudo.
    const sink = ctx.createGain()
    sink.gain.value = 0
    this.audioNode.connect(sink)
    sink.connect(ctx.destination)
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

    const mime = pickMediaRecorderMime()
    this.mediaRecorderMime = mime.blobType
    this.chunks = []
    const options: MediaRecorderOptions = { videoBitsPerSecond: this.opts.videoBitrate }
    if (mime.mimeType) options.mimeType = mime.mimeType
    this.mediaRecorder = new MediaRecorder(stream, options)
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
        this.abortWebCodecs()
        throw new VideoCaptureError("encode_failed", "Não foi possível codificar o vídeo neste navegador. Tente um trecho mais curto.")
      }
      if (this.frameCount === 0) {
        // Nenhum frame chegou ao encoder → o mux nunca recebeu o decoderConfig.
        this.abortWebCodecs()
        throw new VideoCaptureError("no_frames", "Não consegui capturar nenhum quadro do vídeo. Tente regravar ou escolher outro arquivo.")
      }
      try {
        await this.vEncoder?.flush()
      } catch (e) {
        this.abortWebCodecs()
        throw new VideoCaptureError("encode_failed", (e as Error)?.message || "Falha ao finalizar a codificação.")
      }
      if (this.aEncoder) {
        try { await this.aEncoder.flush() } catch { this.audioDropped = true }
      }
      // ⚠️ Frames ENVIADOS não são frames CODIFICADOS: no iOS o encoder pode
      // aceitar tudo e não emitir chunk nenhum. Só depois do flush dá para
      // afirmar que há vídeo — e sem decoderConfig o finalize quebraria.
      if (this.outputChunks === 0 || !this.sawDecoderConfig) {
        this.abortWebCodecs()
        throw new VideoCaptureError("no_chunks", "O codificador deste navegador não produziu vídeo.")
      }
      this.teardownAudio()
      // ⚠️ ÚLTIMA LINHA DE DEFESA: nenhuma exceção do mux pode chegar crua ao
      // usuário. Tipada, ela vira "tente o outro caminho" em vez de um texto
      // como "null is not an object (...decoderConfig.colorSpace)" na tela.
      try {
        this.muxer?.finalize()
      } catch (e) {
        this.abortWebCodecs()
        throw new VideoCaptureError("no_chunks", (e as Error)?.message || "Falha ao finalizar o vídeo.")
      }
      const buffer = (this.muxer?.target as ArrayBufferTarget).buffer
      this.vEncoder?.close()
      this.aEncoder?.close()
      const blob = new Blob([buffer], { type: "video/mp4" })
      this.muxer = null
      this.vEncoder = null
      this.aEncoder = null
      return { blob, mimeType: "video/mp4", durationSec, encoder: "webcodecs", audioDropped: this.audioDropped, width, height }
    }

    // mediarecorder
    const blob: Blob = await new Promise((resolve) => {
      const mr = this.mediaRecorder!
      mr.onstop = () => resolve(new Blob(this.chunks, { type: this.mediaRecorderMime }))
      mr.stop()
    })
    this.cleanupCaptureStream()
    // Blob vazio = o captureStream não entregou nada. Sem este guard o post
    // subiria um arquivo de 0 byte, que só quebra depois — no feed de todo mundo.
    if (blob.size === 0) {
      throw new VideoCaptureError("no_chunks", "A gravação deste navegador saiu vazia.")
    }
    return { blob, mimeType: this.mediaRecorderMime, durationSec, encoder: "mediarecorder", audioDropped: this.audioDropped, width, height }
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

  /** Fecha encoders e descarta o mux sem finalizar (estado inutilizável). */
  private abortWebCodecs() {
    try { this.vEncoder?.close() } catch { /* noop */ }
    try { this.aEncoder?.close() } catch { /* noop */ }
    this.teardownAudio()
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
