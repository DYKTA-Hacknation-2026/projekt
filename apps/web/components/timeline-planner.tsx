"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Printer,
  Users,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select } from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDate } from "@/lib/format"
import {
  buildTimeline,
  type TimelineCategory,
  type TimelineOwner,
} from "@/lib/timeline"
import type { RuleSet } from "@zpr/domain"

const ownerLabel: Record<TimelineOwner, string> = {
  MAMA: "Mama",
  TATA: "Tata",
  OBOJE: "Oboje",
}

const categoryLabel: Record<TimelineCategory, string> = {
  LEAVE: "Urlop",
  BENEFIT: "Zasiłek",
  DOCUMENT: "Dokument",
  DEADLINE: "Termin",
}

const categoryVariant: Record<
  TimelineCategory,
  "default" | "secondary" | "outline" | "success" | "warning" | "info"
> = {
  LEAVE: "default",
  BENEFIT: "success",
  DOCUMENT: "info",
  DEADLINE: "warning",
}

export function TimelinePlanner({ ruleSet }: { ruleSet: RuleSet }) {
  const [dueDate, setDueDate] = useState("2027-03-10")
  const [preBirthWeeks, setPreBirthWeeks] = useState(
    String(Math.min(2, ruleSet.maternity.maxPreBirthWeeks))
  )
  const [children, setChildren] = useState("1")
  const [secondParent, setSecondParent] = useState(
    String(ruleSet.parental.nonTransferableWeeks)
  )
  const [paternity, setPaternity] = useState(String(ruleSet.paternity.days))
  const [zaZyciem, setZaZyciem] = useState(false)

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  const childCounts = Object.keys(ruleSet.maternity.weeksByChildren)
    .map(Number)
    .sort((a, b) => a - b)
  const preBirthOptions = Array.from(
    { length: ruleSet.maternity.maxPreBirthWeeks + 1 },
    (_, index) => index
  )
  const secondParentOptions = Array.from(
    { length: ruleSet.parental.nonTransferableWeeks + 1 },
    (_, index) => index
  )
  const paternityOptions = Array.from(
    new Set([0, ruleSet.paternity.minPartDays, ruleSet.paternity.days])
  )
    .filter((days) => days >= 0 && days <= ruleSet.paternity.days)
    .sort((a, b) => a - b)

  const plan = useMemo(() => {
    if (!validDate) return null
    try {
      return buildTimeline(
        {
          dueDate,
          maternityWeeksBeforeBirth: Number(preBirthWeeks),
          childrenCount: Number(children),
          secondParentParentalWeeks: Number(secondParent),
          paternityDays: Number(paternity),
          hasZaZyciem: zaZyciem,
        },
        ruleSet
      )
    } catch {
      return null
    }
  }, [
    validDate,
    dueDate,
    preBirthWeeks,
    children,
    secondParent,
    paternity,
    zaZyciem,
    ruleSet,
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-4 text-primary" />
            Parametry planu
          </CardTitle>
          <CardDescription>
            Oś czasu przelicza się od razu. Możesz też wpisać datę ręcznie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="due-date">Przewidywany termin porodu</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                aria-invalid={!validDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-pre">Tyg. przed porodem</Label>
              <Select
                id="plan-pre"
                value={preBirthWeeks}
                onChange={(event) => setPreBirthWeeks(event.target.value)}
              >
                {preBirthOptions.map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-children">Dzieci</Label>
              <Select
                id="plan-children"
                value={children}
                onChange={(event) => setChildren(event.target.value)}
              >
                {childCounts.map((count) => (
                  <option key={count} value={count}>
                    {count === ruleSet.maternity.maxChildren
                      ? `${count}+`
                      : count}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-second">Tydzień taty</Label>
              <Select
                id="plan-second"
                value={secondParent}
                onChange={(event) => setSecondParent(event.target.value)}
              >
                {secondParentOptions.map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-paternity">Dni ojcowskiego</Label>
              <Select
                id="plan-paternity"
                value={paternity}
                onChange={(event) => setPaternity(event.target.value)}
              >
                {paternityOptions.map((days) => (
                  <option key={days} value={days}>
                    {days}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm lg:col-span-6">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={zaZyciem}
                onChange={(event) => setZaZyciem(event.target.checked)}
              />
              Zaświadczenie „Za życiem” (65/67 tygodni rodzicielskiego)
            </label>
          </div>
        </CardContent>
      </Card>

      {!plan ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="size-4" />
            Podaj poprawną datę porodu, aby zobaczyć plan.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              label="Macierzyński"
              value={`${plan.maternityWeeks} tyg.`}
              hint={`${plan.postBirthWeeks} tyg. po porodzie`}
            />
            <SummaryTile
              label="Rodzicielski mamy"
              value={`${plan.motherParentalWeeks} tyg.`}
              hint={`pula ${plan.parentalPoolWeeks} tyg.`}
            />
            <SummaryTile
              label="Dla taty"
              value={`${plan.secondParentWeeks} tyg.`}
              hint="część niezbywalna"
            />
            <SummaryTile
              label="Ojcowski"
              value={`${plan.input.paternityDays} dni`}
              hint="do 12. miesiąca życia"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>Plan krok po kroku</CardTitle>
                    <CardDescription>
                      Terminy liczone od {formatDate(dueDate)}.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    <Printer aria-hidden="true" />
                    Drukuj
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-0">
                  {plan.milestones.map((milestone, index) => (
                    <li key={milestone.id} className="relative flex gap-4 pb-6">
                      {index < plan.milestones.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute top-6 left-[0.6875rem] h-full w-px bg-border"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="relative mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2 border-primary bg-background"
                      >
                        <span className="size-2 rounded-full bg-primary" />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-medium text-muted-foreground tabular-nums">
                            {formatDate(milestone.date)}
                            {milestone.endDate
                              ? ` – ${formatDate(milestone.endDate)}`
                              : ""}
                          </p>
                          <Badge variant="outline" className="text-[10px]">
                            {ownerLabel[milestone.owner]}
                          </Badge>
                          <Badge
                            variant={categoryVariant[milestone.category]}
                            className="text-[10px]"
                          >
                            {categoryLabel[milestone.category]}
                          </Badge>
                        </div>
                        <h3 className="text-sm font-semibold">
                          {milestone.title}
                        </h3>
                        <p className="text-xs text-pretty text-muted-foreground">
                          {milestone.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {milestone.legalReference}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users aria-hidden="true" className="size-4 text-primary" />
                    Jak czytać ten plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-pretty text-muted-foreground">
                  <p>
                    Daty są orientacyjne. Urlop zaczyna się w dniu porodu, chyba
                    że mama wykorzystała część przed terminem.
                  </p>
                  <p>
                    Dziewięć tygodni drugiego rodzica nie przechodzi na mamę.
                    Można je wykorzystać później, także w innym roku.
                  </p>
                  <p>Wniosek o 81,5% trzeba złożyć w ciągu 21 dni od porodu.</p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock aria-hidden="true" className="size-4 text-primary" />
                    Chcesz kwoty?
                  </CardTitle>
                  <CardDescription>
                    Ten sam scenariusz możesz policzyć z podstawą wymiaru.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/kalkulator">
                      Otwórz kalkulator
                      <CheckCircle2 data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText aria-hidden="true" className="size-4 text-primary" />
                Wersja tabelaryczna
              </CardTitle>
              <CardDescription>
                Równoważna treść dla czytników ekranu i wydruku.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Data</TableHead>
                    <TableHead>Wydarzenie</TableHead>
                    <TableHead>Osoba</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="pr-4">Podstawa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="pl-4 whitespace-nowrap">
                        {formatDate(milestone.date)}
                        {milestone.endDate
                          ? ` – ${formatDate(milestone.endDate)}`
                          : ""}
                      </TableCell>
                      <TableCell className="max-w-[18rem] whitespace-normal">
                        {milestone.title}
                      </TableCell>
                      <TableCell>{ownerLabel[milestone.owner]}</TableCell>
                      <TableCell>{categoryLabel[milestone.category]}</TableCell>
                      <TableCell className="pr-4 text-muted-foreground">
                        {milestone.legalReference}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
