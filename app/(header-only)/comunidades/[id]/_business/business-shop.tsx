"use client"

// A VITRINE do negócio (repaginada "BALCÃO ACESO", N5) — a aba Produtos.
//
// ⚠️ VESTE, NÃO REESCREVE: os cartões de produto são os MESMOS do perfil
// (`ProfileOwnerProductsSection` / `ProfilePublicProductsSection`), porque é
// o mesmo catálogo do perfil-conta do líder e do site. Um segundo cartão
// "do negócio" divergiria do do perfil na primeira mudança de preço/foto.
// Aqui entra só a moldura: vitrine acesa na cor do dono, cabeçalho e a
// entrada animada pelo kit compartilhado.

import dynamic from "next/dynamic"
import { ShoppingBag } from "lucide-react"
import { Reveal } from "@/components/motion/motion-kit"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { alpha, BZ, EYEBROW, neonText } from "./bz-tokens"

const ProfileOwnerProductsSection = dynamic(
  () => import("@/components/profile/profile-owner-products-section").then((m) => m.ProfileOwnerProductsSection),
  { ssr: false }
)
const ProfilePublicProductsSection = dynamic(
  () => import("@/components/profile/profile-public-products-section").then((m) => m.ProfilePublicProductsSection),
  { ssr: false }
)

export function BusinessShop({
  profileId,
  isLeader,
  accent,
}: {
  profileId: string | null
  isLeader: boolean
  accent: string
}) {
  const t = useTranslations("Community")

  return (
    <Reveal tilt={false}>
      <section
        className="fl-sharp relative overflow-hidden border-2 border-[#0B0B0D] bg-[#15120E]"
        style={{ boxShadow: `6px 6px 0 0 ${BZ.line}, 0 0 0 1px ${alpha(accent, 0.3)}, 0 24px 60px -30px ${alpha(accent, 0.7)}` }}
      >
        {/* O vidro da vitrine: um reflexo parado no alto (CSS, sem GPU). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{ background: `linear-gradient(180deg, ${alpha(accent, 0.16)}, transparent)` }}
        />
        <header className="relative flex items-end justify-between gap-3 border-b-2 border-[#F1EDE2]/12 px-5 py-4">
          <div>
            <p className={`${EYEBROW} flex items-center gap-1.5`}>
              <ShoppingBag className="h-3.5 w-3.5" style={{ color: accent }} />
              {t("shopEyebrow", "Vitrine")}
            </p>
            <h2 className="fl-display mt-1 text-3xl leading-none text-[#F5F1E8]" style={neonText(accent, 0.45)}>
              {isLeader ? t("shopTitleOwner", "Seus produtos") : t("shopTitlePublic", "Produtos à venda")}
            </h2>
          </div>
          <p className="hidden max-w-[16rem] text-right text-[11px] leading-snug text-[#9A938A] sm:block">
            {t("shopPickupNote", "Compra pela Freelandoo, retirada com o vendedor.")}
          </p>
        </header>

        <div className="relative px-3 pb-2 pt-5 md:px-5">
          {profileId ? (
            isLeader ? (
              <ProfileOwnerProductsSection profileId={profileId} />
            ) : (
              <ProfilePublicProductsSection profileId={profileId} />
            )
          ) : (
            <div className="px-6 py-14 text-center">
              <ShoppingBag className="mx-auto h-10 w-10" style={{ color: accent }} />
              <p className="mt-4 text-sm text-[#9A938A]">
                {t("shopEmpty", "Este negócio ainda não tem produtos à venda.")}
              </p>
            </div>
          )}
        </div>
      </section>
    </Reveal>
  )
}
