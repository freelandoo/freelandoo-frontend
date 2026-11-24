"use client"

// A página da comunidade é só a PORTA: quem desenha é `CommunityDetail`
// (community-detail.tsx), que também mora dentro das abas de Minha cidade.
import { useParams } from "next/navigation"
import { CommunityDetail } from "./community-detail"

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  return <CommunityDetail id={params.id} />
}
