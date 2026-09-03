/**
 * Kit tabloide — ponto de entrada único para o redesign editorial das páginas.
 *
 * Re-exporta o chrome da página (header, casca, heros, estados), as peças de
 * conteúdo extraídas da `/mensagens` (lista, linha, aba, campo, tabela,
 * diálogo) e os primitivos da landing, para que as páginas importem tudo de
 * `@/components/tabloide` sem alcançar dentro de `components/home/landing`
 * nem de `components/ui`.
 *
 * A regra de lint (`no-restricted-imports`) barra `@/components/ui/*` fora
 * daqui: se falta uma peça, ela nasce neste diretório — não na página.
 */

/* ── Chrome da página ─────────────────────────────────────────────────────── */
export { TabloidHeader } from "./TabloidHeader"
export { PageBackLink } from "./PageBackLink"
export { AuthShell, AuthCard } from "./AuthShell"
export {
  PageShell,
  PageHero,
  TabloidPageIntro,
  TabloidBackLink,
  TABLOID_ACTION_CLASSES,
  TABLOID_OUTLINE_ACTION_CLASSES,
  TABLOID_PAPER_CARD_CLASSES,
  TABLOID_DARK_PANEL_CLASSES,
  EmptyState,
  LoadingState,
  ErrorState,
  Skeleton,
  Prose,
} from "./kit"

/* ── Peças de conteúdo (a gramática da /mensagens) ───────────────────────── */
export {
  // 1+2+3 manchete, sobrancelha, cinta
  TabloidMasthead,
  TabloidEyebrow,
  // 4 abas
  TabloidTabs,
  TabloidTab,
  // 5 busca
  TabloidSearch,
  // 6+7+8+9 linha de papel
  PaperRow,
  PaperPortrait,
  PaperStamp,
  stampCount,
  PaperList,
  PaperListItem,
  // casca de duas colunas + painel escuro
  SplitShell,
  DarkPanel,
  // mesa de redação
  TabloidTable,
  // ficha
  TabloidField,
  TabloidInput,
  TabloidTextarea,
  TabloidSelect,
  // etiqueta e número
  TabloidChip,
  TabloidStat,
} from "./pieces"
export type { TabloidTabItem, TabloidColumn } from "./pieces"

export { TabloidDialog, TabloidDialogClose, TabloidDialogTrigger } from "./TabloidDialog"

/* ── Primitivos reusáveis (re-export para conveniência) ──────────────────── */
export {
  Section,
  SectionHeading,
  YellowHighlight,
  MarkerText,
  GoldButton,
  OutlineButton,
  InkButton,
  CardButton,
  Badge,
  Sticker,
  StickerNote,
  TornPaperCard,
  PhotoFrame,
  Halftone,
  PaperTexture,
  HoneycombField,
  HiveDoodle,
  DoodleArrow,
  Squiggle,
  Spark,
  Underline,
  CircleScribble,
  StrokeNumber,
  BigNumber,
} from "@/components/home/landing/primitives"
