"use server"

import { revalidatePath } from "next/cache"

import type { ContentItemType, ContentStatus } from "@zpr/contracts/content"

import { getAdminSession } from "@/server/auth/admin-session"
import { setContentStatus } from "@/server/services/knowledge-center"

const TYPES: ContentItemType[] = [
  "ARTICLE",
  "FAQ",
  "DOCUMENT",
  "GUIDE",
  "GLOSSARY",
]
const STATUSES: ContentStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
]

export async function setContentStatusAction(formData: FormData) {
  const session = await getAdminSession()
  if (!session.authenticated && session.gateEnabled) {
    throw new Error("Brak uprawnień administratora.")
  }

  const type = String(formData.get("type") ?? "") as ContentItemType
  const slug = String(formData.get("slug") ?? "").trim()
  const status = String(formData.get("status") ?? "") as ContentStatus

  if (!TYPES.includes(type) || !STATUSES.includes(status) || !slug) {
    throw new Error("Nieprawidłowe dane akcji.")
  }

  await setContentStatus(type, slug, status)

  revalidatePath("/admin/wiedza")
  revalidatePath("/wiedza")
  revalidatePath("/wiedza/faq")
  revalidatePath("/wiedza/artykuly")
  revalidatePath("/wiedza/dokumenty")
  revalidatePath("/wiedza/przewodniki")
  revalidatePath("/wiedza/slownik")
  revalidatePath("/wiedza/szukaj")
}
