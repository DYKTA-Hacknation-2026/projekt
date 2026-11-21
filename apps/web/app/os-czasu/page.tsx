import type { Metadata } from "next"
import { Baby, CalendarClock, Users } from "lucide-react"

import type { RuleSet } from "@zpr/domain"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { TimelinePlanner } from "@/components/timeline-planner"
import { timeline } from "@/messages/pl"
import { getActiveRuleSet } from "@/server/services/rule-set"

export const metadata: Metadata = { title: "Oś czasu" }
export const dynamic = "force-dynamic"

export default async function TimelinePage() {
  let ruleSet: RuleSet
  try {
    ruleSet = await getActiveRuleSet()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Planer"
          title={timeline.title}
          lead={timeline.lead}
        />
        <DbOffline error={error} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Planer"
        title={timeline.title}
        lead={timeline.lead}
      />

      <Alert variant="info">
        <CalendarClock aria-hidden="true" />
        <AlertTitle>Wersja demonstracyjna planera</AlertTitle>
        <AlertDescription>
          Dni są liczone kalendarzowo. Rzeczywiste terminy zależą od daty
          porodu, decyzji pracodawcy i dokumentów. Plan nie zastępuje wniosku
          ani decyzji ZUS.
        </AlertDescription>
      </Alert>

      <TimelinePlanner ruleSet={ruleSet} />

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users aria-hidden="true" className="size-4 text-primary" />
              Dla obojga rodziców
            </CardTitle>
            <CardDescription>
              Plan pokazuje osobno część mamy, część taty i terminy wspólne.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Baby aria-hidden="true" className="size-4 text-primary" />
              Warianty rodzinne
            </CardTitle>
            <CardDescription>
              Zmień liczbę dzieci i „Za życiem”, aby zobaczyć{" "}
              {Object.entries(ruleSet.maternity.weeksByChildren)
                .sort(([a], [b]) => Number(a) - Number(b))
                .slice(1)
                .map(([, weeks]) => weeks)
                .join("/")}{" "}
              tygodni macierzyńskiego oraz {ruleSet.parental.poolWeeks.multiple}
              /{ruleSet.parental.poolWeeks.zaZyciemMultiple} tygodni
              rodzicielskiego.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  )
}
