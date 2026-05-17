export interface MensagensActor {
  id: string
  type: "profile" | "clan"
  display_name: string | null
  avatar_url: string | null
  username: string | null
  sub_profile_slug: string | null
  members_count: number | null
}

export interface ConversationListItem {
  id_conversation: string
  conversation_key: string
  kind?: "direct" | "group"
  name?: string | null
  cover_url?: string | null
  owner_profile_id?: string | null
  member_count?: number | null
  other_entity_id: string
  last_message_at: string | null
  last_message_preview: string | null
  last_message_sender_entity_id: string | null
  is_last_message_from_me: boolean | null
  unread_count: number
  last_read_at: string | null
  created_at: string
  other_entity: MensagensActor | null
}

export interface GroupMember {
  id_profile: string
  role: "owner" | "admin" | "member"
  display_name: string | null
  avatar_url: string | null
  sub_profile_slug: string | null
  username: string | null
  joined_at: string
}

export interface MessageItem {
  id_message: string
  id_conversation: string
  sender_entity_type: string
  sender_entity_id: string
  sender_user_id: string
  body: string
  status: string
  created_at: string
  deleted_at: string | null
}

export interface ConversationDetail {
  id_conversation: string
  unread_count: number
  last_read_at: string | null
  other_entity_id: string
}
