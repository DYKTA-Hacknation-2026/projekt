"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  CircleHelp,
  Loader2,
  Pencil,
  Users,
} from "lucide-react"

import type {
  CalculatorInput,
  CalculatorMode,
  EmploymentType,
  PaymentOption,
  RuleSet,
  SicknessCoverage,
} from "@zpr/domain"
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
import { Progress } from "@workspace/ui/components/progress"
import { Select } from "@workspace/ui/components/select"
import { formatPln } from "@/lib/format"

import { CalculatorResultView } from "./calculator-result"
import {
  ChoiceCard,
  FieldHint,
  StepHeading,
} from "./calculator-ui"
import { ScenarioComparisonView } from "./scenario-comparison"
import type {
  CalculationResponseBody,
  ComparisonResponseBody,
} from "./types"

type ChildStatus = "PREGNANCY" | "BORN" | "ADOPTION" | "FOSTER_CARE"
type FamilyStructure = "BOTH" | "SINGLE"
type LeaveMode = "MOTHER_MOST" | "FATHER_NINE" | "SHARED"

const STEP_TITLES = [
  "Sytuacja rodzinna",
  "Sytuacja zawodowa",
  "Plan urlopów",
  "Wynik",
] as const

function modeForStatus(status: ChildStatus): CalculatorMode {
  if (status === "ADOPTION") return "ADOPTION"
  if (status === "FOSTER_CARE") return "FOSTER_CARE"
  return "BIRTH"
}

function numberFrom(value: string): number | undefined {
  if (value.trim() === "") return undefined
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : undefined
}

function employmentLabel(value: EmploymentType): string {
  if (value === "EMPLOYEE") return "umowa o pracę"
  if (value === "CONTRACTOR") return "umowa zlecenia"
  return "działalność gospodarcza"
}

function coverageLabel(value: SicknessCoverage): string {
  if (value === "COMPULSORY") return "obowiązkowe"
  if (value === "VOLUNTARY") return "dobrowolne"
  if (value === "NONE") return "brak"
  return "nie wiem"
}

function leaveLabel(mode: LeaveMode): string {
  if (mode === "MOTHER_MOST") return "Mama bierze większość"
  if (mode === "FATHER_NINE") return "Tata bierze 9 tygodni"
  return "Urlop dzielony po połowie"
}

