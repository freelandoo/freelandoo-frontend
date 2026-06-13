"use client"

import Link from "next/link"
import { Heart, MessageSquare, UserPlus, Mail, ShieldCheck, KeyRound, Package, GraduationCap, CalendarCheck, ClipboardList, PackageSearch, Users, Gift, DollarSign, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

type TFn = (key: string, fallback?: string) => string

export interface NotificationItem {
  id_notification: string
  type: string
  entity_type: string | null
  entity_id: string | null
  id_recipient_profile: string | null
  read_at: string | null
  created_at: string
  payload: Record<string, unknown>
  actor: {
    id_user: string | null
    username: string | null
    id_profile: string | null
    profile_display_name: string | null
    profile_avatar_url: string | null
  } | null
}

interface NotificationListProps {
  items: NotificationItem[]
  onMarkRead?: (id: string) => void
  emptyHint?: string
}

function relativeTime(iso: string, t: TFn) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t("now", "agora")
  if (m < 60) return `${m}${t("minuteSuffix", "min")}`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}${t("hourSuffix", "h")}`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}${t("daySuffix", "d")}`
  return `${Math.floor(d / 7)}${t("weekSuffix", "sem")}`
}

const PERM_KEYS: Record<string, [string, string]> = {
  can_view_feed: ["permViewFeed", "ver o feed"],
  can_post_feed: ["permPostFeed", "postar no feed"],
  can_use_bees: ["permUseBees", "usar Bees"],
  can_watch_courses: ["permWatchCourses", "assistir cursos"],
  can_sell_courses: ["permSellCourses", "vender cursos"],
  can_message: ["permMessage", "enviar mensagens"],
  can_receive_messages: ["permReceiveMessages", "receber mensagens"],
  can_use_global_chat: ["permGlobalChat", "chat global"],
  can_use_machine_chat: ["permMachineChat", "chat de enxames"],
}

