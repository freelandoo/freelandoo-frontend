// features/meu-mundo/engine/codecs.ts — decodificadores de textura KTX2 e de malha meshopt.
//
// Auditoria visual V0 (2026-11-09): o pipeline passa a poder publicar GLB com
// textura comprimida de GPU (KHR_texture_basisu, ~4–8× menos memória que
// JPEG/PNG aberto) e malha comprimida (EXT_meshopt_compression, ~metade do
// download). O carregador glTF do Babylon já entende as duas extensões, mas
// busca os decodificadores no cdn.babylonjs.com — que a CSP do site bloqueia.
// Aqui eles apontam para cópias na própria origem (`public/meu-mundo/_codecs/`).
//
// Custo: zero até aparecer um GLB que use a extensão. Os arquivos só descem
// na primeira textura KTX2 (~650 KB, uma vez, cacheados) ou na primeira malha
// meshopt (~30 KB). A URL é absoluta porque o KTX2 decodifica num worker de
// blob, que não tem endereço base.

import { KhronosTextureContainer2 } from "@babylonjs/core/Misc/khronosTextureContainer2"
import { MeshoptCompression } from "@babylonjs/core/Meshes/Compression/meshoptCompression"

/** Pasta versionada: trocar qualquer arquivo = pasta nova (o navegador guarda a antiga). */
export const CODECS_PATH = "/meu-mundo/_codecs/v1/"

let configured = false

/** Aponta os decodificadores para a própria origem. Idempotente; chamar antes de carregar GLB. */
export function configureCodecs() {
  if (configured || typeof window === "undefined") return
  configured = true
  const base = new URL(CODECS_PATH, window.location.origin).href
  KhronosTextureContainer2.URLConfig = {
    jsDecoderModule: `${base}babylon.ktx2Decoder.js`,
    wasmUASTCToASTC: `${base}uastc_astc.wasm`,
    wasmUASTCToBC7: `${base}uastc_bc7.wasm`,
    wasmUASTCToRGBA_UNORM: `${base}uastc_rgba8_unorm_v2.wasm`,
    wasmUASTCToRGBA_SRGB: `${base}uastc_rgba8_srgb_v2.wasm`,
    wasmUASTCToR8_UNORM: `${base}uastc_r8_unorm.wasm`,
    wasmUASTCToRG8_UNORM: `${base}uastc_rg8_unorm.wasm`,
    jsMSCTranscoder: `${base}msc_basis_transcoder.js`,
    wasmMSCTranscoder: `${base}msc_basis_transcoder.wasm`,
    wasmZSTDDecoder: `${base}zstddec.wasm`,
  }
  MeshoptCompression.Configuration = { decoder: { url: `${base}meshopt_decoder.js` } }
}
