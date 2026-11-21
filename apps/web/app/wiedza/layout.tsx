import type { Metadata } from "next"

import { KnowledgeSubnav } from "@/components/knowledge/knowledge-subnav"

export const metadata: Metadata = {
  title: "Centrum wiedzy",
  description:
    "Proste wyjaśnienia świadczeń, praw rodziców, ubezpieczeń i formalności ZUS. Artykuły, FAQ, dokumenty, przewodniki i słownik.",
}

export default function KnowledgeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="pb-16">
      <KnowledgeSubnav />
      {children}
    </div>
  )
}
