// lib/composer/upload-media.ts
//
// Uploads do composer: mídia de portfólio (post/Curto) e story/bee composto no
// servidor.
//
// ⚠️ USA XHR, E NÃO `fetch`, DE PROPÓSITO: `fetch` não reporta progresso de
// ENVIO. Enquanto o cliente compunha o vídeo no aparelho, o arquivo que subia
// era pequeno e isso não fazia falta; agora sobe o ORIGINAL do celular — que
// num 4K de 70s passa de 200MB —, e uma barra parada por minutos faz a pessoa
// achar que travou e fechar a tela no meio da publicação.

import { getPublicBackendUrl } from "@/lib/backend-public"
import type { ServerComposeParams } from "./server-video"

/**
 * Falha de upload com CÓDIGO, não com frase.
 *
 * ⚠️ Um módulo de lib não tem como traduzir: quem tem o dicionário é o
 * componente. Devolvendo um código, a tela escolhe o texto no idioma de quem
 * está publicando — e quando o SERVIDOR tem algo a dizer ("o vídeo ficou
 * grande demais", "não autenticado"), é a mensagem dele que aparece, porque
 * ela é específica do que aconteceu e uma frase genérica a apagaria.
 */
export class UploadError extends Error {
  code: "network" | "canceled" | "http"
  serverMessage: string | null
  status: number
  constructor(code: UploadError["code"], serverMessage: string | null = null, status = 0) {
    super(serverMessage || code)
    this.name = "UploadError"
    this.code = code
    this.serverMessage = serverMessage
    this.status = status
  }
}

/** Corpo maior que isto estoura o limite de funções serverless da Vercel, então
 *  vai direto no Railway. Vídeo vai direto SEMPRE — nunca cabe no proxy. */
const SERVERLESS_UPLOAD_LIMIT = 4 * 1024 * 1024

/** Envio multipart com progresso e erro tipado. Peça única dos dois uploads. */
function xhrUpload(
  url: string,
  token: string,
  fd: FormData,
  onProgress?: (frac: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url, true)
    xhr.setRequestHeader("Authorization", `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    // ⚠️ O envio terminar NÃO é a publicação terminar: com composição no
    // servidor, o ffmpeg ainda vai rodar depois do último byte. Marcar 100%
    // aqui deixaria a barra cheia com a tela ainda esperando — daí o teto em
    // 0.99, que só fecha na resposta.
    xhr.upload.onload = () => onProgress?.(0.99)

    xhr.onload = () => {
      let body: unknown = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* resposta sem JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve(body)
        return
      }
      const msg =
        body && typeof body === "object" && "error" in body
          ? String((body as { error?: unknown }).error || "")
          : ""
      reject(new UploadError("http", msg || null, xhr.status))
    }
    xhr.onerror = () => reject(new UploadError("network"))
    xhr.onabort = () => reject(new UploadError("canceled"))
    xhr.send(fd)
  })
}

/** Anexa as peças da composição no servidor, quando houver. */
function appendComposeParts(
  fd: FormData,
  compose?: ServerComposeParams | null,
  overlay?: Blob | null,
  pip?: Blob | null
) {
  if (compose) fd.append("compose", JSON.stringify(compose))
  if (overlay) fd.append("overlay", overlay, "overlay.png")
  if (pip) fd.append("pip", pip, "pip.mp4")
}

export interface UploadMediaParams {
  token: string
  profileId: string
  itemId: string
  file: Blob
  fileName: string
  mediaType: "image" | "video"
  sortOrder: number
  /** Presente = o servidor compõe o vídeo a partir deste arquivo. */
  compose?: ServerComposeParams | null
  /** PNG com texto/vinheta/PiP-imagem já rasterizados. */
  overlay?: Blob | null
  /** PiP de vídeo (não cabe no PNG). */
  pip?: Blob | null
  onProgress?: (frac: number) => void
}

export async function uploadPortfolioMedia(p: UploadMediaParams): Promise<void> {
  const fd = new FormData()
  fd.append("file", p.file, p.fileName)
  fd.append("media_type", p.mediaType)
  fd.append("sort_order", String(p.sortOrder))
  appendComposeParts(fd, p.compose, p.overlay, p.pip)

  const direct = p.mediaType === "video" || p.file.size > SERVERLESS_UPLOAD_LIMIT
  const url = direct
    ? `${getPublicBackendUrl()}/profile/${p.profileId}/portfolio/${p.itemId}/upload`
    : `/api/profile/${p.profileId}/portfolio/${p.itemId}/upload`

  await xhrUpload(url, p.token, fd, p.onProgress)
}

export interface UploadComposedStoryParams {
  token: string
  profileId: string
  file: Blob
  fileName: string
  compose: ServerComposeParams
  overlay?: Blob | null
  pip?: Blob | null
  caption?: string
  location?: string
  links?: { label: string; url: string; style: string }[]
  idCommunity?: string | null
  audioTrackId?: string | null
  audioStartMs?: number
  onProgress?: (frac: number) => void
}

/**
 * Publica um story/bee de VÍDEO pela porta multipart, com composição no
 * servidor.
 *
 * ⚠️ POR QUE ESTA PORTA, E NÃO O PRESIGN: o caminho de presign sobe o arquivo
 * DIRETO no R2, o que é ótimo quando o cliente já entregou o vídeo pronto — mas
 * aqui o que sobe é o ORIGINAL, e alguém precisa compô-lo antes de virar o
 * arquivo que as pessoas vão ver. Pelo presign, o servidor teria de BAIXAR o
 * bruto do R2 de volta só para poder trabalhar nele. O presign segue intacto
 * para a câmera ao vivo, que já grava no formato final, e para as FOTOS.
 *
 * ⚠️ Não manda `duration_seconds`: quem mede é o servidor, no arquivo. E o
 * corte em 60s acontece lá também, porque `tb_story` tem CHECK de duração —
 * cortar só o número gravado faria o arquivo e o banco discordarem.
 */
export async function uploadComposedStory(p: UploadComposedStoryParams): Promise<void> {
  const fd = new FormData()
  fd.append("video", p.file, p.fileName)
  fd.append("id_profile", p.profileId)
  fd.append("kind", "bee")
  appendComposeParts(fd, p.compose, p.overlay, p.pip)
  if (p.caption) fd.append("caption", p.caption)
  if (p.location) fd.append("location", p.location)
  if (p.links?.length) fd.append("links", JSON.stringify(p.links))
  if (p.idCommunity) fd.append("id_community", p.idCommunity)
  if (p.audioTrackId) fd.append("audio_track_id", p.audioTrackId)
  if (p.audioStartMs) fd.append("audio_start_ms", String(p.audioStartMs))

  await xhrUpload(`${getPublicBackendUrl()}/me/stories`, p.token, fd, p.onProgress)
}
