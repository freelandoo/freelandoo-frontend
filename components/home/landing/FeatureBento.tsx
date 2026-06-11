"use client"

/**
 * FeatureBento — grade numerada 01-13 de cards brancos sobre o canvas dark.
 * Cada card: número dourado, título, descrição, CTA opcional e um visual
 * conforme `kind` (foto, saque, faturamento, comissão, vídeo, stories,
 * avatars, busca, métricas). Client component (i18n via useTranslations);
 * entrada via data-stagger (RevealMount).
 */
import Image from "next/image"
import { Play, Search, TrendingUp, Plus, Star } from "lucide-react"
import { BENTO, type BentoItem } from "./tokens"
import { Section, PhotoFrame, CardButton, AvatarStack, Icon, DoodleArrow, Halftone, WashiTape } from "./primitives"
import { EditableImage } from "@/components/site-assets/EditableImage"
import { EditableText } from "@/components/site-texts/EditableText"
import { useTranslations } from "@/components/i18n/I18nProvider"

const SPAN: Record<number, string> = { 3: "lg:col-span-3", 4: "lg:col-span-4", 6: "lg:col-span-6", 12: "lg:col-span-12" }

type T = ReturnType<typeof useTranslations>

function BentoVisual({ item, t }: { item: BentoItem; t: T }) {
  switch (item.kind) {
    case "photo":
      return (
        <EditableImage
          slot={`home_seller_bento_${item.n}`}
          slotConfig={{ aspectRatio: 16 / 10, outputWidth: 1280, outputHeight: 800 }}
          className="aspect-[16/10] w-full"
          sizes="(min-width: 1024px) 33vw, 100vw"
          fallback={
            <PhotoFrame src={item.photo} ready alt={item.title} icon={item.n === 11 ? "star" : "briefcase"} className="h-full w-full" />
          }
        />
      )
    case "saque":
      return (
        <div className="bg-[#FAF7F0] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9a8f7a]">{t("bentoVSaldo", "Saldo disponível")}</div>
          <div className="mt-1 text-xl font-black text-[#14110B]">R$ 24.820,00</div>
          <div className="text-[11px] font-bold text-emerald-600">{t("bentoVMonth", "+12% no mês")}</div>
        </div>
      )
    case "faturamento":
      return (
        <div className="bg-[#FAF7F0] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9a8f7a]">{t("bentoVFaturamento", "Faturamento aprovado")}</div>
          <div className="mt-1 flex items-center gap-1.5 text-2xl font-black text-[#14110B]">
            784.321 <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-[11px] text-[#9a8f7a]">{t("bentoVAnalise", "Em análise")}</div>
        </div>
      )
    case "comissao":
      return (
        <div className="flex items-center justify-between bg-[#14110B] px-3 py-3 text-[#FAF7F0]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#F2B705]">{t("bentoVSejaAfiliado", "Seja um afiliado")}</div>
            <div className="text-sm font-black">FREELANDOO!</div>
          </div>
          <span className="bg-[#F2B705] px-2.5 py-1 text-[11px] font-black text-[#1A1505]">{t("bentoVAte70", "até 70%")}</span>
        </div>
      )
    case "video":
      return (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#241f18] to-[#0EA5E9]/30">
          {item.photo && (
            <Image src={item.photo} alt={item.title} fill sizes="(max-width:768px) 90vw, 360px" className="object-cover" />
          )}
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white/90">
            <Play className="h-5 w-5 translate-x-0.5 fill-[#14110B] text-[#14110B]" />
          </span>
          <span className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">0:45</span>
        </div>
      )
    case "stories":
      if (item.photo) {
        return (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0b0804]">
            <Image src={item.photo} alt={item.title} fill sizes="(max-width:768px) 90vw, 360px" className="object-cover" />
          </div>
        )
      }
      return (
        <div className="flex gap-2">
          {["#F2B705", "#EC4899", "#10B981"].map((c, i) => (
            <div key={i} className="aspect-[9/16] flex-1 p-[2px]" style={{ background: `linear-gradient(135deg, ${c}, #E0A500)` }}>
              <div className="h-full w-full" style={{ background: "linear-gradient(160deg,#241f18,#15120e)" }} />
            </div>
          ))}
        </div>
      )
    case "avatars":
      return (
        <div className="flex items-center gap-3 bg-[#FAF7F0] px-3 py-3">
          <AvatarStack count={4} className="[&>*]:!border-[#FAF7F0]" />
          <span className="flex h-8 w-8 items-center justify-center bg-[#14110B] text-[#FAF7F0]"><Plus className="h-4 w-4" /></span>
          <span className="text-xs font-semibold text-[#6B6457]">{t("bentoVCriadores", "+999 criadores")}</span>
        </div>
      )
    case "search":
      return (
        <div className="bg-[#FAF7F0] p-3">
          <div className="space-y-1.5">
            {[
              t("bentoVSearchMarketing", "Marketing"),
              t("bentoVSearchSaude", "Saúde, fitness"),
              t("bentoVSearchCripto", "Cripto, investimentos"),
            ].map((term) => (
              <div key={term} className="flex items-center gap-2 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#14110B]">
                <Search className="h-3 w-3 text-[#9a8f7a]" /> {term}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#9a8f7a]">{t("bentoVResultados", "+999 resultados")}</span>
            <AvatarStack count={3} className="[&>*]:!border-[#FAF7F0] [&>*]:!h-6 [&>*]:!w-6" />
          </div>
        </div>
      )
    case "metrics":
    default:
      return (
        <div className="flex items-center gap-3 bg-[#FAF7F0] px-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center bg-[#F2B705]/15 text-[#E0A500]">
            <Icon name={item.icon ?? "star"} className="h-5 w-5" />
          </span>
          <Star className="h-4 w-4 text-[#F2B705]" />
          <span className="text-xs font-semibold text-[#6B6457]">{t("bentoVPronto", "Pronto para usar")}</span>
        </div>
      )
  }
}

export function FeatureBento() {
  const t = useTranslations("Home")
  return (
    <Section id="recursos">
      <div className="relative mb-12 max-w-2xl">
        <p className="fl-marker mb-1 text-2xl font-bold text-[#F2B705]">
          <EditableText as="span" mark={false} slot="home_seller_bento_eyebrow" fallback="tudo num lugar só" />
        </p>
        <h2 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl md:text-6xl">
          <EditableText as="span" slot="home_seller_bento_heading" fallback="Vender, ensinar, *aprender e ganhar.*" />
        </h2>
        <DoodleArrow dir="left" className="absolute -right-4 top-2 hidden h-10 w-20 text-[#F2B705] lg:block" />
      </div>

      <div data-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        {BENTO.map((item) => {
          const isPhoto = item.kind === "photo"
          return (
            <article
              key={item.n}
              data-card
              className={`relative flex flex-col overflow-hidden fl-card fl-hard p-5 ${SPAN[item.span] ?? "lg:col-span-4"}`}
            >
              <Halftone className="absolute -bottom-2 -right-2 h-14 w-14 opacity-[0.14]" ink />
              {item.n % 3 === 0 && <WashiTape className="-right-3 top-5" off rotate={12} />}
              {isPhoto && <div className="relative mb-4"><BentoVisual item={item} t={t} /></div>}
              <div className="relative flex items-start gap-3">
                <span className="fl-display shrink-0 text-4xl text-[#F2B705]">{String(item.n).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wide text-[#0B0B0D]">{t(`bento${item.n}Title`, item.title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#6B6457]">{t(`bento${item.n}Desc`, item.desc)}</p>
                </div>
              </div>
              {!isPhoto && <div className="relative mt-4"><BentoVisual item={item} t={t} /></div>}
              {item.cta && <CardButton href={item.href} className="relative mt-4 self-start">{t(`bento${item.n}Cta`, item.cta)}</CardButton>}
            </article>
          )
        })}
      </div>
    </Section>
  )
}
