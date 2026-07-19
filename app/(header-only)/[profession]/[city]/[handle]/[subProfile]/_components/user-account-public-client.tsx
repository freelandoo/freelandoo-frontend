"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  Instagram,
  Layers3,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Video,
  Youtube,
} from "lucide-react"
import { UserAccountPortfolioTabs } from "./user-account-portfolio-tabs"
import { ProfileVisitTracker } from "@/components/profile/profile-visit-tracker"
import { FollowButton } from "@/components/entity-follow/follow-button"
import { EntityFollowModal } from "@/components/entity-follow/entity-follow-modal"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import type { AccountSummary, Item, PublicUserProfile } from "./user-account-public-view"

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function socialIconFor(platform: string, icon?: string | null) {
  const p = (icon || platform || "").toLowerCase()
  if (p.includes("youtube")) return Youtube
  if (p.includes("tiktok")) return Video
  return Instagram
}

export function UserAccountPublicClient({
  profile,
  items,
  summary,
}: {
  profile: PublicUserProfile
  items: Item[]
  summary: AccountSummary
}) {
  const t = useTranslations("Profile")
  const locale = useLocale()
  const account = summary.account
  const [followersCount, setFollowersCount] = useState(account?.followers_count ?? 0)
  const [followersOpen, setFollowersOpen] = useState(false)

  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")
  const bannerUrl =
    profile.manifestation?.banner_url || profile.manifestation?.banner_thumb_url || null
  const courses = summary.courses

  const formatPrice = (priceCents: number | null) => {
    if (!priceCents || priceCents <= 0) return t("coursePriceFree", "Gratuito")
    return new Intl.NumberFormat(locale === "pt-BR" ? "pt-BR" : locale, {
      style: "currency",
      currency: "BRL",
    }).format(priceCents / 100)
  }

  return (
    <div className="fl-sharp bg-background min-h-screen">
      <ProfileVisitTracker idProfile={profile.id_profile} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-10 overflow-hidden border border-border/70 bg-card shadow-sm">
          <div className="relative h-40 bg-muted md:h-52">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.22),transparent_32%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            {profile.manifestation?.tag_label && (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 border border-amber-200/70 bg-background/85 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {profile.manifestation.tag_label}
              </div>
            )}
          </div>

          <div className="px-5 pb-6 md:px-7">
            <div className="-mt-12 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:gap-6 md:text-left">
              <div className="relative flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden border-4 border-background bg-primary/10 ring-1 ring-border md:w-28">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-primary">
                    {getInitials(profile.display_name)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                    {profile.display_name}
                  </h1>
                  {account && (
                    <span
                      className="inline-flex items-center gap-1 border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600"
                      title={t("accountLevelHint", "Nível da conta — sobe com o engajamento")}
                    >
                      <Sparkles className="h-3 w-3" />
                      {t("accountLevel", "Nível {level}").replace(
                        "{level}",
                        String(account.xp_level ?? 0)
                      )}
                    </span>
                  )}
                </div>
                {profile.username && (
                  <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:justify-start">
                  {location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {location}
                    </span>
                  )}
                  {account && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFollowersOpen(true)}
                        className="tabular-nums transition hover:text-foreground"
                        title={t("seeFollowers", "Ver quem acompanha")}
                      >
                        <span className="font-semibold text-foreground">{followersCount}</span>{" "}
                        {t("followersLabel", "seguidores")}
                      </button>
                      <span className="tabular-nums">
                        <span className="font-semibold text-foreground">
                          {account.following_count}
                        </span>{" "}
                        {t("followingLabel", "acompanhados")}
                      </span>
                    </>
                  )}
                </div>
                {account && account.social_media.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    {account.social_media.map((sm) => {
                      if (!sm.url) return null
                      const SIcon = socialIconFor(sm.desc_social_media_type, sm.icon)
                      return (
                        <a
                          key={sm.id_social_media_type}
                          href={sm.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={sm.desc_social_media_type}
                          aria-label={sm.desc_social_media_type}
                          className="inline-flex h-8 w-8 items-center justify-center border border-border bg-card text-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <SIcon className="h-4 w-4" />
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 pb-1">
                {account && (
                  <FollowButton
                    targetType="profile"
                    targetId={account.id_profile}
                    compact
                    onChanged={({ isFollowing, counts }) => {
                      if (counts && typeof counts.followers_count === "number") {
                        setFollowersCount(counts.followers_count)
                      } else {
                        setFollowersCount((n) => Math.max(0, n + (isFollowing ? 1 : -1)))
                      }
                    }}
                  />
                )}
                <Link
                  href={`/mensagens?with=${encodeURIComponent(profile.id_profile)}`}
                  aria-label={t("sendMessageTo", "Enviar mensagem para {name}").replace(
                    "{name}",
                    profile.display_name
                  )}
                  title={t("sendMessage", "Enviar mensagem")}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-card text-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 divide-x divide-border border border-border/70 bg-background/70">
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <Layers3 className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {t("statProfiles", "Perfis")}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{summary.profiles_count}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {t("statClans", "Clans")}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{summary.clans_count}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    {t("statCourses", "Cursos")}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{courses.length}</p>
              </div>
            </div>
          </div>
        </section>

        <UserAccountPortfolioTabs items={items} />

        {courses.length > 0 && (
          <section className="mb-14">
            <div className="mb-5 flex items-center justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">
                  {t("coursesTitle", "Meus cursos")}
                </h2>
              </div>
            </div>

            <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="group overflow-hidden bg-card transition duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex h-full flex-col">
                    <div className="aspect-[4/5] bg-muted">
                      {course.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col justify-between p-2 md:p-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-xs font-semibold leading-snug md:text-sm">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground md:text-xs">
                            {course.short_description}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-muted-foreground md:text-[10px]">
                          {t("coursePublished", "Publicado")}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground md:text-sm">
                          {formatPrice(course.price_cents)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {account && (
        <EntityFollowModal
          open={followersOpen}
          onOpenChange={setFollowersOpen}
          entityType="profile"
          entityId={account.id_profile}
          mode="followers"
        />
      )}
    </div>
  )
}
