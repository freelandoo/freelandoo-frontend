"use client"

/**
 * Gerenciamento da conta — visão única em listas de tudo que o user possui:
 * subperfis, serviços, cursos e produtos (agregados de todos os subperfis via
 * GET /me/offerings). Cada linha permite entrar pra editar (página própria ou
 * modal owner existente) e excluir com confirmação. Clans ficam de fora
 * (gestão própria em /account/clans); o perfil-fantasma da conta (mig 052)
 * nunca aparece nem pode ser excluído daqui.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Loader2,
  Package,
  PencilLine,
  Trash2,
  Users,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ProfileServiceEditModal } from "@/components/profile/profile-service-edit-modal"
import {
  ProfileProductEditModal,
  type ProfileProduct,
} from "@/components/profile/profile-product-edit-modal"
import type { ProfileService } from "@/components/calendar/types"
import { getStoredUser, getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

interface MgmtProfile {
  id_profile: string
  display_name: string
  avatar_url: string | null
  desc_category: string | null
  estado: string | null
  municipio: string | null
  is_active: boolean
  is_clan: boolean
  is_user_account: boolean
  is_paid: boolean
}

interface OfferingItem {
  id: number | string
  id_profile?: string
  kind: "product" | "service" | "course"
  name: string
  description: string | null
  duration_minutes?: number
  price_cents: number | null
  is_active?: boolean
  image_url?: string | null
  slug?: string | null
  status?: string | null
  published?: boolean
  profile_display_name: string | null
  public_url: string
}

interface Offerings {
  products: OfferingItem[]
  services: OfferingItem[]
  courses: OfferingItem[]
}

type DeleteTarget =
  | { kind: "profile"; id: string; name: string }
  | { kind: "service"; id: number | string; id_profile: string; name: string }
  | { kind: "product"; id: number | string; id_profile: string; name: string }
  | { kind: "course"; id: string; name: string }

function authHeaders(contentType = false): HeadersInit {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (contentType) headers["Content-Type"] = "application/json"
  return headers
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

export default function AccountManagementPage() {
  const t = useTranslations("Account")
  const locale = useLocale()
  const router = useRouter()

  const [profiles, setProfiles] = useState<MgmtProfile[]>([])
  const [offerings, setOfferings] = useState<Offerings>({ products: [], services: [], courses: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editLoadingKey, setEditLoadingKey] = useState<string | null>(null)
  const [serviceModal, setServiceModal] = useState<{ profileId: string; service: ProfileService } | null>(null)
  const [productModal, setProductModal] = useState<{ profileId: string; product: ProfileProduct } | null>(null)

  const formatPrice = useCallback(
    (cents: number | null | undefined) => {
      if (cents == null) return null
      const value = Number(cents) / 100
      const intlLocale = locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es" : "en"
      return new Intl.NumberFormat(intlLocale, { style: "currency", currency: "BRL" }).format(value)
    },
    [locale],
  )

  const loadAll = useCallback(async () => {
    const me = getStoredUser()
    const token = getToken()
    if (!token || !me?.id_user) {
      window.location.href = `/login?next=${encodeURIComponent("/account/gerenciamento")}`
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [profilesRes, offeringsRes] = await Promise.all([
        fetch(`/api/profile/user/${encodeURIComponent(me.id_user)}`, { headers: authHeaders(), cache: "no-store" }),
        fetch(`/api/me/offerings`, { headers: authHeaders(), cache: "no-store" }),
      ])
      const profilesData = (await profilesRes.json().catch(() => ({}))) as { profiles?: MgmtProfile[]; error?: string }
      const offeringsData = (await offeringsRes.json().catch(() => ({}))) as Partial<Offerings> & { error?: string }
      if (!profilesRes.ok || !Array.isArray(profilesData.profiles)) {
        throw new Error(profilesData.error || t("mgmtLoadError", "Erro ao carregar gerenciamento"))
      }
      if (!offeringsRes.ok) {
        throw new Error(offeringsData.error || t("mgmtLoadError", "Erro ao carregar gerenciamento"))
      }
      setProfiles(profilesData.profiles.filter((p) => !p.is_clan && !p.is_user_account))
      setOfferings({
        products: offeringsData.products || [],
        services: offeringsData.services || [],
        courses: offeringsData.courses || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mgmtLoadError", "Erro ao carregar gerenciamento"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const openServiceEdit = async (item: OfferingItem) => {
    if (!item.id_profile) return
    const key = `service-${item.id}`
    setEditLoadingKey(key)
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(item.id_profile)}/services`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      const data = (await res.json().catch(() => ({}))) as { services?: ProfileService[]; error?: string }
      const full = data.services?.find((s) => String(s.id_profile_service) === String(item.id))
      if (!res.ok || !full) throw new Error(data.error || t("mgmtEditLoadError", "Erro ao abrir edição"))
      setServiceModal({ profileId: item.id_profile, service: full })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("mgmtEditLoadError", "Erro ao abrir edição"))
    } finally {
      setEditLoadingKey(null)
    }
  }

  const openProductEdit = async (item: OfferingItem) => {
    if (!item.id_profile) return
    const key = `product-${item.id}`
    setEditLoadingKey(key)
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(item.id_profile)}/products`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      const data = (await res.json().catch(() => ({}))) as { products?: ProfileProduct[]; error?: string }
      const full = data.products?.find((p) => String(p.id_profile_product) === String(item.id))
      if (!res.ok || !full) throw new Error(data.error || t("mgmtEditLoadError", "Erro ao abrir edição"))
      setProductModal({ profileId: item.id_profile, product: full })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("mgmtEditLoadError", "Erro ao abrir edição"))
    } finally {
      setEditLoadingKey(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      let url: string
      if (deleteTarget.kind === "profile") {
        url = `/api/profile/${encodeURIComponent(deleteTarget.id)}`
      } else if (deleteTarget.kind === "service") {
        url = `/api/profile/${encodeURIComponent(deleteTarget.id_profile)}/services/${encodeURIComponent(String(deleteTarget.id))}`
      } else if (deleteTarget.kind === "product") {
        url = `/api/profile/${encodeURIComponent(deleteTarget.id_profile)}/products/${encodeURIComponent(String(deleteTarget.id))}`
      } else {
        url = `/api/me/courses/${encodeURIComponent(deleteTarget.id)}`
      }
      const res = await fetch(url, { method: "DELETE", headers: authHeaders() })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || t("mgmtDeleteError", "Erro ao excluir"))
      }
      if (deleteTarget.kind === "profile") {
        setProfiles((prev) => prev.filter((p) => p.id_profile !== deleteTarget.id))
      } else if (deleteTarget.kind === "service") {
        setOfferings((prev) => ({ ...prev, services: prev.services.filter((s) => String(s.id) !== String(deleteTarget.id)) }))
      } else if (deleteTarget.kind === "product") {
        setOfferings((prev) => ({ ...prev, products: prev.products.filter((p) => String(p.id) !== String(deleteTarget.id)) }))
      } else {
        setOfferings((prev) => ({ ...prev, courses: prev.courses.filter((c) => String(c.id) !== String(deleteTarget.id)) }))
      }
      toast.success(t("mgmtDeleted", "Excluído com sucesso"))
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("mgmtDeleteError", "Erro ao excluir"))
    } finally {
      setIsDeleting(false)
    }
  }

  const sections = useMemo(
    () => [
      {
        key: "profiles",
        icon: Users,
        title: t("mgmtProfilesTitle", "Subperfis"),
        count: profiles.length,
      },
      {
        key: "services",
        icon: Briefcase,
        title: t("mgmtServicesTitle", "Serviços"),
        count: offerings.services.length,
      },
      {
        key: "courses",
        icon: GraduationCap,
        title: t("mgmtCoursesTitle", "Cursos"),
        count: offerings.courses.length,
      },
      {
        key: "products",
        icon: Package,
        title: t("mgmtProductsTitle", "Produtos"),
        count: offerings.products.length,
      },
    ],
    [offerings, profiles.length, t],
  )

  return (
    <div className="fl-root fl-paper-texture min-h-[100dvh] overflow-x-hidden">
      <main className="container mx-auto max-w-4xl px-4 py-10 md:py-12">
        <div className="mb-8">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-[#C9C2B6]/70 transition hover:text-[#F2B705]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("mgmtBackToAccount", "Voltar pra conta")}
          </Link>
          <h1 className="mt-3 fl-display text-4xl text-[#F1EDE2] md:text-5xl">
            {t("mgmtHeading", "Gerenciamento da conta")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#C9C2B6]/80">
            {t("mgmtSubheading", "Tudo que você possui em um lugar só: entre pra editar ou exclua direto da lista.")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sections.map(({ key, icon: Icon, title, count }) => (
              <a
                key={key}
                href={`#mgmt-${key}`}
                className="inline-flex items-center gap-1.5 border-2 border-[#F1EDE2]/20 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F2B705] hover:text-[#F2B705]"
              >
                <Icon className="h-3.5 w-3.5" />
                {title}
                <span className="tabular-nums text-[#F2B705]">{count}</span>
              </a>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 border-2 border-dashed border-red-400/30 p-6 text-center">
            <p className="text-sm font-bold text-red-300">{error}</p>
            <Button variant="outline" onClick={loadAll}>
              {t("mgmtRetry", "Tentar de novo")}
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* SUBPERFIS */}
            <Section
              id="mgmt-profiles"
              icon={<Users className="h-4 w-4" />}
              title={t("mgmtProfilesTitle", "Subperfis")}
              count={profiles.length}
              empty={t("mgmtProfilesEmpty", "Nenhum subperfil ainda.")}
            >
              {profiles.map((profile) => {
                const location = profile.municipio && profile.estado ? `${profile.municipio}, ${profile.estado}` : null
                const sub = [profile.desc_category, location].filter(Boolean).join(" · ")
                return (
                  <Row
                    key={profile.id_profile}
                    image={profile.avatar_url}
                    fallback={getInitials(profile.display_name)}
                    title={profile.display_name || t("unnamedProfile", "Perfil sem nome")}
                    sub={sub || t("mgmtProfileWord", "Subperfil")}
                    badges={[
                      profile.is_paid
                        ? { label: t("mgmtBadgeActive", "Ativo"), tone: "yellow" as const }
                        : { label: t("mgmtBadgeUnpaid", "Não ativado"), tone: "muted" as const },
                    ]}
                    onEdit={() => router.push(`/account/profile/${profile.id_profile}`)}
                    onDelete={() =>
                      setDeleteTarget({ kind: "profile", id: profile.id_profile, name: profile.display_name })
                    }
                  />
                )
              })}
            </Section>

            {/* SERVIÇOS */}
            <Section
              id="mgmt-services"
              icon={<Briefcase className="h-4 w-4" />}
              title={t("mgmtServicesTitle", "Serviços")}
              count={offerings.services.length}
              empty={t("mgmtServicesEmpty", "Nenhum serviço cadastrado.")}
            >
              {offerings.services.map((item) => (
                <Row
                  key={`service-${item.id}`}
                  image={null}
                  fallback={getInitials(item.name)}
                  title={item.name}
                  sub={[item.profile_display_name, formatPrice(item.price_cents)].filter(Boolean).join(" · ")}
                  badges={[
                    item.is_active !== false
                      ? { label: t("mgmtBadgeActive", "Ativo"), tone: "yellow" as const }
                      : { label: t("mgmtBadgeInactive", "Inativo"), tone: "muted" as const },
                  ]}
                  editLoading={editLoadingKey === `service-${item.id}`}
                  onEdit={() => openServiceEdit(item)}
                  onDelete={() =>
                    item.id_profile &&
                    setDeleteTarget({ kind: "service", id: item.id, id_profile: item.id_profile, name: item.name })
                  }
                />
              ))}
            </Section>

            {/* CURSOS */}
            <Section
              id="mgmt-courses"
              icon={<GraduationCap className="h-4 w-4" />}
              title={t("mgmtCoursesTitle", "Cursos")}
              count={offerings.courses.length}
              empty={t("mgmtCoursesEmpty", "Nenhum curso criado.")}
            >
              {offerings.courses.map((item) => (
                <Row
                  key={`course-${item.id}`}
                  image={item.image_url || null}
                  fallback={getInitials(item.name)}
                  title={item.name}
                  sub={[item.profile_display_name, formatPrice(item.price_cents)].filter(Boolean).join(" · ")}
                  badges={[
                    item.published
                      ? { label: t("mgmtBadgePublished", "Publicado"), tone: "yellow" as const }
                      : { label: t("mgmtBadgeDraft", "Rascunho"), tone: "muted" as const },
                  ]}
                  onEdit={() => router.push(`/account/courses/${item.id}`)}
                  onDelete={() => setDeleteTarget({ kind: "course", id: String(item.id), name: item.name })}
                />
              ))}
            </Section>

            {/* PRODUTOS */}
            <Section
              id="mgmt-products"
              icon={<Package className="h-4 w-4" />}
              title={t("mgmtProductsTitle", "Produtos")}
              count={offerings.products.length}
              empty={t("mgmtProductsEmpty", "Nenhum produto à venda.")}
            >
              {offerings.products.map((item) => (
                <Row
                  key={`product-${item.id}`}
                  image={item.image_url || null}
                  fallback={getInitials(item.name)}
                  title={item.name}
                  sub={[item.profile_display_name, formatPrice(item.price_cents)].filter(Boolean).join(" · ")}
                  badges={[
                    item.is_active !== false
                      ? { label: t("mgmtBadgeActive", "Ativo"), tone: "yellow" as const }
                      : { label: t("mgmtBadgeInactive", "Inativo"), tone: "muted" as const },
                  ]}
                  editLoading={editLoadingKey === `product-${item.id}`}
                  onEdit={() => openProductEdit(item)}
                  onDelete={() =>
                    item.id_profile &&
                    setDeleteTarget({ kind: "product", id: item.id, id_profile: item.id_profile, name: item.name })
                  }
                />
              ))}
            </Section>
          </div>
        )}
      </main>

      {/* Confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <DialogContent className="fl-root fl-paper-card border-2 border-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("mgmtDeleteTitle", "Excluir?")}</DialogTitle>
            <DialogDescription>
              {t("mgmtDeleteDesc", "“{name}” será removido. Essa ação não pode ser desfeita por aqui.").replace(
                "{name}",
                deleteTarget?.name || "",
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteTarget?.kind === "profile" && (
            <p className="text-xs font-semibold text-red-700">
              {t("mgmtDeleteProfileWarn", "Excluir um subperfil tira ele da vitrine e leva junto o que está vinculado a ele.")}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
              {t("mgmtCancel", "Cancelar")}
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("mgmtDeleteConfirm", "Excluir definitivamente")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edição in-place de serviço/produto (modais owner existentes) */}
      {serviceModal && (
        <ProfileServiceEditModal
          open
          onClose={() => setServiceModal(null)}
          profileId={serviceModal.profileId}
          service={serviceModal.service}
          onSaved={() => {
            setServiceModal(null)
            loadAll()
          }}
          onError={(message) => toast.error(message)}
        />
      )}
      {productModal && (
        <ProfileProductEditModal
          open
          onClose={() => setProductModal(null)}
          profileId={productModal.profileId}
          product={productModal.product}
          onSaved={() => {
            setProductModal(null)
            loadAll()
          }}
          onError={(message) => toast.error(message)}
        />
      )}
    </div>
  )
}

