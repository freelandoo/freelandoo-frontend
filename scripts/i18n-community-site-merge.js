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

  // ─── Endereço e domínio próprio (migs 213/214) ───────────────────────────
  domainsButton: ["Endereço", "Address", "Dirección"],
  domainsTitle: ["Endereço do site", "Site address", "Dirección del sitio"],
  slugTitle: ["Endereço na Freelandoo", "Address on Freelandoo", "Dirección en Freelandoo"],
  slugEdit: ["Mudar endereço", "Change address", "Cambiar dirección"],
  slugWarning: [
    "Ao mudar o endereço, os links antigos param de funcionar.",
    "Changing the address breaks the old links.",
    "Al cambiar la dirección, los enlaces antiguos dejan de funcionar.",
  ],
  slugError: [
    "Não foi possível mudar o endereço.",
    "Could not change the address.",
    "No se pudo cambiar la dirección.",
  ],
  publishFirst: [
    "Publique o site para ele ganhar um endereço.",
    "Publish the site so it gets an address.",
    "Publica el sitio para que tenga una dirección.",
  ],
  customDomainsTitle: ["Domínio próprio", "Custom domain", "Dominio propio"],
  customDomainsEmpty: [
    "Ligue um domínio que você já tem, como suacomunidade.com.br.",
    "Connect a domain you already own, like yourcommunity.com.",
    "Conecta un dominio que ya tengas, como tucomunidad.com.",
  ],
  domainPlaceholder: ["suacomunidade.com.br", "yourcommunity.com", "tucomunidad.com"],
  domainAdd: ["Ligar", "Connect", "Conectar"],
  domainAddError: [
    "Não foi possível adicionar o domínio.",
    "Could not add the domain.",
    "No se pudo añadir el dominio.",
  ],
  domainsLoadError: [
    "Não foi possível carregar os domínios.",
    "Could not load the domains.",
    "No se pudieron cargar los dominios.",
  ],
  domainActionError: [
    "A ação não pôde ser concluída.",
    "The action could not be completed.",
    "La acción no pudo completarse.",
  ],
  domainPending: ["Aguardando DNS", "Waiting for DNS", "Esperando DNS"],
  domainPendingHint: [
    "Crie o registro TXT abaixo no painel do seu domínio e clique em Verificar.",
    "Create the TXT record below in your domain panel, then click Verify.",
    "Crea el registro TXT de abajo en el panel de tu dominio y pulsa Verificar.",
  ],
  domainVerified: ["Verificado", "Verified", "Verificado"],
  domainVerifiedHint: [
    "Posse confirmada. O certificado de segurança está sendo emitido — isso pode levar alguns minutos.",
    "Ownership confirmed. The security certificate is being issued — this can take a few minutes.",
    "Propiedad confirmada. El certificado de seguridad se está emitiendo — puede tardar unos minutos.",
  ],
  domainActive: ["No ar", "Live", "En línea"],
  domainActiveHint: [
    "O site já responde neste domínio.",
    "The site already responds on this domain.",
    "El sitio ya responde en este dominio.",
  ],
  domainError: ["Com problema", "Has a problem", "Con problema"],
  domainErrorHint: [
    "Algo falhou. Confira o DNS e tente de novo.",
    "Something failed. Check the DNS and try again.",
    "Algo falló. Revisa el DNS e inténtalo de nuevo.",
  ],
  domainVerifyAction: ["Verificar", "Verify", "Verificar"],
  domainRefreshAction: ["Checar de novo", "Check again", "Comprobar de nuevo"],
  domainDnsHelp: [
    "Depois de verificar, aponte o domínio para a Freelandoo no painel do seu registrador (registro A para o domínio raiz, ou CNAME para subdomínio).",
    "After verifying, point the domain to Freelandoo in your registrar panel (A record for the root domain, or CNAME for a subdomain).",
    "Después de verificar, apunta el dominio a Freelandoo en el panel de tu registrador (registro A para el dominio raíz, o CNAME para subdominio).",
  ],
  dnsType: ["Tipo", "Type", "Tipo"],
  dnsHost: ["Nome / Host", "Name / Host", "Nombre / Host"],
  dnsValue: ["Valor", "Value", "Valor"],
  open: ["Abrir", "Open", "Abrir"],
  remove: ["Remover", "Remove", "Eliminar"],
  save: ["Salvar", "Save", "Guardar"],

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
