import type { Metadata } from "next"
import { Baby, CalendarClock, Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { PageHeader } from "@/components/page-header"
import { TimelinePlanner } from "@/components/timeline-planner"
import { timeline } from "@/messages/pl"

export const metadata: Metadata = { title: "Oś czasu" }

export default function TimelinePage() {
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
          Dni są liczone kalendarzowo. Rzeczywiste terminy zależą od daty porodu,
          decyzji pracodawcy i dokumentów. Plan nie zastępuje wniosku ani decyzji
          ZUS.
        </AlertDescription>
      </Alert>

      <TimelinePlanner />

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
              Zmień liczbę dzieci i „Za życiem”, aby zobaczyć 31/33/35/37 tygodni
              macierzyńskiego oraz 43/67 tygodni rodzicielskiego.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </div>
  )
}
