"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Baby,
  CalendarHeart,
  Calculator,
  Clock,
  FileText,
  FilterX,
  Info,
  ListChecks,
  Pencil,
  Printer,
  Users,
} from "lucide-react"

import type { RuleSet } from "@zpr/domain"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
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
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { PageHeader } from "@/components/page-header"
import { formatDate } from "@/lib/format"
import { buildTimeline } from "@/lib/timeline"
import type {
  TimelineMilestone,
  TimelinePlan,
} from "@/lib/timeline"
import { DEMO_DUE_DATE, type TimelineSeed } from "@/lib/plan-seed"
import { readCaseProfile } from "@/lib/situation-profile"
import {
  buildTimelineView,
  daysUntilLabel,
  findNearestDate,
  findNextTask,
  getCurrentStage,
  ownerFilters,
  typeFilters,
  type PlanOwnerFilter,
  type PlanTypeFilter,
} from "@/lib/timeline-view"
import { TimelineChart, TimelineLegend } from "@/components/plan/timeline-chart"
import {
  TimelineDetails,
  type SelectedTimelineItem,
} from "@/components/plan/timeline-details"
import { TimelineStages } from "@/components/plan/timeline-stages"
import { TimelineGuide } from "@/components/plan/timeline-guide"
import {
  basisLabel,
  categoryLabel,
  ownerLabel,
} from "@/components/plan/plan-ui"
import { timeline as copy } from "@/messages/pl"

