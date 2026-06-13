// Namespace "Compress" — ferramenta /comprimir (compressão de imagem no browser
// + download). Idempotente, fill-if-absent. Rodar:
//   node scripts/i18n-compress-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const COMPRESS = {
  eyebrow: ["Ferramenta", "Tool", "Herramienta"],
  title: ["Comprimir mídia", "Compress media", "Comprimir medios"],
  subtitle: [
    "Deixe sua imagem mais leve para postar sem estourar o limite. Tudo acontece no seu aparelho — depois é só baixar e postar.",
    "Make your image lighter so it fits the upload limit. It all happens on your device — then just download and post.",
    "Haz tu imagen más liviana para no superar el límite. Todo ocurre en tu dispositivo — luego solo descarga y publica.",
  ],
  tabImage: ["Imagem", "Image", "Imagen"],
  tabVideo: ["Vídeo", "Video", "Video"],
  soon: ["em breve", "soon", "pronto"],
  dropHere: [
    "Arraste a imagem ou clique para escolher",
    "Drag the image or click to choose",
    "Arrastra la imagen o haz clic para elegir",
  ],
  formatsHint: ["JPG, PNG ou WebP · até 40MB", "JPG, PNG or WebP · up to 40MB", "JPG, PNG o WebP · hasta 40MB"],
  compressing: ["Comprimindo…", "Compressing…", "Comprimiendo…"],
  before: ["Antes", "Before", "Antes"],
  after: ["Depois", "After", "Después"],
  saved: ["Economia", "Saved", "Ahorro"],
  download: ["Baixar imagem", "Download image", "Descargar imagen"],
  another: ["Outra imagem", "Another image", "Otra imagen"],
  postHint: [
    "Agora é só baixar e enviar esse arquivo no lugar do original.",
    "Now just download and upload this file instead of the original.",
    "Ahora solo descarga y sube este archivo en lugar del original.",
  ],
  errFormat: [
    "Formato não aceito. Envie JPG, PNG ou WebP.",
    "Unsupported format. Use JPG, PNG or WebP.",
    "Formato no aceptado. Usa JPG, PNG o WebP.",
  ],
  errTooBig: [
    "Imagem grande demais para comprimir aqui (máx. 40MB).",
    "Image too large to compress here (max 40MB).",
    "Imagen demasiado grande para comprimir aquí (máx. 40MB).",
  ],
  errGeneric: ["Não deu pra comprimir essa imagem.", "Couldn't compress this image.", "No se pudo comprimir esta imagen."],
  close: ["Fechar", "Close", "Cerrar"],
  oversizeTitle: ["Arquivo muito grande", "File too large", "Archivo demasiado grande"],
  oversizeBody: [
    "O limite aqui é {limit}. Comprima o arquivo e poste a versão menor.",
    "The limit here is {limit}. Compress the file and post the smaller version.",
    "El límite aquí es {limit}. Comprime el archivo y publica la versión más pequeña.",
  ],
  compressCta: ["Comprimir mídia", "Compress media", "Comprimir medios"],
  chooseAnother: ["Escolher outro arquivo", "Choose another file", "Elegir otro archivo"],
  // Aba Vídeo (servidor temporário)
  dropVideoHere: [
    "Arraste o vídeo ou clique para escolher",
    "Drag the video or click to choose",
    "Arrastra el video o haz clic para elegir",
  ],
  videoFormatsHint: ["MP4, WebM ou MOV · até 500MB", "MP4, WebM or MOV · up to 500MB", "MP4, WebM o MOV · hasta 500MB"],
  uploading: ["Enviando…", "Uploading…", "Subiendo…"],
  processing: [
    "Comprimindo no servidor… isso pode levar alguns minutos.",
    "Compressing on the server… this may take a few minutes.",
    "Comprimiendo en el servidor… esto puede tardar unos minutos.",
  ],
  videoDone: ["Vídeo comprimido!", "Video compressed!", "¡Video comprimido!"],
  downloadVideo: ["Baixar vídeo", "Download video", "Descargar video"],
  anotherVideo: ["Outro vídeo", "Another video", "Otro video"],
  videoExpireHint: [
    "O link fica disponível por cerca de 3 horas. Baixe agora e poste no lugar do original.",
    "The link stays available for about 3 hours. Download now and post it instead of the original.",
    "El enlace queda disponible por unas 3 horas. Descárgalo ahora y publícalo en lugar del original.",
  ],
  videoPrivacyHint: [
    "O vídeo sobe para um estúdio temporário só para a compressão e é apagado automaticamente em cerca de 3 horas.",
    "The video is uploaded to a temporary studio only for compression and is automatically deleted in about 3 hours.",
    "El video se sube a un estudio temporal solo para la compresión y se elimina automáticamente en unas 3 horas.",
  ],
  loginToCompress: [
    "Entrar para comprimir vídeos",
    "Sign in to compress videos",
    "Inicia sesión para comprimir videos",
  ],
  errVideoFormat: [
    "Formato de vídeo não aceito. Envie MP4, WebM ou MOV.",
    "Unsupported video format. Use MP4, WebM or MOV.",
    "Formato de video no aceptado. Usa MP4, WebM o MOV.",
  ],
  errVideoTooBig: [
    "Vídeo grande demais (máx. 500MB).",
    "Video too large (max 500MB).",
    "Video demasiado grande (máx. 500MB).",
  ],
  errVideoGeneric: [
    "Não deu pra comprimir esse vídeo.",
    "Couldn't compress this video.",
    "No se pudo comprimir este video.",
  ],
  errLogin: [
    "Entre na sua conta para comprimir vídeos.",
    "Sign in to compress videos.",
    "Inicia sesión para comprimir videos.",
  ],
}

const GROUPS = { Compress: COMPRESS }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
