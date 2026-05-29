/**
 * Kit tabloide — ponto de entrada único para o redesign editorial das páginas.
 *
 * Re-exporta o chrome novo (header, casca, heros, estados) e os primitivos da
 * landing, para que as páginas importem tudo de `@/components/tabloide` sem
 * alcançar dentro de `components/home/landing`.
 */
export { TabloidHeader } from "./TabloidHeader"
export {
  PageShell,
  PageHero,
  EmptyState,
  LoadingState,
  ErrorState,
  Skeleton,
  Prose,
} from "./kit"

// Primitivos reusáveis (re-export para conveniência).
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
