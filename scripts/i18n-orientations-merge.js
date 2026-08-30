/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves das 3 ORIENTAÇÕES DE POST (4:5 · 1:1 · 16:9).
//
// Traz junto o ns novo `MediaCrop`: o cortador legado (components/media/
// media-crop-modal.tsx) estava 100% em pt hardcoded e só apareceu agora porque
// é ele quem ganhou o seletor de orientação — regra do escoteiro, o arquivo
// tocado sai traduzido.
//
// Padrão da casa: fill-if-absent. O bloco OVERRIDES no fim é forçado, para as
// descrições que diziam "no formato 4:5" e agora estão erradas.
//
// Uso: node scripts/i18n-orientations-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const MEDIA_CROP = {
  orientationGroup: ["Orientação do post", "Post orientation", "Orientación del post"],
  labelAvatar: ["foto de perfil", "profile photo", "foto de perfil"],
  labelPost: ["imagem do post", "post image", "imagen del post"],
  avatarTooBig: [
    "A foto de perfil precisa ter no máximo 2MB.",
    "The profile photo must be 2MB or smaller.",
    "La foto de perfil debe tener como máximo 2MB.",
  ],
  postTooBig: [
    "A imagem do post precisa ter no máximo 3MB.",
    "The post image must be 3MB or smaller.",
    "La imagen del post debe tener como máximo 3MB.",
  ],
  optimizeError: [
    "Não foi possível otimizar esse arquivo. Tente outro.",
    "Could not optimize this file. Try another one.",
    "No fue posible optimizar este archivo. Prueba con otro.",
  ],
  previewAlt: ["Prévia da {label}", "{label} preview", "Vista previa de la {label}"],
  outputTitle: ["Saída", "Output", "Salida"],
  ratio: ["Proporção", "Ratio", "Proporción"],
  resolution: ["Resolução", "Resolution", "Resolución"],
  sizeLimit: ["Limite", "Limit", "Límite"],
  zoom: ["Zoom", "Zoom", "Zoom"],
  zoomAria: ["Zoom do corte", "Crop zoom", "Zoom del recorte"],
  reset: ["Resetar", "Reset", "Restablecer"],
  dragHint: [
    "Arraste a imagem para escolher o enquadramento. O arquivo final será otimizado antes do envio.",
    "Drag the image to choose the framing. The final file is optimized before upload.",
    "Arrastra la imagen para elegir el encuadre. El archivo final se optimiza antes del envío.",
  ],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  apply: ["Aplicar corte", "Apply crop", "Aplicar recorte"],
};

const NAMESPACES = {
  MediaCrop: MEDIA_CROP,
};

// Textos que MUDARAM: prometiam 4:5 como única saída possível.
const CROP_DESC = [
  "Escolha a orientação (4:5, 1:1 ou 16:9) e corte sua imagem.",
  "Pick the orientation (4:5, 1:1 or 16:9) and crop your image.",
  "Elige la orientación (4:5, 1:1 o 16:9) y recorta tu imagen.",
];

const OVERRIDES = {
  Account: { cropImageDesc: CROP_DESC },
  Profile: { cropDescription: CROP_DESC },
};

let added = 0;
let overridden = 0;

for (let i = 0; i < LOCALES.length; i++) {
  const locale = LOCALES[i];
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    // Só sobrescreve onde a chave JÁ existe: criar cropImageDesc num namespace
    // que não usa o cortador só sujaria o dicionário.
    if (!dict[ns]) continue;
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== undefined && dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i];
        overridden++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added} · textos atualizados: ${overridden}`);
