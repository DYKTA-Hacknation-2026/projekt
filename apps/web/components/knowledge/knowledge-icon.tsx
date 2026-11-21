import {
  BookMarked,
  BookOpen,
  CalendarHeart,
  FileText,
  HandCoins,
  HeartPulse,
  HousePlus,
  LifeBuoy,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  BookMarked,
  BookOpen,
  CalendarHeart,
  FileText,
  HandCoins,
  HeartPulse,
  HousePlus,
  LifeBuoy,
  ListChecks,
  ShieldCheck,
}

export function KnowledgeIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? BookOpen
  return <Icon aria-hidden="true" className={className} />
}
