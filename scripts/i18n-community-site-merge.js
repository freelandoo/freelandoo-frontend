/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves do "Meu Site" — o construtor visual de site da
// comunidade (mig 212).
//
// Namespace novo `CommunitySite` para o construtor inteiro (barra, paleta,
// seções, placeholders) + 2 chaves no ns `Community` já existente (o item do
// menu "+" e a aba).
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-community-site-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const COMMUNITY = {
  mySite: ["Meu Site", "My Site", "Mi Sitio"],
  tabSite: ["Site", "Site", "Sitio"],
};

const COMMUNITY_SITE = {
  // ─── Barra do construtor ─────────────────────────────────────────────────
  modeEditing: ["Editando", "Editing", "Editando"],
  modeViewing: ["Visualizando", "Viewing", "Viendo"],
  viewportDesktop: ["Desktop", "Desktop", "Escritorio"],
  viewportTablet: ["Tablet", "Tablet", "Tableta"],
  viewportMobile: ["Celular", "Mobile", "Móvil"],
  addSection: ["Adicionar seção", "Add section", "Añadir sección"],
  paletteButton: ["Cores", "Colors", "Colores"],
  publish: ["Publicar site", "Publish site", "Publicar sitio"],
  unpublish: [
    "Publicado · despublicar",
    "Published · unpublish",
    "Publicado · despublicar",
  ],
  draftNotice: [
    "Rascunho — só você enxerga este site até publicar.",
    "Draft — only you can see this site until you publish.",
    "Borrador — solo tú ves este sitio hasta publicarlo.",
  ],

  // ─── Status do autosave ──────────────────────────────────────────────────
  statusSaving: ["Salvando…", "Saving…", "Guardando…"],
  statusPending: ["Alterações pendentes", "Unsaved changes", "Cambios pendientes"],
  statusSaved: [
    "Todas as alterações salvas",
    "All changes saved",
    "Todos los cambios guardados",
  ],
  statusError: ["Falha ao salvar", "Save failed", "Error al guardar"],

  // ─── Erros e estados ─────────────────────────────────────────────────────
  loadError: [
    "Não foi possível carregar o site.",
    "Could not load the site.",
    "No se pudo cargar el sitio.",
  ],
  saveError: ["Não foi possível salvar.", "Could not save.", "No se pudo guardar."],
  publishError: [
    "Não foi possível publicar.",
    "Could not publish.",
    "No se pudo publicar.",
  ],
  uploadError: [
    "Não foi possível enviar a imagem.",
    "Could not upload the image.",
    "No se pudo enviar la imagen.",
  ],
  lockedNotice: [
    "Entre na comunidade para ver o site dela.",
    "Join the community to see its site.",
    "Únete a la comunidad para ver su sitio.",
  ],
  noSiteYet: [
    "Esta comunidade ainda não publicou um site.",
    "This community has not published a site yet.",
    "Esta comunidad aún no ha publicado un sitio.",
  ],
  canvasEmpty: [
    "Este site ainda não tem conteúdo.",
    "This site has no content yet.",
    "Este sitio aún no tiene contenido.",
  ],
  canvasEmptyEditing: [
    "Adicione a primeira seção pelo botão acima.",
    "Add the first section using the button above.",
    "Añade la primera sección con el botón de arriba.",
  ],

  // ─── Cabeçalho do site ───────────────────────────────────────────────────
  siteNamePlaceholder: ["Nome do site", "Site name", "Nombre del sitio"],
  taglinePlaceholder: [
    "Uma frase que resume a comunidade",
    "A line that sums up the community",
    "Una frase que resume la comunidad",
  ],
  sectionTitlePlaceholder: ["Título da seção", "Section title", "Título de la sección"],
  sectionSubtitlePlaceholder: [
    "Subtítulo (opcional)",
    "Subtitle (optional)",
    "Subtítulo (opcional)",
  ],

  // ─── Barra de ações da seção ─────────────────────────────────────────────
  moveUp: ["Mover para cima", "Move up", "Mover arriba"],
  moveDown: ["Mover para baixo", "Move down", "Mover abajo"],
  showSection: ["Mostrar seção", "Show section", "Mostrar sección"],
  hideSection: ["Ocultar seção", "Hide section", "Ocultar sección"],
  removeSection: ["Remover seção", "Remove section", "Eliminar sección"],
  confirmRemove: ["Remover", "Remove", "Eliminar"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  close: ["Fechar", "Close", "Cerrar"],
  prev: ["Anterior", "Previous", "Anterior"],
  next: ["Próximo", "Next", "Siguiente"],
  columns: ["Colunas", "Columns", "Columnas"],
  changeImage: ["Trocar imagem", "Change image", "Cambiar imagen"],
  imageHint: [
    "Clique para enviar uma imagem",
    "Click to upload an image",
    "Haz clic para subir una imagen",
  ],
  removePhoto: ["Remover foto", "Remove photo", "Eliminar foto"],
  framing: ["Enquadramento", "Framing", "Encuadre"],
  removeImage: ["Remover imagem", "Remove image", "Eliminar imagen"],

  // ─── Nomes das seções ────────────────────────────────────────────────────
  sectionHero: ["Banner principal", "Main banner", "Banner principal"],
  sectionServices: ["Catálogo de serviços", "Service catalog", "Catálogo de servicios"],
  sectionAbout: ["Sobre nós", "About us", "Sobre nosotros"],
  sectionTestimonials: ["Depoimentos", "Testimonials", "Testimonios"],
  sectionGallery: ["Galeria de fotos", "Photo gallery", "Galería de fotos"],
  sectionContact: [
    "Contato e localização",
    "Contact and location",
    "Contacto y ubicación",
  ],

  // ─── Hero ────────────────────────────────────────────────────────────────
  heroHeadline: ["Manchete do banner", "Banner headline", "Titular del banner"],
  heroSubheadline: ["Uma linha de apoio", "A supporting line", "Una línea de apoyo"],
  heroCtaText: ["Texto do botão", "Button text", "Texto del botón"],
  heroCtaUrl: [
    "Link do botão (https://...)",
    "Button link (https://...)",
    "Enlace del botón (https://...)",
  ],
  heroAddSlide: ["Novo banner", "New banner", "Nuevo banner"],
  heroRemoveSlide: ["Remover banner", "Remove banner", "Eliminar banner"],

  // ─── Catálogo de serviços ────────────────────────────────────────────────
  serviceTitle: ["Nome do serviço", "Service name", "Nombre del servicio"],
  serviceDescription: ["O que está incluso", "What is included", "Qué incluye"],
  servicePrice: ["R$ 0,00", "$ 0.00", "$ 0,00"],
  serviceDuration: ["Duração", "Duration", "Duración"],
  serviceCtaText: ["Texto do botão", "Button text", "Texto del botón"],
  serviceCtaUrl: ["Link do botão", "Button link", "Enlace del botón"],
  serviceAdd: ["Adicionar serviço", "Add service", "Añadir servicio"],
  serviceRemove: ["Remover serviço", "Remove service", "Eliminar servicio"],
  serviceEmpty: [
    "Nenhum serviço cadastrado ainda.",
    "No services added yet.",
    "Aún no hay servicios.",
  ],

  // ─── Sobre nós ───────────────────────────────────────────────────────────
  aboutBody: [
    "Conte a história da comunidade.",
    "Tell the community's story.",
    "Cuenta la historia de la comunidad.",
  ],
  aboutHighlightTitle: [
    "Título do destaque",
    "Highlight title",
    "Título del destacado",
  ],
  aboutHighlightDescription: [
    "Uma linha explicando",
    "One line explaining it",
    "Una línea explicando",
  ],
  aboutAddHighlight: ["Novo destaque", "New highlight", "Nuevo destacado"],
  aboutRemoveHighlight: ["Remover destaque", "Remove highlight", "Eliminar destacado"],
  aboutAddPhoto: ["Nova foto", "New photo", "Nueva foto"],

  // ─── Depoimentos ─────────────────────────────────────────────────────────
  testimonialName: ["Nome", "Name", "Nombre"],
  testimonialRole: ["Quem é (opcional)", "Who they are (optional)", "Quién es (opcional)"],
  testimonialText: [
    "O que essa pessoa disse",
    "What this person said",
    "Lo que dijo esta persona",
  ],
  testimonialAdd: ["Novo depoimento", "New testimonial", "Nuevo testimonio"],
  testimonialRemove: [
    "Remover depoimento",
    "Remove testimonial",
    "Eliminar testimonio",
  ],
  testimonialRating: ["Nota", "Rating", "Calificación"],
  testimonialEmpty: [
    "Nenhum depoimento ainda.",
    "No testimonials yet.",
    "Aún no hay testimonios.",
  ],

  // ─── Galeria ─────────────────────────────────────────────────────────────
  galleryCaption: ["Legenda (opcional)", "Caption (optional)", "Leyenda (opcional)"],
  galleryAdd: ["Nova foto", "New photo", "Nueva foto"],
  galleryEmpty: ["Nenhuma foto ainda.", "No photos yet.", "Aún no hay fotos."],

  // ─── Contato ─────────────────────────────────────────────────────────────
  contactAddress: [
    "Rua, número, bairro, cidade",
    "Street, number, district, city",
    "Calle, número, barrio, ciudad",
  ],
  contactMapsUrl: [
    "Link do Google Maps",
    "Google Maps link",
    "Enlace de Google Maps",
  ],
  contactWhatsapp: ["WhatsApp com DDD", "WhatsApp with area code", "WhatsApp con código"],
  contactEmail: ["E-mail de contato", "Contact email", "Correo de contacto"],
  contactHours: [
    "Horário de funcionamento",
    "Opening hours",
    "Horario de atención",
  ],
  contactSocialLabel: ["Rede", "Network", "Red"],
  contactSocialUrl: ["Link do perfil", "Profile link", "Enlace del perfil"],
  contactAddSocial: ["Nova rede", "New network", "Nueva red"],
  contactRemoveSocial: ["Remover rede", "Remove network", "Eliminar red"],
  contactOpenMaps: ["Abrir no mapa", "Open in maps", "Abrir en el mapa"],
  contactTalkWhatsapp: [
    "Falar no WhatsApp",
    "Chat on WhatsApp",
    "Hablar por WhatsApp",
  ],
  contactEmpty: [
    "Sem informações de contato.",
    "No contact information.",
    "Sin información de contacto.",
  ],

  // ─── Paleta ──────────────────────────────────────────────────────────────
  paletteTitle: ["Paleta de cores", "Color palette", "Paleta de colores"],
  paletteCustom: ["Ajuste fino", "Fine tuning", "Ajuste fino"],
  paletteFreelandoo: [
    "Dourado Freelandoo",
    "Freelandoo gold",
    "Dorado Freelandoo",
  ],
  paletteAbsolute: ["Preto absoluto", "Absolute black", "Negro absoluto"],
  paletteAmber: ["Âmbar escuro", "Dark amber", "Ámbar oscuro"],
  paletteCyberpunk: ["Cyberpunk", "Cyberpunk", "Cyberpunk"],
  paletteMinimal: ["Minimalista claro", "Light minimal", "Minimalista claro"],
  paletteLeaf: ["Verde folha", "Leaf green", "Verde hoja"],
  tokenPrimary: ["Primária", "Primary", "Primaria"],
  tokenAccent: ["Destaque", "Accent", "Acento"],
  tokenBackground: ["Fundo", "Background", "Fondo"],
  tokenSurface: ["Superfície", "Surface", "Superficie"],
  tokenTextPrimary: ["Texto", "Text", "Texto"],
  tokenTextSecondary: ["Texto secundário", "Secondary text", "Texto secundario"],
};

const NAMESPACES = { Community: COMMUNITY, CommunitySite: COMMUNITY_SITE };

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log(`Chaves adicionadas: ${added}`);
