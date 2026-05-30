// lib/camera/face-tracker.ts
// Face tracking 100% LOCAL via MediaPipe Face Landmarker (Apache 2.0). Lazy:
// o módulo + modelo (~3MB) só carregam quando o usuário escolhe um acessório.
// NENHUM landmark sai do dispositivo — só o id do acessório vai em filter_meta.

import type { FaceLandmarker } from "@mediapipe/tasks-vision"

const MP_VERSION = "0.10.35" // manter em sync com package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

export interface P {
  x: number // 0..1 (espaço do vídeo)
  y: number
}

/** Poucos pontos do mesh (478) que os acessórios precisam + o mesh completo
 *  (a maquiagem usa o contorno dos lábios e bochechas). */
export interface FaceLite {
  leftEye: P
  rightEye: P
  forehead: P
  chin: P
  leftCheek: P
  rightCheek: P
  noseTip: P
  all: P[]
}

// Índices canônicos do FaceMesh do MediaPipe.
const IDX = {
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeOuter: 263,
  rightEyeInner: 362,
  forehead: 10,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  noseTip: 1,
}

export class FaceTracker {
  private landmarker: FaceLandmarker
  private lastTs = -1

  private constructor(l: FaceLandmarker) {
    this.landmarker = l
  }

  static async create(): Promise<FaceTracker> {
    const vision = await import("@mediapipe/tasks-vision")
    const { FaceLandmarker, FilesetResolver } = vision
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
    const build = (delegate: "GPU" | "CPU") =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
      })
    try {
      return new FaceTracker(await build("GPU"))
    } catch {
      // GPU indisponível em alguns devices → cai pra CPU.
      return new FaceTracker(await build("CPU"))
    }
  }

  detect(video: HTMLVideoElement, tsMs: number): FaceLite | null {
    // detectForVideo exige timestamps estritamente crescentes.
    const ts = tsMs <= this.lastTs ? this.lastTs + 1 : tsMs
    this.lastTs = ts
    let res
    try {
      res = this.landmarker.detectForVideo(video, ts)
    } catch {
      return null
    }
    const lm = res?.faceLandmarks?.[0]
    if (!lm || lm.length < 468) return null
    const pt = (i: number): P => ({ x: lm[i].x, y: lm[i].y })
    const avg = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    return {
      leftEye: avg(pt(IDX.leftEyeOuter), pt(IDX.leftEyeInner)),
      rightEye: avg(pt(IDX.rightEyeOuter), pt(IDX.rightEyeInner)),
      forehead: pt(IDX.forehead),
      chin: pt(IDX.chin),
      leftCheek: pt(IDX.leftCheek),
      rightCheek: pt(IDX.rightCheek),
      noseTip: pt(IDX.noseTip),
      all: lm.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
    }
  }

  close(): void {
    try {
      this.landmarker.close()
    } catch {
      /* noop */
    }
  }
}
