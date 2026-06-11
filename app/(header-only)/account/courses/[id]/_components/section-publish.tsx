"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  Loader2,
  Megaphone,
  Radio,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { MyCourse } from "@/hooks/use-my-courses"
import { useCourseFeedPost } from "@/hooks/use-course-feed-post"

interface Props {
  course: MyCourse
  onCourseChanged: (course: MyCourse) => void
}

function formatDate(
  value: string | null | undefined,
  locale: string,
  t: (key: string, fallback?: string) => string,
) {
  if (!value) return t("notPublishedYet", "Ainda não publicado")
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t("dateUnavailable", "Data indisponível")
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function defaultMessage(course: MyCourse, t: (key: string, fallback?: string) => string) {
  const desc = course.short_description?.trim()
  if (desc) return desc
  return t("courseFeedDefaultMessage", "Meu curso {title} está disponível na Freelandoo.").replace("{title}", course.title)
}

function Stat({
  label,
  value,
  locale,
}: {
  label: string
  value: number
  locale: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
      <p className="font-mono text-lg font-semibold text-white">
        {value.toLocaleString(locale)}
      </p>
      <p className="mt-0.5 text-[11px] text-white/45">{label}</p>
    </div>
  )
}

export function CoursePublishSection({ course, onCourseChanged }: Props) {
  const locale = useLocale()
  const t = useTranslations("Account")
  const { feedPost, isLoading, error, publish, remove } = useCourseFeedPost(
    course.id,
  )
  const [message, setMessage] = useState(() => defaultMessage(course, t))
  const [isPublishing, setIsPublishing] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    if (feedPost?.message != null) {
      setMessage(feedPost.message)
    } else {
      setMessage(defaultMessage(course, t))
    }
  }, [course, feedPost?.message, t])

  const isLive = feedPost?.status === "published" && feedPost.is_active
  const publicCourseUrl = course.slug ? `/cursos/${course.slug}` : null

  const blockers = useMemo(() => {
    const items: string[] = []
    if (course.status !== "published") items.push(t("blockerPublishedStatus", "curso em status publicado"))
    if (!course.profile_id) items.push(t("blockerLinkedProfile", "perfil vinculado"))
    if (!course.slug) items.push(t("blockerPublicSlug", "slug público do curso"))
    return items
  }, [course, t])

  async function handlePublish() {
    setIsPublishing(true)
    try {
      const data = await publish(message)
      if (data.course) onCourseChanged(data.course)
      toast.success(isLive ? t("disclosureUpdated", "Divulgação atualizada.") : t("courseSharedFeed", "Curso divulgado no feed."))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("publishFailed", "Falha ao publicar"))
    } finally {
      setIsPublishing(false)
    }
  }

  async function handleRemove() {
    setIsRemoving(true)
    try {
      const data = await remove()
      if (data.course) onCourseChanged(data.course)
      toast.success(t("disclosureRemoved", "Divulgação removida do feed."))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("removeFailed", "Falha ao remover"))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-3xl border border-white/[0.07] bg-zinc-950/50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                isLive
                  ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                  : "border-white/12 bg-white/[0.04] text-white/60"
              }`}
            >
              {isLive ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Radio className="h-3.5 w-3.5" />
              )}
              {isLive ? t("feedStatusOn", "No feed") : t("feedStatusOff", "Fora do feed")}
            </span>
            <span className="text-xs text-white/45">
              {formatDate(feedPost?.published_at, locale, t)}
            </span>
          </div>

          <div className="mt-5 space-y-2">
            <Label htmlFor="course-feed-message">{t("feedMessageLabel", "Mensagem da divulgação")}</Label>
            <Textarea
              id="course-feed-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              rows={7}
              maxLength={1000}
              placeholder={t("feedMessagePlaceholder", "Escreva uma chamada curta para aparecer no feed.")}
              className="border-white/10 bg-zinc-900/80 text-white"
            />
            <div className="flex items-center justify-between gap-3 text-[11px] text-white/45">
              <span>{t("feedMediaHint", "A capa do curso entra como mídia do post quando existir.")}</span>
              <span>{message.length}/1000</span>
            </div>
          </div>
        </div>

        <aside className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950">
            {course.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.cover_url}
                alt=""
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-white/[0.03] px-6 text-center text-xs text-white/35">
                {t("noCoverForPost", "Sem capa para o post")}
              </div>
            )}
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-semibold text-white">
            {t("coursePrefix", "Curso:")} {course.title}
          </p>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-white/50">
            {message || course.short_description || t("feedCourseFallback", "Chamada do curso no feed.")}
          </p>
        </aside>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-xs text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("loadingFeedPostState", "Carregando estado da divulgação...")}
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {blockers.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          {t("feedBlockersPrefix", "Para divulgar no feed, complete:")} {blockers.join(", ")}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={t("postLikes", "Curtidas no post")} value={feedPost?.likes_count ?? 0} locale={locale} />
        <Stat label={t("shares", "Compartilhamentos")} value={feedPost?.shares_count ?? 0} locale={locale} />
        <Stat label={t("impressions", "Impressões")} value={feedPost?.impressions_count ?? 0} locale={locale} />
      </div>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.07] bg-zinc-950/85 px-4 py-3 backdrop-blur-md">
        <div className="mr-auto flex items-center gap-2 text-[12px] text-white/55">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          {isLive ? t("postActivePublic", "Post ativo no feed público.") : t("postReady", "Pronto para criar ou reativar o post.")}
        </div>

        {publicCourseUrl && (
          <Button
            asChild
            type="button"
            variant="ghost"
            className="text-white/70 hover:bg-white/[0.05] hover:text-white"
          >
            <Link href={publicCourseUrl} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              {t("viewCourse", "Ver curso")}
            </Link>
          </Button>
        )}

        {isLive && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            disabled={isRemoving || isPublishing}
            className="text-red-200 hover:bg-red-500/10 hover:text-red-100"
          >
            {isRemoving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {t("removeFromFeed", "Remover do feed")}
          </Button>
        )}

        <Button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing || isRemoving || blockers.length > 0}
        >
          {isPublishing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Megaphone className="mr-2 h-4 w-4" />
          )}
          {isLive ? t("updateDisclosure", "Atualizar divulgação") : t("discloseOnFeed", "Divulgar no feed")}
        </Button>
      </div>
    </div>
  )
}
