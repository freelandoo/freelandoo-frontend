Decodificadores do Meu Mundo (KTX2 e meshopt), servidos pela própria origem
porque a CSP não deixa carregar do cdn.babylonjs.com. Carregam sob demanda:
só quando um GLB tem textura KHR_texture_basisu ou EXT_meshopt_compression.
Configurados em features/meu-mundo/engine/codecs.ts. Pasta versionada (v1):
trocar qualquer arquivo = pasta nova (v2) e apontar o codecs.ts.

- babylon.ktx2Decoder.js   npm babylonjs-ktx2decoder@9.29.0 (Apache-2.0, Babylon.js)
- msc_basis_transcoder.*, uastc_*.wasm   cdn.babylonjs.com/ktx2Transcoders/1/ (Apache-2.0)
- zstddec.wasm             cdn.babylonjs.com/zstddec.wasm (MIT, zstddec)
- meshopt_decoder.js       npm meshoptimizer@1.1.1 meshopt_decoder.mjs (MIT),
                           com o "export" trocado por self.MeshoptDecoder (script clássico)