function Section({
  id,
  icon,
  title,
  count,
  empty,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  count: number
  empty: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center bg-[#F2B705] text-[#0B0B0D]">{icon}</span>
        <h2 className="fl-display text-2xl text-[#F1EDE2] md:text-3xl">{title}</h2>
        <span className="ml-1 text-sm font-extrabold tabular-nums text-[#F2B705]">{count}</span>
      </header>
      {count === 0 ? (
        <div className="border-2 border-dashed border-[#F1EDE2]/15 p-5 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#C9C2B6]/50">
          {empty}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">{children}</div>
      )}
    </section>
  )
}

function Row({
  image,
  fallback,
  title,
  sub,
  badges,
  editLoading,
  onEdit,
  onDelete,
}: {
  image: string | null
  fallback: string
  title: string
  sub: string
  badges: { label: string; tone: "yellow" | "muted" }[]
  editLoading?: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useTranslations("Account")
  return (
    <div className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-2.5 shadow-[4px_4px_0_0_#0B0B0D] md:gap-4 md:px-4">
      <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#F2B705]">{fallback}</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-[#0B0B0D] md:text-base">{title}</h3>
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]",
                badge.tone === "yellow" ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#0B0B0D]/10 text-[#6B6457]",
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
        {sub && <p className="truncate text-[11px] font-semibold text-[#6B6457]">{sub}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          disabled={editLoading}
          className="inline-flex h-9 items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#FBF8F1] px-2.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#0B0B0D] transition hover:-translate-y-0.5 hover:bg-[#F2B705] disabled:opacity-60 md:px-3"
        >
          {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PencilLine className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{t("mgmtEdit", "Editar")}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("mgmtDeleteAria", "Excluir item")}
          className="inline-flex h-9 w-9 items-center justify-center border-2 border-[#0B0B0D] bg-[#FBF8F1] text-[#0B0B0D] transition hover:-translate-y-0.5 hover:bg-red-600 hover:text-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