function moneySuffix(payload: Record<string, unknown>): string {
  const cents = Number((payload as { amount_cents?: number })?.amount_cents)
  if (!Number.isFinite(cents) || cents <= 0) return ""
  return ` · R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function daysSuffix(base: string, payload: Record<string, unknown>, t: TFn): string {
  const d = Number((payload as { days_left?: number })?.days_left)
  if (!Number.isFinite(d) || d <= 0) return base
  const unit = d === 1 ? t("dayUnit", "dia") : t("daysUnit", "dias")
  return `${base} · ${d} ${unit}`
}

function labelFor(item: NotificationItem, t: TFn) {
  const who = item.actor?.profile_display_name || item.actor?.username || t("someone", "Alguém")
  const sub = (key: string, fallback: string) => t(key, fallback).replace("{who}", who)
  switch (item.type) {
    case "product_sale": return t("productSale", "Você vendeu um produto") + moneySuffix(item.payload)
    case "course_sale": return t("courseSale", "Você vendeu um curso") + moneySuffix(item.payload)
    case "booking_received": return t("bookingReceived", "Novo agendamento recebido") + moneySuffix(item.payload)
    case "service_response_received": {
      const isCourse = (item.payload as { kind?: string })?.kind === "course"
      return isCourse
        ? sub("courseResponseReceived", "{who} respondeu seu pedido de curso")
        : sub("serviceResponseReceived", "{who} respondeu seu chamado")
    }
    case "product_response_new": {
      const seller = (item.payload as { seller_display_name?: string })?.seller_display_name || who
      return t("productResponseNew", "{who} respondeu seu pedido de produto").replace("{who}", seller)
    }
    case "product_request_new":
      return t("productRequestNew", "Novo pedido de produto compatível com você")
    case "clan_invite": {
      const clan = (item.payload as { preview?: string })?.preview
      return clan
        ? sub("clanInviteNamed", "{who} convidou você para o clan {clan}").replace("{clan}", clan)
        : sub("clanInvite", "{who} convidou você para um clan")
    }
    case "clan_member_joined":
      return sub("clanMemberJoined", "{who} entrou no seu clan")
    case "live_gift_received": {
      const giftName = (item.payload as { preview?: string })?.preview
      return giftName
        ? sub("liveGiftNamed", "{who} te enviou {gift} na live").replace("{gift}", giftName)
        : sub("liveGiftReceived", "{who} te enviou um presente na live")
    }
    case "affiliate_commission_released":
      return t("affiliateCommission", "Comissão de afiliado confirmada") + moneySuffix(item.payload)
    case "subscription_expiring":
      return daysSuffix(t("subscriptionExpiring", "Sua assinatura está perto de expirar"), item.payload, t)
    case "premium_expiring":
      return daysSuffix(t("premiumExpiring", "Seu destaque (Premium) está perto de expirar"), item.payload, t)
    case "manifestation_expiring":
      return daysSuffix(t("manifestationExpiring", "Sua Manifestação está perto de expirar"), item.payload, t)
    case "like_received": return sub("likeReceived", "{who} curtiu seu portfólio")
    case "comment_received": return sub("commentReceived", "{who} comentou no seu portfólio")
    case "follow_received": return sub("followReceived", "{who} começou a seguir")
    case "message_received": return sub("messageReceived", "{who} mandou uma mensagem")
    case "supervised_message_received": return sub("supervisedMessageReceived", "Conta supervisionada recebeu uma mensagem de {who}")
    case "parental_permission_request": {
      const key = String((item.payload as { permission_key?: string })?.permission_key || "")
      const permEntry = PERM_KEYS[key]
      const what = permEntry ? t(permEntry[0], permEntry[1]) : (key || t("aPermission", "uma permissão"))
      return sub("permissionRequest", "{who} pediu permissão para {what}").replace("{what}", what)
    }
    default: return who
  }
}

function iconFor(type: string) {
  switch (type) {
    case "like_received": return <Heart className="h-3.5 w-3.5" />
    case "comment_received": return <MessageSquare className="h-3.5 w-3.5" />
    case "follow_received": return <UserPlus className="h-3.5 w-3.5" />
    case "message_received": return <Mail className="h-3.5 w-3.5" />
    case "supervised_message_received": return <ShieldCheck className="h-3.5 w-3.5" />
    case "parental_permission_request": return <KeyRound className="h-3.5 w-3.5" />
    case "product_sale": return <Package className="h-3.5 w-3.5" />
    case "course_sale": return <GraduationCap className="h-3.5 w-3.5" />
    case "booking_received": return <CalendarCheck className="h-3.5 w-3.5" />
    case "service_response_received": return <ClipboardList className="h-3.5 w-3.5" />
    case "product_response_new":
    case "product_request_new": return <PackageSearch className="h-3.5 w-3.5" />
    case "clan_invite":
    case "clan_member_joined": return <Users className="h-3.5 w-3.5" />
    case "live_gift_received": return <Gift className="h-3.5 w-3.5" />
    case "affiliate_commission_released": return <DollarSign className="h-3.5 w-3.5" />
    case "subscription_expiring":
    case "premium_expiring":
    case "manifestation_expiring": return <Clock className="h-3.5 w-3.5" />
    default: return null
  }
}

function hrefFor(item: NotificationItem): string {
  switch (item.type) {
    case "like_received":
    case "comment_received":
      return "/feed"
    case "follow_received":
      return item.actor?.username ? `/account` : "/account"
    case "message_received":
      return "/mensagens"
    case "supervised_message_received": {
      const minorId = (item.payload as { minor_user_id?: string })?.minor_user_id
      return minorId ? `/account/parental/${minorId}/messages` : "/account/parental"
    }
    case "parental_permission_request":
      return "/account/parental"
    case "product_sale":
    case "course_sale":
    case "booking_received":
      return "/pagamentos"
    case "service_response_received":
    case "product_response_new":
      return "/mensagens?tab=os"
    case "product_request_new":
      return "/mensagens?tab=os"
    case "clan_invite":
    case "clan_member_joined":
      return "/account/clans"
    case "live_gift_received":
      return "/account"
    case "affiliate_commission_released":
      return "/account/afiliado"
    case "subscription_expiring":
      return "/pagamentos"
    case "premium_expiring":
      return "/account"
    case "manifestation_expiring":
      return "/manifestacao"
    default:
      return "/account"
  }
}

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

export function NotificationList({ items, onMarkRead, emptyHint }: NotificationListProps) {
  const t = useTranslations("Notifications")
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-[#9A938A]">{emptyHint ?? t("emptyShort", "Sem notificações.")}</div>
    )
  }
  return (
    <ul className="divide-y divide-[#F5F1E8]/[0.08]">
      {items.map((item) => {
        const isUnread = !item.read_at
        const name = item.actor?.profile_display_name || item.actor?.username || t("someone", "Alguém")
        return (
          <li key={item.id_notification}>
            <Link
              href={hrefFor(item)}
              onClick={() => isUnread && onMarkRead?.(item.id_notification)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition hover:bg-[#F5F1E8]/[0.04]",
                isUnread && "bg-[#F2B705]/[0.06]"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 ring-1 ring-[#F5F1E8]/15">
                  {item.actor?.profile_avatar_url && (
                    <AvatarImage src={item.actor.profile_avatar_url} alt={name} />
                  )}
                  <AvatarFallback className="bg-[#2a2212] text-xs font-semibold text-[#F5F1E8]/80">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F2B705] text-[#1A1505] ring-2 ring-[#15120E]">
                  {iconFor(item.type)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-[#F5F1E8]/90">{labelFor(item, t)}</p>
                <p className="mt-0.5 text-[11px] text-[#9A938A]">{relativeTime(item.created_at, t)}</p>
              </div>
              {isUnread && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#F2B705]" aria-hidden />
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
