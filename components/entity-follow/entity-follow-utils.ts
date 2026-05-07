import { buildProfileUrl } from "@/lib/slug"
import type { EntityFollowType, FollowEntity } from "@/lib/types/entity-follow"

export function entityTypeLabel(type: EntityFollowType) {
  return type === "clan" ? "Clan" : "Perfil"
}

export function entityInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

export function entityMeta(entity: FollowEntity) {
  if (entity.type === "clan") {
    const parts = [
      entity.machine_name,
      entity.members_count
        ? `${entity.members_count} membro${entity.members_count === 1 ? "" : "s"}`
        : null,
      [entity.municipio, entity.estado].filter(Boolean).join(", ") || null,
    ].filter(Boolean)
    return parts.join(" · ")
  }

  return [
    entity.profession_name,
    [entity.municipio, entity.estado].filter(Boolean).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function entityHref(entity: FollowEntity) {
  if (entity.type === "clan") return `/clans/${entity.id}`
  if (entity.username && entity.profession_slug) {
    return buildProfileUrl({
      profession_slug: entity.profession_slug,
      municipio: entity.municipio || null,
      handle: entity.username,
      sub_profile_slug: entity.sub_profile_slug || null,
    })
  }
  return `/freelancer/${entity.id}`
}
