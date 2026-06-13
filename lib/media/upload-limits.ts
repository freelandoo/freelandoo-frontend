// Fonte única dos limites de upload por superfície (espelha os limites já
// validados no backend/frontend). Usado pela dica embutida e pelo modal de
// "arquivo grande" que leva pra /comprimir.

export type UploadSurface = "avatar" | "courseThumb" | "courseVideo" | "bees" | "post" | "story"

export interface SurfaceLimit {
  maxBytes: number
  /** Rótulo curto do limite, ex.: "12MB". */
  label: string
  kind: "image" | "video" | "media"
}

const MB = 1024 * 1024

export const UPLOAD_LIMITS: Record<UploadSurface, SurfaceLimit> = {
  avatar: { maxBytes: 12 * MB, label: "12MB", kind: "image" },
  courseThumb: { maxBytes: 12 * MB, label: "12MB", kind: "image" },
  courseVideo: { maxBytes: 100 * MB, label: "100MB", kind: "video" },
  bees: { maxBytes: 80 * MB, label: "80MB", kind: "video" },
  post: { maxBytes: 80 * MB, label: "80MB", kind: "media" },
  story: { maxBytes: 80 * MB, label: "80MB", kind: "video" },
}