type ViewMode = "timeline" | "table"
type DataOrigin = "DEMO" | "IMPORT" | "PROFILE" | "EDITED"

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tracking-tight text-balance">
        {value}
      </dd>
      {hint && <dd className="text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none",
        active
          ? "border-primary/40 bg-primary/12 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function TaskCard({
  task,
  demo,
  onShowDetails,
}: {
  task: ReturnType<typeof findNextTask>
  demo: boolean
  onShowDetails: (milestone: TimelineMilestone) => void
}) {  if (!task.next) {
    return (
      <div className="mt-5 flex items-start gap-3 rounded-lg border border-dashed border-border bg-background/60 p-4">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-semibold">Brak nadchodzących formalności</p>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            {task.overdue
              ? "Ostatnie zaplanowane formalności już minęły. Sprawdź szczegóły w widoku tabelarycznym albo zaktualizuj datę porodu."
              : "W tym planie nie ma teraz zadania z konkretnym terminem. Kolejne kroki pojawią się po zmianie założeń."}
          </p>
        </div>
      </div>
    )
  }

  const milestone = task.next.milestone
  return (
    <div className="mt-5 rounded-lg border border-primary/25 bg-background/75 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
          <ListChecks aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Najbliższe zadanie
          </p>
          <p className="mt-1 text-base font-semibold text-balance">
            {milestone.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(task.next.date)} · {daysUntilLabel(task.next.daysUntil)}
            {milestone.actionOwner ? ` · ${milestone.actionOwner}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge
              variant={
                milestone.basis === "STATUTORY"
                  ? "warning"
                  : milestone.basis === "RECOMMENDED"
                    ? "info"
                    : "secondary"
              }
            >
              {basisLabel[milestone.basis ?? "STATUTORY"]}
            </Badge>
            {milestone.estimated && (
              <Badge variant="outline">
                <Clock aria-hidden="true" />
                Data orientacyjna
              </Badge>
            )}
            {milestone.needsVerification && (
              <Badge variant="warning">
                <AlertTriangle aria-hidden="true" />
                Wymaga weryfikacji
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-pretty">{milestone.description}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Pełną listę dokumentów i podstawę prawną znajdziesz w szczegółach.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onShowDetails(milestone)}>
              Zobacz szczegóły
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dokumenty">
                <FileText data-icon="inline-start" aria-hidden="true" />
                Dokumenty
              </Link>
            </Button>
          </div>
          {demo && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Przykład na podstawie scenariusza demonstracyjnego.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function AssumptionsPanel({
  ruleSet,
  dueDate,
  setDueDate,
  knowsBirthDate,
  setKnowsBirthDate,
  birthDate,
  setBirthDate,
  preBirthWeeks,
  setPreBirthWeeks,
  children,
  setChildren,
  secondParent,
  setSecondParent,
  paternity,
  setPaternity,
  zaZyciem,
  setZaZyciem,
  invalidDueDate,
  employmentMismatch,
  onHide,
  onDemo,
  panelRef,
}: {
  ruleSet: RuleSet
  dueDate: string
  setDueDate: (value: string) => void
  knowsBirthDate: boolean
  setKnowsBirthDate: (value: boolean) => void
  birthDate: string
  setBirthDate: (value: string) => void
  preBirthWeeks: string
  setPreBirthWeeks: (value: string) => void
  children: string
  setChildren: (value: string) => void
  secondParent: string
  setSecondParent: (value: string) => void
  paternity: string
  setPaternity: (value: string) => void
  zaZyciem: boolean
  setZaZyciem: (value: boolean) => void
  invalidDueDate: boolean
  employmentMismatch: boolean
  onHide: () => void
  onDemo: () => void
  panelRef: React.RefObject<HTMLDivElement | null>
}) {
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

  return (
    <Card id="zalozenia" ref={panelRef} tabIndex={-1} className="scroll-mt-24 outline-none">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Pencil aria-hidden="true" className="size-4 text-primary" />
              Założenia planu
            </CardTitle>
            <CardDescription>
              Plan przelicza się od razu. Nie zapisujemy Twoich danych w tym
              widoku — możesz w każdej chwili wrócić do przykładu.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onDemo}>
              Wczytaj przykład
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onHide}>
              Ukryj założenia
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="due-date">Przewidywany termin porodu</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-invalid={invalidDueDate}
              aria-describedby={invalidDueDate ? "due-date-error" : undefined}
            />
            {invalidDueDate && (
              <p id="due-date-error" className="text-xs text-destructive">
                Podaj poprawną datę w formacie dzień-miesiąc-rok.
              </p>
            )}
            {!invalidDueDate && knowsBirthDate && !dueDate && (
              <p className="text-xs text-muted-foreground">
                Plan używa rzeczywistej daty porodu podanej poniżej.
              </p>
            )}
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="plan-pre">Tygodnie urlopu przed porodem</Label>
            <Select
              id="plan-pre"
              value={preBirthWeeks}
              onChange={(event) => setPreBirthWeeks(event.target.value)}
              disabled={knowsBirthDate}
            >
              {preBirthOptions.map((weeks) => (
                <option key={weeks} value={weeks}>
                  {weeks}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {knowsBirthDate
                ? "Przy rzeczywistej dacie porodu urlop przed porodem nie jest już planowany."
                : `Maksymalnie ${ruleSet.maternity.maxPreBirthWeeks} tygodni (KP art. 180 § 2).`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-children">Liczba dzieci z porodu</Label>
            <Select
              id="plan-children"
              value={children}
              onChange={(event) => setChildren(event.target.value)}
            >
              {childCounts.map((count) => (
                <option key={count} value={count}>
                  {count === ruleSet.maternity.maxChildren ? `${count}+` : count}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-second">Tygodnie rodzicielskiego dla taty</Label>
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
            <p className="text-xs text-muted-foreground">
              Część zarezerwowana dla drugiego rodzica.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-paternity">Dni urlopu ojcowskiego</Label>
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
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Rzeczywista data porodu</p>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                id="plan-birth-known"
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={knowsBirthDate}
                onChange={(event) => setKnowsBirthDate(event.target.checked)}
              />
              Dziecko już się urodziło
            </label>
            {knowsBirthDate && (
              <Input
                aria-label="Rzeczywista data porodu"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            )}
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={zaZyciem}
            onChange={(event) => setZaZyciem(event.target.checked)}
          />
          <span>
            Zaświadczenie „Za życiem”
            <span className="block text-xs text-muted-foreground">
              Wydłuża urlop rodzicielski do{" "}
              {ruleSet.parental.poolWeeks.zaZyciemSingle}/
              {ruleSet.parental.poolWeeks.zaZyciemMultiple} tygodni.
            </span>
          </span>
        </label>

        {employmentMismatch && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Plan dla umowy o pracę</AlertTitle>
            <AlertDescription>
              Dane z pobrania wskazują inny tytuł zatrudnienia niż umowa o
              pracę. Ten plan pokazuje wariant dla dwojga pracowników — sprawdź
              swoje uprawnienia w kalkulatorze.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineTable({
  plan,
  view,
  selectedId,
  onSelect,
}: {
  plan: TimelinePlan
  view: ReturnType<typeof buildTimelineView>
  selectedId: string | null
  onSelect: (item: SelectedTimelineItem) => void
}) {
  const rows = [
    ...view.periods.map((period) => ({
      id: period.id,
      date: period.start,
      dateLabel: `${formatDate(period.start)} – ${formatDate(period.end)}`,
      title: period.title,
      owner: ownerLabel[period.owner],
      type: categoryLabel[period.category],
      confidence: [
        "Wynika z planu",
        period.estimated ? "orientacyjna" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      legal: period.legalReference,
      onSelect: () => onSelect({ kind: "period", period }),
    })),
    ...view.milestones.map((milestone) => ({
      id: milestone.id,
      date: milestone.date,
      dateLabel: milestone.endDate
        ? `${formatDate(milestone.date)} – ${formatDate(milestone.endDate)}`
        : formatDate(milestone.date),
      title: milestone.title,
      owner: ownerLabel[milestone.owner],
      type: categoryLabel[milestone.category],
      confidence: [
        basisLabel[milestone.basis ?? "STATUTORY"],
        milestone.estimated ? "orientacyjna" : null,
        milestone.needsVerification ? "wymaga weryfikacji" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      legal: milestone.legalReference,
      onSelect: () => onSelect({ kind: "milestone", milestone }),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText aria-hidden="true" className="size-4 text-primary" />
              Widok tabelaryczny
            </CardTitle>
            <CardDescription>
              Dokładne daty, wszystkie okresy i formalności. Przydatny do
              wydruku i szybkiego porównania terminów.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer aria-hidden="true" />
            Drukuj plan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            Brak wydarzeń spełniających wybrane filtry.
          </p>
        ) : (
          <Table>
            <TableCaption>
              Plan wyliczony dla {plan.input.childrenCount}{" "}
              {plan.input.childrenCount === 1 ? "dziecka" : "dzieci"} na
              podstawie reguł {plan.ruleSetVersion}.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Data lub okres</TableHead>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Osoba</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Pewność</TableHead>
                <TableHead className="pr-4">Podstawa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedId === row.id ? "selected" : undefined}
                >
                  <TableCell className="pl-4 align-top text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {row.dateLabel}
                  </TableCell>
                  <TableCell className="max-w-[18rem] align-top whitespace-normal">
                    <button
                      type="button"
                      onClick={row.onSelect}
                      className="text-left font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                    >
                      {row.title}
                    </button>
                  </TableCell>
                  <TableCell className="align-top">{row.owner}</TableCell>
                  <TableCell className="align-top">{row.type}</TableCell>
                  <TableCell className="align-top text-xs text-muted-foreground">
                    {row.confidence}
                  </TableCell>
                  <TableCell className="max-w-[20rem] pr-4 align-top text-xs whitespace-normal text-muted-foreground">
                    {row.legal}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function TimelinePlanner({
  ruleSet,
  today,
  initial,
}: {
  ruleSet: RuleSet
  today: string
  initial?: TimelineSeed
}) {
  const initialDueDate =
    initial?.dueDate ?? (initial?.demo ? DEMO_DUE_DATE : "")
  const [dueDate, setDueDateState] = useState(initialDueDate)
  const [knowsBirthDate, setKnowsBirthDateState] = useState(
    Boolean(initial?.birthDate)
  )
  const [birthDate, setBirthDateState] = useState(initial?.birthDate ?? "")
  const [preBirthWeeks, setPreBirthWeeksState] = useState(
    String(Math.min(2, ruleSet.maternity.maxPreBirthWeeks))
  )
  const [children, setChildrenState] = useState(
    String(initial?.childrenCount ?? 1)
  )
  const [secondParent, setSecondParentState] = useState(
    String(ruleSet.parental.nonTransferableWeeks)
  )
  const [paternity, setPaternityState] = useState(String(ruleSet.paternity.days))
  const [zaZyciem, setZaZyciemState] = useState(initial?.hasZaZyciem ?? false)
  const [origin, setOrigin] = useState<DataOrigin>(
    initial && !initial.demo ? "IMPORT" : "DEMO"
  )
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState<PlanOwnerFilter>("ALL")
  const [typeFilter, setTypeFilter] = useState<PlanTypeFilter>("ALL")
  const [viewMode, setViewMode] = useState<ViewMode>("timeline")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)

  // The planner follows the situation analysed in `/start`, so moving from the
  // results to the timeline does not ask for the same dates again.
  useEffect(() => {
    const profile = readCaseProfile(window.sessionStorage)
    if (!profile) return
    const event = profile.request.event
    const due = event.expectedDueDate ?? event.birthDate
    if (due) {
      setDueDateState(due)
    } else {
      setDueDateState("")
    }
    if (event.birthDate) {
      setBirthDateState(event.birthDate)
      setKnowsBirthDateState(true)
    } else {
      setBirthDateState("")
      setKnowsBirthDateState(false)
    }
    if (event.childrenCount !== undefined) {
      setChildrenState(String(event.childrenCount))
    }
    if (event.zaZyciem !== undefined) setZaZyciemState(event.zaZyciem)
    const preBirth = profile.request.plan?.maternityWeeksBeforeBirth
    if (preBirth !== undefined) setPreBirthWeeksState(String(preBirth))
    setOrigin("PROFILE")
  }, [])

  const validDueDate = isIsoDate(dueDate)
  const actualBirthDate =
    knowsBirthDate && isIsoDate(birthDate) ? birthDate : undefined
  const anchorDate = actualBirthDate ?? (validDueDate ? dueDate : "")

  const plan = useMemo(() => {
    if (!isIsoDate(anchorDate)) return null
    try {
      return buildTimeline(
        {
          dueDate: validDueDate ? dueDate : anchorDate,
          birthDate: actualBirthDate,
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
    anchorDate,
    validDueDate,
    dueDate,
    actualBirthDate,
    preBirthWeeks,
    children,
    secondParent,
    paternity,
    zaZyciem,
    ruleSet,
  ])

  const filteredView = useMemo(
    () =>
      plan ? buildTimelineView(plan, ownerFilter, typeFilter, today) : null,
    [plan, ownerFilter, typeFilter, today]
  )
  const nextTask = useMemo(
    () => (plan ? findNextTask(plan, today) : { next: null, overdue: null }),
    [plan, today]
  )
  const nearest = useMemo(
    () => (plan ? findNearestDate(plan, today) : null),
    [plan, today]
  )
  const currentStage = useMemo(
    () => (plan ? getCurrentStage(plan, today) : null),
    [plan, today]
  )
  const selected = useMemo<SelectedTimelineItem | null>(() => {
    if (!plan || !selectedId) return null
    const period = plan.periods.find((item) => item.id === selectedId)
    if (period) return { kind: "period", period }
    const milestone = plan.milestones.find((item) => item.id === selectedId)
    if (milestone) return { kind: "milestone", milestone }
    return null
  }, [plan, selectedId])

  useEffect(() => {
    if (showAssumptions) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      panelRef.current?.focus({ preventScroll: true })
    }
  }, [showAssumptions])

  useEffect(() => {
    if (!selectedId) return
    if (!window.matchMedia("(max-width: 1279px)").matches) return
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedId])

  const edited = () => setOrigin("EDITED")
  const setDueDate = (value: string) => {
    edited()
    setDueDateState(value)
  }
  const setKnowsBirthDate = (value: boolean) => {
    edited()
    setKnowsBirthDateState(value)
    if (!value) setBirthDateState("")
  }
  const setBirthDate = (value: string) => {
    edited()
    setBirthDateState(value)
  }
  const setPreBirthWeeks = (value: string) => {
    edited()
    setPreBirthWeeksState(value)
  }
  const setChildren = (value: string) => {
    edited()
    setChildrenState(value)
  }
  const setSecondParent = (value: string) => {
    edited()
    setSecondParentState(value)
  }
  const setPaternity = (value: string) => {
    edited()
    setPaternityState(value)
  }
  const setZaZyciem = (value: boolean) => {
    edited()
    setZaZyciemState(value)
  }

  const showDetails = (item: SelectedTimelineItem) => {
    setSelectedId(item.kind === "period" ? item.period.id : item.milestone.id)
    setViewMode("timeline")
  }

  const loadDemo = () => {
    setDueDateState(DEMO_DUE_DATE)
    setKnowsBirthDateState(false)
    setBirthDateState("")
    setPreBirthWeeksState(String(Math.min(2, ruleSet.maternity.maxPreBirthWeeks)))
    setChildrenState("1")
    setSecondParentState(String(ruleSet.parental.nonTransferableWeeks))
    setPaternityState(String(ruleSet.paternity.days))
    setZaZyciemState(false)
    setOrigin("DEMO")
    setSelectedId(null)
    setOwnerFilter("ALL")
    setTypeFilter("ALL")
  }

  const resetFilters = () => {
    setOwnerFilter("ALL")
    setTypeFilter("ALL")
  }

  const originNote =
    origin === "DEMO"
      ? "Przykładowy scenariusz demonstracyjny — pokazuje, jak działa plan. Zmień założenia, aby zobaczyć własną sytuację."
      : origin === "PROFILE"
        ? "Dane wstępne z Twojej sprawy w kreatorze sytuacji. Możesz je poprawić — każda zmiana przelicza daty."
        : origin === "IMPORT"
          ? `Dane wstępne z ostatniego pobrania danych${initial?.scenarioLabel ? `: ${initial.scenarioLabel}` : ""}. Możesz je poprawić.`
          : "Plan na podstawie Twoich założeń. Każda zmiana przelicza daty od razu."

  const employmentMismatch =
    origin !== "DEMO" &&
    Boolean(initial?.employmentType && initial.employmentType !== "EMPLOYMENT")
  const contextMismatch =
    origin !== "DEMO" &&
    Boolean(
      initial?.eventType &&
        initial.eventType !== "PREGNANCY" &&
        initial.eventType !== "BIRTH"
    )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Planer"
        title={copy.title}
        lead={copy.lead}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/kalkulator">
                <Calculator data-icon="inline-start" aria-hidden="true" />
                Policz kwoty
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAssumptions((value) => !value)}
              aria-expanded={showAssumptions}
              aria-controls={showAssumptions ? "zalozenia" : undefined}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Edytuj założenia
            </Button>
          </>
        }
      />

      {contextMismatch && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Ten plan dotyczy ciąży i porodu</AlertTitle>
          <AlertDescription>
            Wasze dane dotyczą adopcji lub rodziny zastępczej. Część terminów i
            uprawnień wygląda inaczej — sprawdź je w kalkulatorze i w sekcji
            dokumentów.
          </AlertDescription>
        </Alert>
      )}

      {showAssumptions && (
        <AssumptionsPanel
          ruleSet={ruleSet}
          dueDate={dueDate}
          setDueDate={setDueDate}
          knowsBirthDate={knowsBirthDate}
          setKnowsBirthDate={setKnowsBirthDate}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          preBirthWeeks={preBirthWeeks}
          setPreBirthWeeks={setPreBirthWeeks}
          children={children}
          setChildren={setChildren}
          secondParent={secondParent}
          setSecondParent={setSecondParent}
          paternity={paternity}
          setPaternity={setPaternity}
          zaZyciem={zaZyciem}
          setZaZyciem={setZaZyciem}
          invalidDueDate={!validDueDate && !actualBirthDate}
          employmentMismatch={employmentMismatch}
          onHide={() => setShowAssumptions(false)}
          onDemo={loadDemo}
          panelRef={panelRef}
        />
      )}

      {!plan || !filteredView ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-8 text-sm">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Uzupełnij termin porodu</p>
              <p className="mt-0.5 text-muted-foreground">
                Podaj poprawną datę porodu w założeniach, aby zobaczyć plan.
                Nie podstawiamy daty za Ciebie.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowAssumptions(true)}
              >
                Otwórz założenia
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <section
            aria-labelledby="podsumowanie-planu"
            className="rounded-lg border border-primary/20 bg-primary/[0.035] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant={origin === "DEMO" ? "warning" : "success"}>
                  {origin === "DEMO"
                    ? "Scenariusz demonstracyjny"
                    : "Plan na Twoich danych"}
                </Badge>
                <h2
                  id="podsumowanie-planu"
                  className="mt-2 text-xl font-semibold tracking-tight"
                >
                  Wasz plan w skrócie
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
                  {originNote}
                </p>
              </div>
              <CalendarHeart
                aria-hidden="true"
                className="hidden size-10 text-primary/70 sm:block"
              />
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryStat
                label={
                  plan.anchor.kind === "BIRTH"
                    ? "Data porodu"
                    : "Przewidywany poród"
                }
                value={formatDate(plan.anchor.date)}
                hint={
                  plan.anchor.estimated
                    ? "data orientacyjna"
                    : "data rzeczywista"
                }
              />
              <SummaryStat
                label="Liczba dzieci"
                value={String(plan.input.childrenCount)}
                hint={
                  plan.input.childrenCount > 1
                    ? "wymiar urlopu dla ciąży mnogiej"
                    : "jedno dziecko"
                }
              />
              <SummaryStat
                label="Aktualny etap"
                value={currentStage?.title ?? "Nieustalony"}
                hint={currentStage ? `etap ${currentStage.number} z ${plan.stages.length}` : undefined}
              />
              <SummaryStat
                label="Wydarzenia w planie"
                value={String(plan.periods.length + plan.milestones.length)}
                hint="okresy, terminy i formalności"
              />
              <SummaryStat
                label="Najbliższy ważny termin"
                value={nearest ? formatDate(nearest.date) : "Brak"}
                hint={nearest?.title}
              />
            </dl>

            <TaskCard
              task={nextTask}
              demo={origin === "DEMO"}
              onShowDetails={(milestone) =>
                showDetails({ kind: "milestone", milestone })
              }
            />
          </section>

          <section aria-label="Filtry planu" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Osoba
                </span>
                <div role="group" aria-label="Filtruj według osoby" className="flex flex-wrap gap-1.5">
                  {ownerFilters.map((filter) => (
                    <FilterButton
                      key={filter.value}
                      active={ownerFilter === filter.value}
                      onClick={() => {
                        setOwnerFilter(filter.value)
                        setSelectedId(null)
                      }}
                    >
                      {filter.label}
                    </FilterButton>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Rodzaj
                </span>
                <div role="group" aria-label="Filtruj według rodzaju" className="flex flex-wrap gap-1.5">
                  {typeFilters.map((filter) => (
                    <FilterButton
                      key={filter.value}
                      active={typeFilter === filter.value}
                      onClick={() => {
                        setTypeFilter(filter.value)
                        setSelectedId(null)
                      }}
                    >
                      {filter.label}
                    </FilterButton>
                  ))}
                </div>
              </div>
            </div>

            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList aria-label="Widok planu">
                  <TabsTrigger value="timeline">Oś czasu</TabsTrigger>
                  <TabsTrigger value="table">Widok tabelaryczny</TabsTrigger>
                </TabsList>
                <p className="text-xs text-muted-foreground">
                  {filteredView.periods.length} okresów · {filteredView.points.length} terminów
                </p>
              </div>

              <TabsContent value="timeline">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
                  <div className="rounded-lg border border-border/80 bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">
                          Wizualna oś czasu
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Trzy tory na jednej skali: mama, tata i wspólne
                          wydarzenia.
                        </p>
                      </div>
                      <TimelineLegend className="max-w-md sm:justify-end" />
                    </div>
                    <div className="mt-4">
                      {filteredView.periods.length + filteredView.points.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                            <FilterX aria-hidden="true" className="size-5" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold">
                              Brak elementów dla wybranych filtrów
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              Zmień osobę lub rodzaj wydarzenia.
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                            Pokaż wszystko
                          </Button>
                        </div>
                      ) : (
                        <TimelineChart
                          view={filteredView}
                          today={today}
                          selectedId={selectedId}
                          onSelectPeriod={(period) =>
                            showDetails({ kind: "period", period })
                          }
                          onSelectMilestone={(milestone) =>
                            showDetails({ kind: "milestone", milestone })
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div
                    ref={detailsRef}
                    className="scroll-mt-24 xl:sticky xl:top-24"
                  >
                    <TimelineDetails
                      item={selected}
                      today={today}
                      onClose={() => setSelectedId(null)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="table">
                <TimelineTable
                  plan={plan}
                  view={filteredView}
                  selectedId={selectedId}
                  onSelect={showDetails}
                />
              </TabsContent>
            </Tabs>
          </section>

          <TimelineStages plan={plan} today={today} onSelect={showDetails} />

          <TimelineGuide
            ruleSetVersion={plan.ruleSetVersion}
            verified={plan.verified}
            unverifiedRules={ruleSet.unverifiedRules}
            missing={plan.missing}
          />

          <section aria-labelledby="zastrzezenia-planu" className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users aria-hidden="true" className="size-4 text-primary" />
                  Dla obojga rodziców
                </CardTitle>
                <CardDescription>
                  Plan pokazuje osobno część mamy, część taty i terminy wspólne.
                  Część drugiego rodzica jest zarezerwowana i nie przechodzi na
                  mamę.
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
                    .map(([, weeks]) => weeks)
                    .join("/")}{" "}
                  tygodni macierzyńskiego oraz{" "}
                  {ruleSet.parental.poolWeeks.single}/
                  {ruleSet.parental.poolWeeks.multiple} tygodni
                  rodzicielskiego.
                </CardDescription>
              </CardHeader>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