export function QuickCalculator({
  ruleSet,
  initialInput,
  prefillNotices = [],
  onAdvanced,
}: {
  ruleSet: RuleSet
  initialInput?: Partial<CalculatorInput> | null
  prefillNotices?: string[]
  onAdvanced: (input: CalculatorInput) => void
}) {
  const [step, setStep] = useState(1)
  const [childStatus, setChildStatus] = useState<ChildStatus>("PREGNANCY")
  const [eventDate, setEventDate] = useState("")
  const [children, setChildren] = useState("1")
  const [hasZaZyciem, setHasZaZyciem] = useState(false)
  const [familyStructure, setFamilyStructure] =
    useState<FamilyStructure>("BOTH")

  const [motherEmployment, setMotherEmployment] =
    useState<EmploymentType>("EMPLOYEE")
  const [fatherEmployment, setFatherEmployment] =
    useState<EmploymentType>("EMPLOYEE")
  const [motherCoverage, setMotherCoverage] =
    useState<SicknessCoverage>("COMPULSORY")
  const [fatherCoverage, setFatherCoverage] =
    useState<SicknessCoverage>("COMPULSORY")
  const [motherIncome, setMotherIncome] = useState("")
  const [fatherIncome, setFatherIncome] = useState("")
  const [motherIncomeUnknown, setMotherIncomeUnknown] = useState(false)
  const [fatherIncomeUnknown, setFatherIncomeUnknown] = useState(false)
  const [basisOverride, setBasisOverride] = useState<number | undefined>()
  const [basisSource, setBasisSource] = useState<string | null>(null)

  const [leaveMode, setLeaveMode] = useState<LeaveMode>("FATHER_NINE")
  const [paymentOption, setPaymentOption] =
    useState<PaymentOption>("STANDARD_100_70")
  const [paternityDays, setPaternityDays] = useState(
    String(ruleSet.paternity.days)
  )
  const [preBirthWeeks, setPreBirthWeeks] = useState(
    String(Math.min(2, ruleSet.maternity.maxPreBirthWeeks))
  )
  const [compareVariants, setCompareVariants] = useState(true)

  const [notices, setNotices] = useState<string[]>(prefillNotices)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [comparePending, setComparePending] = useState(false)
  const [result, setResult] = useState<CalculationResponseBody | null>(null)
  const [comparison, setComparison] =
    useState<ComparisonResponseBody | null>(null)
  const [lastInput, setLastInput] = useState<CalculatorInput | null>(null)

  const childCounts = useMemo(
    () =>
      Object.keys(ruleSet.maternity.weeksByChildren)
        .map(Number)
        .sort((a, b) => a - b),
    [ruleSet]
  )

  const bothParents = familyStructure === "BOTH"
  const isBirth = childStatus === "PREGNANCY" || childStatus === "BORN"
  const poolWeeks = useMemo(() => {
    const multiple = Number(children) > 1
    if (hasZaZyciem) {
      return multiple
        ? ruleSet.parental.poolWeeks.zaZyciemMultiple
        : ruleSet.parental.poolWeeks.zaZyciemSingle
    }
    return multiple
      ? ruleSet.parental.poolWeeks.multiple
      : ruleSet.parental.poolWeeks.single
  }, [children, hasZaZyciem, ruleSet])
  const reservedWeeks = ruleSet.parental.nonTransferableWeeks
  const fatherParentalWeeks =
    !bothParents || leaveMode === "MOTHER_MOST"
      ? 0
      : leaveMode === "FATHER_NINE"
        ? reservedWeeks
        : Math.max(reservedWeeks, Math.floor(poolWeeks / 2))
  const motherParentalWeeks =
    leaveMode === "SHARED"
      ? Math.max(reservedWeeks, poolWeeks - fatherParentalWeeks)
      : Math.max(reservedWeeks, poolWeeks - reservedWeeks)

  useEffect(() => {
    if (!initialInput) return
    const input = initialInput
    const nextStatus: ChildStatus =
      input.mode === "ADOPTION"
        ? "ADOPTION"
        : input.mode === "FOSTER_CARE"
          ? "FOSTER_CARE"
          : input.birthDate && input.birthDate <= new Date().toISOString().slice(0, 10)
            ? "BORN"
            : "PREGNANCY"
    setChildStatus(nextStatus)
    const date = input.birthDate ?? input.placementDate
    if (date) setEventDate(date)
    if (input.childrenCount !== undefined) {
      setChildren(String(input.childrenCount))
    }
    if (input.hasZaZyciem !== undefined) setHasZaZyciem(input.hasZaZyciem)
    if (input.fatherEnabled === false) setFamilyStructure("SINGLE")
    if (input.motherEmploymentType) setMotherEmployment(input.motherEmploymentType)
    if (input.fatherEmploymentType) setFatherEmployment(input.fatherEmploymentType)
    if (input.motherSicknessInsurance) setMotherCoverage(input.motherSicknessInsurance)
    if (input.fatherSicknessInsurance) setFatherCoverage(input.fatherSicknessInsurance)
    if (input.monthlyBasisOverrideGrosze !== undefined) {
      setBasisOverride(input.monthlyBasisOverrideGrosze)
      setBasisSource("Dane z kreatora, importu lub dokumentu")
    } else if (input.knownBasisGrosze !== undefined) {
      setBasisOverride(input.knownBasisGrosze)
      setBasisSource("Podstawa z Z-3/Z-3a")
    } else if (input.grossMonthlyIncomeGrosze !== undefined) {
      setMotherIncome(
        input.grossMonthlyIncomeGrosze > 0
          ? String(input.grossMonthlyIncomeGrosze / 100)
          : ""
      )
      setMotherIncomeUnknown(input.grossMonthlyIncomeGrosze === 0)
    }
    if (input.secondParentMonthlyIncomeGrosze !== undefined) {
      setFatherIncome(String(input.secondParentMonthlyIncomeGrosze / 100))
      setFatherIncomeUnknown(input.secondParentMonthlyIncomeGrosze === 0)
    }
    if (input.paymentOption) setPaymentOption(input.paymentOption)
    if (input.paternityDays !== undefined) setPaternityDays(String(input.paternityDays))
    if (input.maternityWeeksBeforeBirth !== undefined) {
      setPreBirthWeeks(String(input.maternityWeeksBeforeBirth))
    }
    if (input.secondParentParentalWeeks !== undefined) {
      if (input.secondParentParentalWeeks === 0) setLeaveMode("MOTHER_MOST")
      else if (input.secondParentParentalWeeks > reservedWeeks) setLeaveMode("SHARED")
      else setLeaveMode("FATHER_NINE")
    }
    if (prefillNotices.length > 0) setNotices(prefillNotices)
    // The handoff is applied once; later edits belong to the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot prefill
  }, [initialInput])

  function updateEmployment(
    who: "mother" | "father",
    value: EmploymentType
  ): void {
    if (who === "mother") {
      setMotherEmployment(value)
      setMotherCoverage(value === "EMPLOYEE" ? "COMPULSORY" : "UNKNOWN")
    } else {
      setFatherEmployment(value)
      setFatherCoverage(value === "EMPLOYEE" ? "COMPULSORY" : "UNKNOWN")
    }
  }

  function validateStep(current: number): string | null {
    if (current === 1) {
      if (!eventDate) {
        return childStatus === "PREGNANCY"
          ? "Podaj przewidywany termin porodu."
          : "Podaj datę porodu lub przyjęcia dziecka."
      }
      if (!Number.isInteger(Number(children)) || Number(children) < 1) {
        return "Podaj liczbę dzieci."
      }
    }
    if (current === 2) {
      if (!motherIncomeUnknown) {
        const income = numberFrom(motherIncome)
        if (income === undefined || income < 0) {
          return "Podaj przybliżony miesięczny dochód brutto mamy albo zaznacz „nie znam dokładnej kwoty”."
        }
      }
      if (bothParents && !fatherIncomeUnknown) {
        const income = numberFrom(fatherIncome)
        if (income === undefined || income < 0) {
          return "Podaj przybliżony miesięczny dochód brutto drugiego rodzica albo zaznacz „nie znam dokładnej kwoty”."
        }
      }
    }
    return null
  }

  function next() {
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setStep((current) => Math.min(4, current + 1))
  }

  function back() {
    setError(null)
    setStep((current) => Math.max(1, current - 1))
  }

  function buildInput(): CalculatorInput {
    const mother = numberFrom(motherIncome)
    const father = numberFrom(fatherIncome)
    const mode = modeForStatus(childStatus)
    const input: CalculatorInput = {
      grossMonthlyIncomeGrosze:
        motherIncomeUnknown || mother === undefined
          ? 0
          : Math.round(mother * 100),
      ...(basisOverride !== undefined
        ? { monthlyBasisOverrideGrosze: basisOverride }
        : {}),
      childrenCount: Number(children),
      hasZaZyciem,
      paymentOption,
      maternityWeeksBeforeBirth: isBirth ? Number(preBirthWeeks) : 0,
      secondParentParentalWeeks: bothParents ? fatherParentalWeeks : 0,
      motherParentalWeeks,
      parentalWorkFraction: 0,
      paternityDays: bothParents ? Number(paternityDays) : 0,
      mode,
      ...(isBirth ? { birthDate: eventDate } : { placementDate: eventDate }),
      employmentType: motherEmployment,
      motherEmploymentType: motherEmployment,
      fatherEmploymentType: fatherEmployment,
      motherEnabled: true,
      fatherEnabled: bothParents,
      motherSicknessInsurance: motherCoverage,
      fatherSicknessInsurance: fatherCoverage,
      incomeMode: basisOverride !== undefined ? "KNOWN_BASIS" : "SIMPLE",
    }
    if (bothParents && !fatherIncomeUnknown && father !== undefined) {
      input.secondParentMonthlyIncomeGrosze = Math.round(father * 100)
    }
    return input
  }

  async function calculate(input: CalculatorInput): Promise<void> {
    setPending(true)
    setComparePending(compareVariants)
    setError(null)
    setLastInput(input)
    try {
      const response = await fetch("/api/v1/calculations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input, save: true }),
      })
      const data = (await response.json()) as CalculationResponseBody
      if (!response.ok) {
        const issue = data.issues?.[0]
        throw new Error(
          issue
            ? `${issue.path}: ${issue.message}`
            : (data.detail ?? "Nie udało się wykonać obliczenia.")
        )
      }
      setResult(data)
      setStep(4)
      if (compareVariants) {
        try {
          const compareResponse = await fetch("/api/v1/calculations/compare", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ input }),
          })
          const compareData =
            (await compareResponse.json()) as ComparisonResponseBody
          if (compareResponse.ok) setComparison(compareData)
          else setComparison(null)
        } catch {
          setComparison(null)
        } finally {
          setComparePending(false)
        }
      } else {
        setComparison(null)
        setComparePending(false)
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Wystąpił nieoczekiwany błąd."
      )
    } finally {
      setPending(false)
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validateStep(3)
    if (message) {
      setError(message)
      return
    }
    await calculate(buildInput())
  }

  function editStep(target: number) {
    setError(null)
    setStep(target)
  }

  const summary = [
    {
      step: 1,
      label: "Sytuacja",
      value:
        childStatus === "PREGNANCY"
          ? `Ciąża, termin ${eventDate}`
          : childStatus === "BORN"
            ? `Dziecko urodzone ${eventDate}`
            : childStatus === "ADOPTION"
              ? `Adopcja, przyjęcie ${eventDate}`
              : `Rodzina zastępcza, przyjęcie ${eventDate}`,
    },
    {
      step: 2,
      label: "Rodzice",
      value: bothParents
        ? `Mama: ${employmentLabel(motherEmployment)} · Tata: ${employmentLabel(fatherEmployment)}`
        : `Mama: ${employmentLabel(motherEmployment)} · tylko jeden rodzic`,
    },
    {
      step: 3,
      label: "Urlop",
      value: `${leaveLabel(leaveMode)} · ${paymentOption === "FLAT_81_5" ? "81,5%" : "100% / 70%"}`,
    },
  ] as const

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>
                {step <= 3
                  ? `Krok ${step} z 4 · ${STEP_TITLES[step - 1]}`
                  : "Twój wynik"}
              </CardTitle>
              <CardDescription>
                {step <= 3
                  ? "Odpowiadaj tylko na pytania, które dotyczą Twojej sytuacji. Możesz wrócić bez utraty danych."
                  : "Ten sam wynik możesz doprecyzować w trybie zaawansowanym."}
              </CardDescription>
            </div>
            <Badge variant="info">Szybkie wyliczenie</Badge>
          </div>
          <Progress value={step * 25} label={`Postęp kalkulatora: ${step * 25}%`} />
        </CardHeader>

        <form onSubmit={onSubmit}>
          <CardContent className="space-y-6 pt-6">
            {notices.length > 0 && (
              <Alert variant="info">
                <CircleHelp aria-hidden="true" />
                <AlertTitle>Dane zostały wstępnie uzupełnione</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {notices.map((notice) => (
                      <li key={notice}>{notice}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Nie można kontynuować</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <StepHeading
                  step={1}
                  total={4}
                  title="Co się dzieje w Waszej rodzinie?"
                  lead="Te informacje decydują o wymiarze urlopu i terminach. Nie pytamy o rzeczy, które nie mają znaczenia w Twojej sytuacji."
                />

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Czy dziecko już się urodziło?
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ChoiceCard
                      name="childStatus"
                      checked={childStatus === "PREGNANCY"}
                      onSelect={() => setChildStatus("PREGNANCY")}
                      title="Dopiero się spodziewamy"
                      description="Podaj przewidywany termin porodu. Daty i terminy będą liczone od niego."
                    />
                    <ChoiceCard
                      name="childStatus"
                      checked={childStatus === "BORN"}
                      onSelect={() => setChildStatus("BORN")}
                      title="Dziecko już jest"
                      description="Podaj rzeczywistą datę porodu."
                    />
                  </div>
                  <details className="rounded-lg border border-border/70 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Adopcja lub rodzina zastępcza
                    </summary>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <ChoiceCard
                        name="childStatus"
                        checked={childStatus === "ADOPTION"}
                        onSelect={() => setChildStatus("ADOPTION")}
                        title="Adopcja"
                        description="Dziecko przyjęte na wychowanie na podstawie przysposobienia."
                      />
                      <ChoiceCard
                        name="childStatus"
                        checked={childStatus === "FOSTER_CARE"}
                        onSelect={() => setChildStatus("FOSTER_CARE")}
                        title="Rodzina zastępcza"
                        description="Niezawodowa rodzina zastępcza. Zawodowa rodzina nie nabywa tego uprawnienia."
                      />
                    </div>
                  </details>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quick-event-date">
                      {childStatus === "PREGNANCY"
                        ? "Przewidywany termin porodu"
                        : childStatus === "BORN"
                          ? "Data porodu"
                          : "Data przyjęcia dziecka"}
                    </Label>
                    <Input
                      id="quick-event-date"
                      type="date"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      required
                    />
                    <FieldHint>
                      {childStatus === "PREGNANCY"
                        ? "Jeśli poród nastąpi w innym dniu, daty przesuną się. Terminy liczymy od daty porodu."
                        : "Data powstania prawa do zasiłku zależy od tej daty."}
                    </FieldHint>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-children">Liczba dzieci</Label>
                    <Select
                      id="quick-children"
                      value={children}
                      onChange={(event) => setChildren(event.target.value)}
                    >
                      {childCounts.map((count) => (
                        <option key={count} value={count}>
                          {count === ruleSet.maternity.maxChildren
                            ? `${count} lub więcej`
                            : count}
                        </option>
                      ))}
                    </Select>
                    <FieldHint>
                      Liczba dzieci z jednego porodu (albo przyjętych
                      jednocześnie) wydłuża urlop macierzyński i rodzicielski.
                    </FieldHint>
                  </div>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Ile osób będzie korzystać z urlopów?
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ChoiceCard
                      name="familyStructure"
                      checked={familyStructure === "BOTH"}
                      onSelect={() => setFamilyStructure("BOTH")}
                      title="Oboje rodzice"
                      description="Druga osoba też ma lub może mieć prawo do urlopu."
                    />
                    <ChoiceCard
                      name="familyStructure"
                      checked={familyStructure === "SINGLE"}
                      onSelect={() => setFamilyStructure("SINGLE")}
                      title="Tylko jeden rodzic"
                      description="Bez drugiego rodzica w obliczeniu."
                    />
                  </div>
                </fieldset>

                <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={hasZaZyciem}
                    onChange={(event) => setHasZaZyciem(event.target.checked)}
                  />
                  <span>
                    <span className="font-medium">
                      Mamy zaświadczenie „Za życiem”
                    </span>
                    <span className="block text-xs text-pretty text-muted-foreground">
                      Wydłuża pulę urlopu rodzicielskiego. Zaznacz tylko wtedy,
                      gdy dokument został wydany.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <StepHeading
                  step={2}
                  total={4}
                  title="Jak wygląda praca i ubezpieczenie?"
                  lead="Wystarczą przybliżone dane. Jeśli czegoś nie wiesz, zaznacz to — wynik pokaże brak zamiast zgadywać."
                />

                <ParentPanel
                  role="MOTHER"
                  employment={motherEmployment}
                  onEmploymentChange={(value) =>
                    updateEmployment("mother", value)
                  }
                  coverage={motherCoverage}
                  onCoverageChange={setMotherCoverage}
                  income={motherIncome}
                  onIncomeChange={setMotherIncome}
                  incomeUnknown={motherIncomeUnknown}
                  onIncomeUnknownChange={setMotherIncomeUnknown}
                  incomeHint="Najczęściej wystarczy kwota brutto z umowy. Silnik sam potrąci składki i ustali podstawę."
                />

                {bothParents && (
                  <ParentPanel
                    role="FATHER"
                    employment={fatherEmployment}
                    onEmploymentChange={(value) =>
                      updateEmployment("father", value)
                    }
                    coverage={fatherCoverage}
                    onCoverageChange={setFatherCoverage}
                    income={fatherIncome}
                    onIncomeChange={setFatherIncome}
                    incomeUnknown={fatherIncomeUnknown}
                    onIncomeUnknownChange={setFatherIncomeUnknown}
                    incomeHint="Dochód drugiego rodzica ma znaczenie dla jego zasiłku, m.in. za 9 tygodni urlopu i urlop ojcowski."
                  />
                )}

                {basisOverride !== undefined && (
                  <Alert variant="success">
                    <CheckCircle2 aria-hidden="true" />
                    <AlertTitle>Użyjemy znanej podstawy wymiaru</AlertTitle>
                    <AlertDescription>
                      {basisSource ?? "Dane z dokumentu"}:{" "}
                      <strong>{formatPln(basisOverride)}</strong> miesięcznie.
                      Nie potrącamy z niej składek ponownie. Możesz ją zmienić w
                      trybie zaawansowanym.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="rounded-lg border border-border/70 bg-secondary/40 p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Users aria-hidden="true" className="size-4 text-primary" />
                    Dlaczego pytamy o ubezpieczenie chorobowe?
                  </p>
                  <p className="mt-1 text-xs text-pretty text-muted-foreground">
                    To ubezpieczenie decyduje o prawie do zasiłku
                    macierzyńskiego. Przy umowie o pracę jest obowiązkowe. Przy
                    zleceniu i działalności jest dobrowolne — dlatego pytamy o
                    nie osobno.
                  </p>
                  <p className="mt-2 text-xs text-pretty text-muted-foreground">
                    W szybkim trybie przyjmujemy pełny etat. Jeśli pracujesz na
                    część etatu, otwórz tryb zaawansowany i zmień wymiar czasu
                    pracy — ma to znaczenie dla minimalnej podstawy wymiaru.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <StepHeading
                  step={3}
                  total={4}
                  title="Jak podzielić urlopy?"
                  lead="Wskaż wariant, który chcesz sprawdzić. Silnik zweryfikuje, czy podział mieści się w przepisach, i pokaże ewentualne korekty."
                />

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">
                    Kto i jak długo chce korzystać z urlopu rodzicielskiego?
                  </legend>
                  <div className="grid gap-2">
                    <ChoiceCard
                      name="leaveMode"
                      checked={leaveMode === "MOTHER_MOST"}
                      onSelect={() => setLeaveMode("MOTHER_MOST")}
                      title="Mama bierze większość"
                      description={`Mama ${motherParentalWeeks} tyg., tata 0 tyg. Dziewięć tygodni drugiego rodzica pozostaje niewykorzystane.`}
                    />
                    {bothParents && (
                      <>
                        <ChoiceCard
                          name="leaveMode"
                          checked={leaveMode === "FATHER_NINE"}
                          onSelect={() => setLeaveMode("FATHER_NINE")}
                          title="Tata bierze swoje 9 tygodni"
                          description={`Mama ${motherParentalWeeks} tyg., tata ${fatherParentalWeeks} tyg. To najczęstszy podział.`}
                        />
                        <ChoiceCard
                          name="leaveMode"
                          checked={leaveMode === "SHARED"}
                          onSelect={() => setLeaveMode("SHARED")}
                          title="Dzielimy po połowie"
                          description={`Mama ${motherParentalWeeks} tyg., tata ${fatherParentalWeeks} tyg. Silnik sprawdzi limit puli i skróci nadmiar.`}
                        />
                      </>
                    )}
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quick-payment">Sposób wypłaty</Label>
                    <Select
                      id="quick-payment"
                      value={paymentOption}
                      onChange={(event) =>
                        setPaymentOption(event.target.value as PaymentOption)
                      }
                    >
                      <option value="STANDARD_100_70">
                        100% za macierzyński, 70% za rodzicielski
                      </option>
                      <option value="FLAT_81_5">
                        81,5% za cały okres (wniosek do 21 dni)
                      </option>
                    </Select>
                    <FieldHint
                      more="Wariant 81,5% wymaga pisemnego wniosku w ciągu 21 dni od porodu. Dziewięć tygodni drugiego rodzica i tak jest płatne 70%."
                    >
                      Wariant 81,5% daje niższą stawkę, ale przez cały okres.
                      Wybierz go tylko, jeśli planujesz złożyć wniosek w terminie.
                    </FieldHint>
                  </div>

                  {isBirth && (
                    <div className="space-y-2">
                      <Label htmlFor="quick-pre-birth">
                        Urlop przed porodem
                      </Label>
                      <Select
                        id="quick-pre-birth"
                        value={preBirthWeeks}
                        onChange={(event) =>
                          setPreBirthWeeks(event.target.value)
                        }
                      >
                        {Array.from(
                          { length: ruleSet.maternity.maxPreBirthWeeks + 1 },
                          (_, weeks) => weeks
                        ).map((weeks) => (
                          <option key={weeks} value={weeks}>
                            {weeks} tyg.
                          </option>
                        ))}
                      </Select>
                      <FieldHint>
                        Maksymalnie {ruleSet.maternity.maxPreBirthWeeks} tyg.
                        przed porodem. Pozostała część macierzyńskiego przypada
                        po porodzie.
                      </FieldHint>
                    </div>
                  )}

                  {bothParents && (
                    <div className="space-y-2">
                      <Label htmlFor="quick-paternity">
                        Dni urlopu ojcowskiego
                      </Label>
                      <Select
                        id="quick-paternity"
                        value={paternityDays}
                        onChange={(event) =>
                          setPaternityDays(event.target.value)
                        }
                      >
                        {Array.from(
                          new Set([
                            0,
                            ruleSet.paternity.minPartDays,
                            ruleSet.paternity.days,
                          ])
                        )
                          .filter(
                            (days) =>
                              days >= 0 && days <= ruleSet.paternity.days
                          )
                          .sort((a, b) => a - b)
                          .map((days) => (
                            <option key={days} value={days}>
                              {days} dni
                            </option>
                          ))}
                      </Select>
                      <FieldHint>
                        Urlop ojcowski jest płatny 100% i nie wchodzi do puli
                        urlopu rodzicielskiego.
                      </FieldHint>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={compareVariants}
                    onChange={(event) =>
                      setCompareVariants(event.target.checked)
                    }
                  />
                  <span>
                    <span className="font-medium">
                      Pokaż porównanie wariantów
                    </span>
                    <span className="block text-xs text-pretty text-muted-foreground">
                      Zobaczysz obok siebie trzy podziały urlopu: większość dla
                      mamy, 9 tygodni dla taty i podział po połowie. Każdy
                      wariant liczy ten sam silnik.
                    </span>
                  </span>
                </label>

                <div className="rounded-lg border border-border/70 p-3">
                  <p className="text-sm font-medium">Podsumowanie</p>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    {summary.map((item) => (
                      <div key={item.step}>
                        <dt className="text-xs text-muted-foreground">
                          {item.label}
                        </dt>
                        <dd className="text-pretty">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => editStep(1)}
                  >
                    <Pencil aria-hidden="true" />
                    Popraw dane
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                {pending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 aria-hidden="true" className="animate-spin" />
                    Liczę świadczenia…
                  </div>
                )}
                {result && (
                  <>
                    <div className="rounded-lg border border-border/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Dane użyte do wyliczenia
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => editStep(1)}
                        >
                          <Pencil aria-hidden="true" />
                          Edytuj
                        </Button>
                      </div>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        {summary.map((item) => (
                          <div key={item.step}>
                            <dt className="text-xs text-muted-foreground">
                              {item.label}
                            </dt>
                            <dd className="text-pretty">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <CalculatorResultView
                      data={result}
                      onAdvanced={() =>
                        onAdvanced(lastInput ?? buildInput())
                      }
                    />
                    {comparePending && (
                      <p className="text-sm text-muted-foreground">
                        Liczę warianty porównawcze…
                      </p>
                    )}
                    {comparison && (
                      <ScenarioComparisonView
                        comparison={comparison.comparison}
                      />
                    )}
                  </>
                )}
                {!result && !pending && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Nie mamy jeszcze wyniku. Wróć do kroku 3 i oblicz
                      świadczenie.
                    </p>
                    <Button type="button" onClick={() => editStep(3)}>
                      Wróć do planu urlopów
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse justify-between gap-2 border-t border-border/70 pt-4 sm:flex-row">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={back}
                  disabled={step === 1 || pending}
                >
                  <ArrowLeft aria-hidden="true" />
                  Wstecz
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onAdvanced(lastInput ?? buildInput())}
                >
                  <Calculator aria-hidden="true" />
                  Tryb zaawansowany
                </Button>
              </div>
              {step < 3 && (
                <Button type="button" onClick={next}>
                  Dalej
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
              {step === 3 && (
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Calculator aria-hidden="true" />
                  )}
                  {pending ? "Liczę…" : "Oblicz świadczenie"}
                </Button>
              )}
              {step === 4 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editStep(3)}
                >
                  Zmień plan urlopów
                </Button>
              )}
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

function ParentPanel({
  role,
  employment,
  onEmploymentChange,
  coverage,
  onCoverageChange,
  income,
  onIncomeChange,
  incomeUnknown,
  onIncomeUnknownChange,
  incomeHint,
}: {
  role: "MOTHER" | "FATHER"
  employment: EmploymentType
  onEmploymentChange: (value: EmploymentType) => void
  coverage: SicknessCoverage
  onCoverageChange: (value: SicknessCoverage) => void
  income: string
  onIncomeChange: (value: string) => void
  incomeUnknown: boolean
  onIncomeUnknownChange: (value: boolean) => void
  incomeHint: string
}) {
  const prefix = role === "MOTHER" ? "mother" : "father"
  const isEmployee = employment === "EMPLOYEE"
  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-secondary/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          {role === "MOTHER" ? "Mama / rodzic przyjmujący" : "Tata / drugi rodzic"}
        </h3>
        <Badge variant="outline">{employmentLabel(employment)}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-employment`}>Forma zatrudnienia</Label>
          <Select
            id={`${prefix}-employment`}
            value={employment}
            onChange={(event) =>
              onEmploymentChange(event.target.value as EmploymentType)
            }
          >
            <option value="EMPLOYEE">Umowa o pracę</option>
            <option value="CONTRACTOR">Umowa zlecenia</option>
            <option value="BUSINESS">Działalność gospodarcza / B2B</option>
          </Select>
          <FieldHint>
            Od formy zależy, czy ubezpieczenie chorobowe jest obowiązkowe, i jak
            liczymy podstawę wymiaru.
          </FieldHint>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${prefix}-coverage`}>
            Ubezpieczenie chorobowe
          </Label>
          <Select
            id={`${prefix}-coverage`}
            value={isEmployee ? "COMPULSORY" : coverage}
            disabled={isEmployee}
            onChange={(event) =>
              onCoverageChange(event.target.value as SicknessCoverage)
            }
          >
            <option value="COMPULSORY">Obowiązkowe</option>
            <option value="VOLUNTARY">Dobrowolne</option>
            <option value="NONE">Brak</option>
            {!isEmployee && <option value="UNKNOWN">Nie wiem</option>}
          </Select>
          <FieldHint
            more={
              isEmployee
                ? "Przy umowie o pracę ubezpieczenie chorobowe jest obowiązkowe. Nie musisz niczego wpisywać."
                : "Przy zleceniu i działalności ubezpieczenie chorobowe jest dobrowolne. Jeśli nie wiesz, wybierz „Nie wiem” — wynik będzie częściowy, ale nie zgadniemy za Ciebie."
            }
          >
            {isEmployee
              ? "Przy umowie o pracę jest obowiązkowe — ustawiamy je automatycznie."
              : "To ubezpieczenie decyduje o prawie do zasiłku. Przy tej formie jest dobrowolne."}
          </FieldHint>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${prefix}-income`}>
            Przybliżony miesięczny dochód brutto
          </Label>
          <Input
            id={`${prefix}-income`}
            type="number"
            min={0}
            step={100}
            inputMode="decimal"
            value={incomeUnknown ? "" : income}
            disabled={incomeUnknown}
            placeholder={incomeUnknown ? "nie podano" : "np. 8000"}
            onChange={(event) => onIncomeChange(event.target.value)}
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={incomeUnknown}
              onChange={(event) =>
                onIncomeUnknownChange(event.target.checked)
              }
            />
            Nie znam dokładnej kwoty
          </label>
          <FieldHint
            more="Jeśli znasz podstawę wymiaru z Z-3/Z-3a, wpisz ją w trybie zaawansowanym. Nie podstawiamy jej automatycznie."
          >
            {incomeHint} Jeśli nie znasz kwoty, zaznacz to — silnik pokaże brak
            danych zamiast liczyć na przypadkowej wartości.
          </FieldHint>
        </div>
      </div>
    </div>
  )
}
