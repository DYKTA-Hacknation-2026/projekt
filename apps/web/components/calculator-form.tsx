"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Info,
  Loader2,
  Scale,
  Wallet,
} from "lucide-react"

import {
  PRESET_CASES,
  findPresetCase,
  type RuleSet,
  type CalculatorInput,
  type CalculatorMode,
  type CalculatorResult,
  type EmploymentType,
  type MonthlyIncomeEntry,
  type PaymentOption,
  type SpecialCase,
} from "@zpr/domain"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { importPrefillStorageSchema } from "@zpr/contracts/data-import"
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
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { takeDocumentPrefill } from "@/lib/document-prefill"
import { formatPln, formatPercent } from "@/lib/format"
import { calculator as calculatorCopy } from "@/messages/pl"

type ResponseBody = {
  calculationId: string | null
  saved: boolean
  engineVersion: string
  result: CalculatorResult
  detail?: string
  issues?: Array<{ path: string; message: string }>
}

type FormTab = "BIRTH" | "ADOPTION" | "PRESETS"
type IncomeScope = "MOTHER" | "BOTH"
type IncomeInputMode = "SIMPLE" | "DETAILED"

interface MonthRow {
  gross: string
  absence: boolean
  supplement: string
}

const EMPTY_MONTHS: MonthRow[] = Array.from({ length: 12 }, () => ({
  gross: "8000",
  absence: false,
  supplement: "",
}))

const MONTH_LABELS = [
  "Miesiąc 1 (najstarszy)",
  ...Array.from({ length: 10 }, (_, i) => `Miesiąc ${i + 2}`),
  "Miesiąc 12 (ostatni)",
]

function plnToString(grosze: number): string {
  return String(grosze / 100)
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : undefined
}

function workLabel(fraction: number): string {
  if (fraction === 0) return "Bez pracy"
  if (fraction === 0.25) return "¼ etatu"
  if (fraction === 0.5) return "½ etatu"
  return `${Math.round(fraction * 100)}% etatu`
}

export function CalculatorForm({ ruleSet }: { ruleSet: RuleSet }) {
  const [tab, setTab] = useState<FormTab>("BIRTH")
  const [mode, setMode] = useState<CalculatorMode>("BIRTH")
  const [presetId, setPresetId] = useState("")

  const [income, setIncome] = useState("8000")
  const [incomeScope, setIncomeScope] = useState<IncomeScope>("MOTHER")
  const [secondIncome, setSecondIncome] = useState("8000")
  const [incomeMode, setIncomeMode] = useState<IncomeInputMode>("SIMPLE")
  const [months, setMonths] = useState<MonthRow[]>(EMPTY_MONTHS)
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>("EMPLOYEE")

  const [children, setChildren] = useState("1")
  const [paymentOption, setPaymentOption] =
    useState<PaymentOption>("STANDARD_100_70")
  const [hasZaZyciem, setHasZaZyciem] = useState(false)
  const [preBirthWeeks, setPreBirthWeeks] = useState(
    String(Math.min(2, ruleSet.maternity.maxPreBirthWeeks))
  )
  const [secondParentWeeks, setSecondParentWeeks] = useState(
    String(ruleSet.parental.nonTransferableWeeks)
  )
  const [motherWeeks, setMotherWeeks] = useState("")
  const [takeoverWeeks, setTakeoverWeeks] = useState("0")
  const [workFraction, setWorkFraction] = useState("0")
  const [workCombinedWeeks, setWorkCombinedWeeks] = useState("")
  const [combineInExtension, setCombineInExtension] = useState(false)
  const [paternityDays, setPaternityDays] = useState(
    String(ruleSet.paternity.days)
  )

  // Child situation — birth
  const [birthWeek, setBirthWeek] = useState("")
  const [birthWeight, setBirthWeight] = useState("")
  const [hospitalWeeks, setHospitalWeeks] = useState("")
  const [hospitalDays, setHospitalDays] = useState("")
  const [specialCase, setSpecialCase] = useState<SpecialCase>("STANDARD")
  const [deathDay, setDeathDay] = useState("")
  // Child situation — adoption / foster care
  const [childAge, setChildAge] = useState("5")
  const [childBirthDate, setChildBirthDate] = useState("")
  const [placementDate, setPlacementDate] = useState("")
  const [deferredSchooling, setDeferredSchooling] = useState(false)
  const [professionalFoster, setProfessionalFoster] = useState(false)

  const [save, setSave] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResponseBody | null>(null)
  const [monthlyBasis, setMonthlyBasis] = useState<number | undefined>()
  const [useImportedBasis, setUseImportedBasis] = useState(true)
  const [importLoaded, setImportLoaded] = useState(false)
  const [basisSource, setBasisSource] = useState<"IMPORT" | "DOCUMENT">("IMPORT")

  const childCounts = Object.keys(ruleSet.maternity.weeksByChildren)
    .map(Number)
    .sort((a, b) => a - b)
  const preBirthOptions = Array.from(
    { length: ruleSet.maternity.maxPreBirthWeeks + 1 },
    (_, index) => index
  )
  const paternityOptions = Array.from(
    new Set([0, ruleSet.paternity.minPartDays, ruleSet.paternity.days])
  )
    .filter((days) => days >= 0 && days <= ruleSet.paternity.days)
    .sort((a, b) => a - b)
  const workOptions = [0, 0.25, 0.5]
    .filter((value) => value <= ruleSet.parental.maxWorkFraction)
    .map((value) => ({ value, label: workLabel(value) }))

  useEffect(() => {
    const rawImport = window.sessionStorage.getItem("zpr:import-prefill")
    if (rawImport) {
      try {
        const parsed = importPrefillStorageSchema.safeParse(
          JSON.parse(rawImport)
        )
        if (parsed.success) {
          const data = parsed.data.data
          if (data.grossMonthlyIncomePln !== undefined) {
            setIncome(String(data.grossMonthlyIncomePln))
          }
          if (data.childrenCount !== undefined) {
            setChildren(
              String(
                Math.min(
                  ruleSet.maternity.maxChildren,
                  Math.max(1, data.childrenCount)
                )
              )
            )
          }
          if (data.hasZaZyciem !== undefined) {
            setHasZaZyciem(data.hasZaZyciem)
          }
          if (data.monthlyBasisGrosze !== undefined) {
            setMonthlyBasis(data.monthlyBasisGrosze)
            setUseImportedBasis(true)
          }
          setImportLoaded(true)
        }
      } catch {
        // Ignore a stale or malformed prefill.
      }
    }

    // A payer's basis is an override used as-is, never treated as gross pay.
    const fromDocument = takeDocumentPrefill(window.sessionStorage)
    if (fromDocument) {
      if (fromDocument.monthlyBasisGrosze !== undefined) {
        setMonthlyBasis(fromDocument.monthlyBasisGrosze)
        setUseImportedBasis(true)
      } else if (fromDocument.incomePln !== undefined) {
        setIncome(fromDocument.incomePln)
        setIncomeMode("SIMPLE")
        setMonthlyBasis(undefined)
      }
      if (fromDocument.employmentType) setEmploymentType(fromDocument.employmentType)
      if (fromDocument.childrenCount) {
        setChildren(String(Math.min(ruleSet.maternity.maxChildren, fromDocument.childrenCount)))
      }
      if (fromDocument.paymentOption) setPaymentOption(fromDocument.paymentOption)
      setBasisSource("DOCUMENT")
      setImportLoaded(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount
  }, [])

  function onTabChange(value: string) {
    const next = value as FormTab
    setTab(next)
    if (next === "BIRTH") setMode("BIRTH")
    if (next === "ADOPTION" && mode === "BIRTH") setMode("ADOPTION")
  }

  function applyPreset(id: string) {
    setPresetId(id)
    const preset = findPresetCase(id)
    if (!preset) return
    const p = preset.input
    setMonthlyBasis(undefined)
    setImportLoaded(false)

    setMode(p.mode ?? "BIRTH")
    setIncome(plnToString(p.grossMonthlyIncomeGrosze))
    if (p.secondParentMonthlyIncomeGrosze !== undefined) {
      setIncomeScope("BOTH")
      setSecondIncome(plnToString(p.secondParentMonthlyIncomeGrosze))
    } else {
      setIncomeScope("MOTHER")
    }
    setIncomeMode(p.incomeMode ?? "SIMPLE")
    setMonths(
      p.monthlyIncomes && p.monthlyIncomes.length > 0
        ? p.monthlyIncomes.map((entry: MonthlyIncomeEntry) => ({
            gross: plnToString(entry.grossGrosze),
            absence: Boolean(entry.absenceOver50Percent),
            supplement:
              entry.supplementedGrosze !== undefined
                ? plnToString(entry.supplementedGrosze)
                : "",
          }))
        : EMPTY_MONTHS
    )
    setEmploymentType(p.employmentType ?? "EMPLOYEE")
    setChildren(String(p.childrenCount))
    setPaymentOption(p.paymentOption)
    setHasZaZyciem(p.hasZaZyciem)
    setPreBirthWeeks(String(p.maternityWeeksBeforeBirth))
    setSecondParentWeeks(String(p.secondParentParentalWeeks))
    setMotherWeeks(
      p.motherParentalWeeks !== undefined ? String(p.motherParentalWeeks) : ""
    )
    setTakeoverWeeks(String(p.fatherMaternityTakeoverWeeks ?? 0))
    setWorkFraction(String(p.parentalWorkFraction))
    setWorkCombinedWeeks(
      p.workCombinedWeeks !== undefined ? String(p.workCombinedWeeks) : ""
    )
    setCombineInExtension(Boolean(p.combineWorkInExtension))
    setPaternityDays(String(p.paternityDays))
    setBirthWeek(p.birthWeekOfPregnancy?.toString() ?? "")
    setBirthWeight(p.birthWeightGrams?.toString() ?? "")
    setHospitalWeeks(p.childHospitalWeeks?.toString() ?? "")
    setHospitalDays(p.childHospitalDaysDay5To28?.toString() ?? "")
    setSpecialCase(p.specialCase ?? "STANDARD")
    setDeathDay(p.childDeathDay?.toString() ?? "")
    setChildAge(p.childAgeYears?.toString() ?? "")
    setChildBirthDate(p.childBirthDate ?? "")
    setPlacementDate(p.placementDate ?? "")
    setDeferredSchooling(Boolean(p.isDeferredSchooling))
    setProfessionalFoster(Boolean(p.isProfessionalFosterFamily))
    setResult(null)
    setError(null)
  }

  function updateMonth(index: number, patch: Partial<MonthRow>) {
    setMonths((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function buildInput(): CalculatorInput {
    const incomePln = Number(income)
    if (
      incomeMode === "SIMPLE" &&
      (!Number.isFinite(incomePln) || incomePln < 0)
    ) {
      throw new Error("Podaj poprawny miesięczny dochód brutto.")
    }

    const detailedEntries: MonthlyIncomeEntry[] = months.map((row, index) => {
      const gross = Number(row.gross)
      if (!Number.isFinite(gross) || gross < 0) {
        throw new Error(`Podaj poprawną kwotę dla: ${MONTH_LABELS[index]}.`)
      }
      const supplement = row.absence
        ? numberOrUndefined(row.supplement)
        : undefined
      return {
        grossGrosze: Math.round(gross * 100),
        absenceOver50Percent: row.absence || undefined,
        supplementedGrosze:
          supplement !== undefined ? Math.round(supplement * 100) : undefined,
      }
    })

    const second = numberOrUndefined(secondIncome)
    if (incomeScope === "BOTH" && (second === undefined || second < 0)) {
      throw new Error("Podaj poprawny dochód drugiego rodzica.")
    }

    const isBirth = mode === "BIRTH"
    const input: CalculatorInput = {
      grossMonthlyIncomeGrosze: Math.round(
        (Number.isFinite(incomePln) ? incomePln : 0) * 100
      ),
      monthlyBasisOverrideGrosze: useImportedBasis ? monthlyBasis : undefined,
      childrenCount: Number(children),
      hasZaZyciem,
      paymentOption,
      maternityWeeksBeforeBirth: isBirth ? Number(preBirthWeeks) : 0,
      secondParentParentalWeeks: Number(secondParentWeeks),
      parentalWorkFraction: Number(workFraction),
      paternityDays: Number(paternityDays),
      mode,
      employmentType,
      incomeMode,
    }

    if (incomeMode === "DETAILED") input.monthlyIncomes = detailedEntries
    if (incomeScope === "BOTH" && second !== undefined) {
      input.secondParentMonthlyIncomeGrosze = Math.round(second * 100)
    }
    const mw = numberOrUndefined(motherWeeks)
    if (mw !== undefined) input.motherParentalWeeks = mw
    const take = Number(takeoverWeeks)
    if (take > 0) input.fatherMaternityTakeoverWeeks = take
    const wc = numberOrUndefined(workCombinedWeeks)
    if (wc !== undefined) input.workCombinedWeeks = wc
    if (combineInExtension) input.combineWorkInExtension = true

    if (isBirth) {
      const week = numberOrUndefined(birthWeek)
      const weight = numberOrUndefined(birthWeight)
      const hospital = numberOrUndefined(hospitalWeeks)
      const hospDays = numberOrUndefined(hospitalDays)
      const death = numberOrUndefined(deathDay)
      if (week !== undefined) input.birthWeekOfPregnancy = week
      if (weight !== undefined) input.birthWeightGrams = weight
      if (hospital !== undefined) input.childHospitalWeeks = hospital
      if (hospDays !== undefined) input.childHospitalDaysDay5To28 = hospDays
      input.specialCase = specialCase
      if (death !== undefined && specialCase !== "STANDARD") {
        input.childDeathDay = death
      }
    } else {
      const age = numberOrUndefined(childAge)
      if (age !== undefined) input.childAgeYears = age
      if (childBirthDate) input.childBirthDate = childBirthDate
      if (placementDate) input.placementDate = placementDate
      if (deferredSchooling) input.isDeferredSchooling = true
      if (mode === "FOSTER_CARE" && professionalFoster) {
        input.isProfessionalFosterFamily = true
      }
    }
    return input
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const response = await fetch("/api/v1/calculations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: buildInput(), save }),
      })

      const data = (await response.json()) as ResponseBody
      if (!response.ok) {
        const issue = data.issues?.[0]
        throw new Error(
          issue
            ? `${issue.path}: ${issue.message}`
            : (data.detail ?? "Nie udało się wykonać obliczenia.")
        )
      }
      setResult(data)
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

  const isBirth = mode === "BIRTH"

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator aria-hidden="true" className="size-4 text-primary" />
            Dane do wyliczenia
          </CardTitle>
          <CardDescription>
            Wynik zapisuje się z wersją silnika, zestawem reguł{" "}
            {ruleSet.version} i pełnym wejściem. Kwoty są szacunkiem, dopóki
            zestaw reguł nie jest w pełni zweryfikowany.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} aria-busy={pending}>
          <CardContent className="space-y-5">
            {importLoaded && (
              <Alert variant="info">
                <Info aria-hidden="true" />
                <AlertTitle>
                  {basisSource === "DOCUMENT"
                    ? calculatorCopy.documentPrefillTitle
                    : "Dane z symulowanych źródeł"}
                </AlertTitle>
                <AlertDescription>
                  {basisSource === "DOCUMENT"
                    ? calculatorCopy.documentPrefillText
                    : "Dochód i liczba dzieci pochodzą z zaakceptowanego raportu pobrania. Możesz je zmienić — kalkulator nadal liczy deterministycznie."}
                </AlertDescription>
              </Alert>
            )}
            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList
                aria-label="Rodzaj sprawy"
                className="h-auto w-full flex-wrap"
              >
                <TabsTrigger value="BIRTH">Narodziny dziecka</TabsTrigger>
                <TabsTrigger value="ADOPTION">
                  Adopcja / Rodzina zastępcza
                </TabsTrigger>
                <TabsTrigger value="PRESETS">
                  Przykłady ze spraw ZUS (Zestawy)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "PRESETS" && (
              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                <Label htmlFor="preset">Wybierz zestaw</Label>
                <Select
                  id="preset"
                  value={presetId}
                  onChange={(event) => applyPreset(event.target.value)}
                  aria-describedby="preset-help"
                >
                  <option value="">— wybierz scenariusz —</option>
                  {PRESET_CASES.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </Select>
                <p id="preset-help" className="text-xs text-muted-foreground">
                  {findPresetCase(presetId)?.description ??
                    "Wybór zestawu od razu wypełnia formularz. Dane są poglądowe, wzorowane na zestawach ZUS."}
                </p>
              </div>
            )}

            {!isBirth && (
              <div className="space-y-2">
                <Label htmlFor="adoptionKind">Rodzaj przyjęcia dziecka</Label>
                <Select
                  id="adoptionKind"
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as CalculatorMode)
                  }
                >
                  <option value="ADOPTION">
                    Adopcja (do ukończenia 14 lat)
                  </option>
                  <option value="FOSTER_CARE">
                    Rodzina zastępcza niezawodowa (do 7 lat, do 10 przy
                    odroczeniu)
                  </option>
                </Select>
              </div>
            )}

            <fieldset className="space-y-3 rounded-lg border border-border/70 p-3">
              <legend className="px-1 text-sm font-medium">Dochody</legend>

              <div
                role="radiogroup"
                aria-label="Czyj dochód podajesz"
                className="grid gap-2 sm:grid-cols-2"
              >
                <ChoiceCard
                  name="incomeScope"
                  checked={incomeScope === "MOTHER"}
                  onSelect={() => setIncomeScope("MOTHER")}
                  title="Dochód tylko matki"
                  description="Drugi rodzic liczony z tej samej podstawy."
                />
                <ChoiceCard
                  name="incomeScope"
                  checked={incomeScope === "BOTH"}
                  onSelect={() => setIncomeScope("BOTH")}
                  title="Oboje rodzice (osobne dochody)"
                  description="Każde z rodziców z własnej podstawy."
                />
              </div>

              {monthlyBasis !== undefined && (
                <label className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                    checked={useImportedBasis}
                    onChange={(event) =>
                      setUseImportedBasis(event.target.checked)
                    }
                  />
                  <span>
                    <span className="font-medium">
                      {basisSource === "DOCUMENT"
                        ? calculatorCopy.documentBasisLabel
                        : "Użyj podstawy wymiaru z ZUS (symulacja)"}
                    </span>
                    <span
                      className="block text-xs text-muted-foreground"
                      data-testid="imported-basis"
                    >
                      {formatPln(monthlyBasis)} miesięcznie.{" "}
                      {basisSource === "DOCUMENT"
                        ? calculatorCopy.documentBasisHelp
                        : "Odznacz, aby wyliczyć podstawę z podanego wynagrodzenia."}
                    </span>
                  </span>
                </label>
              )}

              <div
                role="radiogroup"
                aria-label="Sposób podania podstawy"
                className="grid gap-2 sm:grid-cols-2"
              >
                <ChoiceCard
                  name="incomeMode"
                  checked={incomeMode === "SIMPLE"}
                  onSelect={() => setIncomeMode("SIMPLE")}
                  title="Uproszczony"
                  description="Jedna średnia kwota miesięczna brutto."
                />
                <ChoiceCard
                  name="incomeMode"
                  checked={incomeMode === "DETAILED"}
                  onSelect={() => setIncomeMode("DETAILED")}
                  title="Szczegółowy (12 miesięcy)"
                  description="Z wyłączeniem miesięcy z absencją i dopełnieniem."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {incomeMode === "SIMPLE" && (
                  <div className="space-y-2">
                    <Label htmlFor="income">
                      {incomeScope === "BOTH"
                        ? "Dochód brutto matki (zł/mies.)"
                        : "Miesięczny dochód brutto (zł)"}
                    </Label>
                    <Input
                      id="income"
                      type="number"
                      min={0}
                      step={100}
                      inputMode="decimal"
                      value={income}
                      onChange={(event) => setIncome(event.target.value)}
                      required
                    />
                  </div>
                )}
                {incomeScope === "BOTH" && (
                  <div className="space-y-2">
                    <Label htmlFor="secondIncome">
                      Dochód brutto drugiego rodzica (zł/mies.)
                    </Label>
                    <Input
                      id="secondIncome"
                      type="number"
                      min={0}
                      step={100}
                      inputMode="decimal"
                      value={secondIncome}
                      onChange={(event) => setSecondIncome(event.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="employmentType">Forma zatrudnienia</Label>
                  <Select
                    id="employmentType"
                    value={employmentType}
                    onChange={(event) =>
                      setEmploymentType(event.target.value as EmploymentType)
                    }
                  >
                    <option value="EMPLOYEE">
                      Pracownik (minimalna podstawa)
                    </option>
                    <option value="CONTRACTOR">Zleceniobiorca</option>
                    <option value="BUSINESS">Działalność gospodarcza</option>
                  </Select>
                </div>
              </div>

              {incomeMode === "DETAILED" && (
                <div className="space-y-2">
                  <p id="months-help" className="text-xs text-muted-foreground">
                    Zaznacz miesiące z absencją powyżej 50% czasu pracy —
                    zostaną wyłączone. Podanie kwoty dopełnienia zastępuje
                    wyłączenie (U art. 36, 38).
                  </p>
                  <ul aria-describedby="months-help" className="space-y-2">
                    {months.map((row, index) => (
                      <li
                        key={MONTH_LABELS[index]}
                        className="grid items-end gap-2 rounded-lg bg-secondary/40 p-2 sm:grid-cols-[1fr_auto_1fr]"
                      >
                        <div className="space-y-1">
                          <Label htmlFor={`month-${index}`} className="text-xs">
                            {MONTH_LABELS[index]} — brutto (zł)
                          </Label>
                          <Input
                            id={`month-${index}`}
                            type="number"
                            min={0}
                            step={100}
                            inputMode="decimal"
                            value={row.gross}
                            onChange={(event) =>
                              updateMonth(index, { gross: event.target.value })
                            }
                          />
                        </div>
                        <label
                          htmlFor={`absence-${index}`}
                          className="flex items-center gap-2 pb-2 text-xs"
                        >
                          <input
                            id={`absence-${index}`}
                            type="checkbox"
                            className="size-4 accent-[var(--primary)]"
                            checked={row.absence}
                            onChange={(event) =>
                              updateMonth(index, {
                                absence: event.target.checked,
                              })
                            }
                          />
                          Absencja &gt; 50%
                        </label>
                        <div className="space-y-1">
                          <Label
                            htmlFor={`supplement-${index}`}
                            className="text-xs"
                          >
                            Dopełnienie (zł)
                          </Label>
                          <Input
                            id={`supplement-${index}`}
                            type="number"
                            min={0}
                            step={100}
                            inputMode="decimal"
                            value={row.supplement}
                            disabled={!row.absence}
                            placeholder="opcjonalnie"
                            onChange={(event) =>
                              updateMonth(index, {
                                supplement: event.target.value,
                              })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="children">
                  {isBirth
                    ? "Dzieci z jednego porodu"
                    : "Dzieci przyjęte jednocześnie"}
                </Label>
                <Select
                  id="children"
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
              </div>

              {isBirth && (
                <div className="space-y-2">
                  <Label htmlFor="preBirth">
                    Tygodnie urlopu przed porodem
                  </Label>
                  <Select
                    id="preBirth"
                    value={preBirthWeeks}
                    onChange={(event) => setPreBirthWeeks(event.target.value)}
                  >
                    {preBirthOptions.map((weeks) => (
                      <option key={weeks} value={weeks}>
                        {weeks} tyg.
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="secondParent">
                  Tygodnie rodzicielskiego dla drugiego rodzica
                </Label>
                <Input
                  id="secondParent"
                  type="number"
                  min={0}
                  max={Math.max(...Object.values(ruleSet.parental.poolWeeks))}
                  step={1}
                  value={secondParentWeeks}
                  onChange={(event) => setSecondParentWeeks(event.target.value)}
                  aria-describedby="split-help"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherWeeks">
                  Tygodnie rodzicielskiego mamy
                </Label>
                <Input
                  id="motherWeeks"
                  type="number"
                  min={0}
                  max={Math.max(...Object.values(ruleSet.parental.poolWeeks))}
                  step={1}
                  value={motherWeeks}
                  placeholder="reszta puli"
                  onChange={(event) => setMotherWeeks(event.target.value)}
                  aria-describedby="split-help"
                />
              </div>
              <p
                id="split-help"
                className="text-xs text-muted-foreground sm:col-span-2"
              >
                Każde z rodziców ma {ruleSet.parental.nonTransferableWeeks}{" "}
                niezbywalnych tygodni. Drugi rodzic może wziąć więcej niż{" "}
                {ruleSet.parental.nonTransferableWeeks}, jeśli mama zrezygnuje z
                części swoich — wpisz wtedy jej tygodnie. Suma nie przekroczy
                puli {ruleSet.parental.poolWeeks.single}/
                {ruleSet.parental.poolWeeks.multiple}(
                {ruleSet.parental.poolWeeks.zaZyciemSingle}/
                {ruleSet.parental.poolWeeks.zaZyciemMultiple} z „Za życiem”).
              </p>

              {isBirth && (
                <div className="space-y-2">
                  <Label htmlFor="takeover">
                    Macierzyński przejęty przez ojca (tyg.)
                  </Label>
                  <Input
                    id="takeover"
                    type="number"
                    min={0}
                    max={
                      Math.max(
                        ...Object.values(ruleSet.maternity.weeksByChildren)
                      ) - ruleSet.maternity.motherPersonalWeeks
                    }
                    step={1}
                    value={takeoverWeeks}
                    onChange={(event) => setTakeoverWeeks(event.target.value)}
                    aria-describedby="takeover-help"
                  />
                  <p
                    id="takeover-help"
                    className="text-xs text-muted-foreground"
                  >
                    Maksymalnie wymiar macierzyńskiego minus{" "}
                    {ruleSet.maternity.motherPersonalWeeks} tygodni mamy.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paternity">Dni urlopu ojcowskiego</Label>
                <Select
                  id="paternity"
                  value={paternityDays}
                  onChange={(event) => setPaternityDays(event.target.value)}
                >
                  {paternityOptions.map((days) => (
                    <option key={days} value={days}>
                      {days} dni
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work">
                  Praca podczas urlopu rodzicielskiego
                </Label>
                <Select
                  id="work"
                  value={workFraction}
                  onChange={(event) => setWorkFraction(event.target.value)}
                >
                  {workOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {Number(workFraction) > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="workWeeks">Tygodnie łączone z pracą</Label>
                    <Input
                      id="workWeeks"
                      type="number"
                      min={0}
                      max={Math.max(
                        ...Object.values(ruleSet.parental.poolWeeks)
                      )}
                      step={1}
                      value={workCombinedWeeks}
                      placeholder="cały urlop mamy"
                      onChange={(event) =>
                        setWorkCombinedWeeks(event.target.value)
                      }
                    />
                  </div>
                  <label
                    htmlFor="combineExt"
                    className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm"
                  >
                    <input
                      id="combineExt"
                      type="checkbox"
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                      checked={combineInExtension}
                      onChange={(event) =>
                        setCombineInExtension(event.target.checked)
                      }
                    />
                    <span>
                      <span className="font-medium">
                        Praca także w przedłużeniu
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Wydłużenie wg wzoru z art. 182¹f KP, maks. 82/86 tyg.
                        (130/134 z „Za życiem”).
                      </span>
                    </span>
                  </label>
                </>
              )}
            </div>

            <details className="rounded-lg border border-border/70 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Sytuacja dziecka — opcje zaawansowane
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {isBirth ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="birthWeek">
                        Tydzień ciąży przy porodzie
                      </Label>
                      <Input
                        id="birthWeek"
                        type="number"
                        min={20}
                        max={44}
                        value={birthWeek}
                        placeholder="np. 27"
                        onChange={(event) => setBirthWeek(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthWeight">Masa urodzeniowa (g)</Label>
                      <Input
                        id="birthWeight"
                        type="number"
                        min={300}
                        max={6000}
                        value={birthWeight}
                        placeholder="np. 950"
                        onChange={(event) => setBirthWeight(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospitalWeeks">
                        Hospitalizacja noworodka (tyg.)
                      </Label>
                      <Input
                        id="hospitalWeeks"
                        type="number"
                        min={0}
                        max={60}
                        value={hospitalWeeks}
                        onChange={(event) =>
                          setHospitalWeeks(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hospitalDays">
                        Dni w szpitalu między 5. a 28. dniem życia
                      </Label>
                      <Input
                        id="hospitalDays"
                        type="number"
                        min={0}
                        max={24}
                        value={hospitalDays}
                        placeholder="dla porodu od 37. tyg."
                        onChange={(event) =>
                          setHospitalDays(event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialCase">
                        Sytuacje szczególne (utrata dziecka)
                      </Label>
                      <Select
                        id="specialCase"
                        value={specialCase}
                        onChange={(event) =>
                          setSpecialCase(event.target.value as SpecialCase)
                        }
                      >
                        <option value="STANDARD">
                          Brak — standardowy przebieg
                        </option>
                        <option value="STILLBIRTH">Martwe urodzenie</option>
                        <option value="CHILD_DEATH_BEFORE_8W">
                          Zgon dziecka przed 8. tygodniem życia
                        </option>
                        <option value="CHILD_DEATH_AFTER_8W">
                          Zgon dziecka po 8. tygodniu życia
                        </option>
                      </Select>
                    </div>
                    {(specialCase === "CHILD_DEATH_BEFORE_8W" ||
                      specialCase === "CHILD_DEATH_AFTER_8W") && (
                      <div className="space-y-2">
                        <Label htmlFor="deathDay">
                          Dzień życia dziecka w chwili zgonu
                        </Label>
                        <Input
                          id="deathDay"
                          type="number"
                          min={0}
                          value={deathDay}
                          onChange={(event) => setDeathDay(event.target.value)}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="childAge">
                        Wiek dziecka przy przyjęciu (lata)
                      </Label>
                      <Input
                        id="childAge"
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={childAge}
                        onChange={(event) => setChildAge(event.target.value)}
                        aria-describedby="age-help"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="childBirthDate">
                        Data urodzenia dziecka
                      </Label>
                      <Input
                        id="childBirthDate"
                        type="date"
                        value={childBirthDate}
                        onChange={(event) =>
                          setChildBirthDate(event.target.value)
                        }
                        aria-describedby="age-help"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placementDate">
                        Data przyjęcia na wychowanie
                      </Label>
                      <Input
                        id="placementDate"
                        type="date"
                        value={placementDate}
                        onChange={(event) =>
                          setPlacementDate(event.target.value)
                        }
                        aria-describedby="age-help"
                      />
                    </div>
                    <p
                      id="age-help"
                      className="text-xs text-muted-foreground sm:col-span-2"
                    >
                      Gdy podasz obie daty, wiek wyliczymy z nich. W przeciwnym
                      razie użyjemy wieku w latach.
                    </p>
                    <label
                      htmlFor="deferred"
                      className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm"
                    >
                      <input
                        id="deferred"
                        type="checkbox"
                        className="mt-0.5 size-4 accent-[var(--primary)]"
                        checked={deferredSchooling}
                        onChange={(event) =>
                          setDeferredSchooling(event.target.checked)
                        }
                      />
                      <span>
                        <span className="font-medium">
                          Odroczony obowiązek szkolny
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          Limit wieku 10 lat zamiast 7 (rodzina zastępcza).
                        </span>
                      </span>
                    </label>
                    {mode === "FOSTER_CARE" && (
                      <label
                        htmlFor="professional"
                        className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm"
                      >
                        <input
                          id="professional"
                          type="checkbox"
                          className="mt-0.5 size-4 accent-[var(--primary)]"
                          checked={professionalFoster}
                          onChange={(event) =>
                            setProfessionalFoster(event.target.checked)
                          }
                        />
                        <span>
                          <span className="font-medium">
                            Zawodowa rodzina zastępcza
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Zawodowe rodziny zastępcze nie nabywają tego
                            uprawnienia.
                          </span>
                        </span>
                      </label>
                    )}
                  </>
                )}
              </div>
            </details>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Wariant wypłaty</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <ChoiceCard
                  name="paymentOption"
                  checked={paymentOption === "STANDARD_100_70"}
                  onSelect={() => setPaymentOption("STANDARD_100_70")}
                  title={`${formatPercent(ruleSet.maternity.rate)} + ${formatPercent(ruleSet.parental.rate)}`}
                  description={`Macierzyński ${formatPercent(ruleSet.maternity.rate)}, rodzicielski ${formatPercent(ruleSet.parental.rate)}.`}
                />
                <ChoiceCard
                  name="paymentOption"
                  checked={paymentOption === "FLAT_81_5"}
                  onSelect={() => setPaymentOption("FLAT_81_5")}
                  title={formatPercent(ruleSet.parental.flatRate)}
                  description={`Wniosek w ciągu ${ruleSet.deadlines.flatRateApplicationDays} dni od porodu.`}
                />
              </div>
            </fieldset>

            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={hasZaZyciem}
                  onChange={(event) => setHasZaZyciem(event.target.checked)}
                />
                <span>
                  <span className="font-medium">Zaświadczenie „Za życiem”</span>
                  <span className="block text-xs text-muted-foreground">
                    Wydłuża pulę urlopu rodzicielskiego do{" "}
                    {ruleSet.parental.poolWeeks.zaZyciemSingle}/
                    {ruleSet.parental.poolWeeks.zaZyciemMultiple} tygodni.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--primary)]"
                  checked={save}
                  onChange={(event) => setSave(event.target.checked)}
                />
                <span>
                  <span className="font-medium">Zapisz wynik w bazie</span>
                  <span className="block text-xs text-muted-foreground">
                    Zapisuje wejście, wynik i wersję silnika do audytu.
                  </span>
                </span>
              </label>
            </div>

            <div aria-live="polite">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Nie udało się policzyć</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Calculator aria-hidden="true" />
              )}
              {pending ? "Liczę…" : "Oblicz świadczenie"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <div aria-live="polite" className="space-y-4">
        {!result ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                Tu pojawi się wynik
              </CardTitle>
              <CardDescription>
                Kliknij „Oblicz świadczenie”, aby zobaczyć kwotę, rozbicie na
                okresy, ostrzeżenia i ślad reguł.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Kalkulator nie zgaduje. Jeśli brakuje parametru zewnętrznego,
                wynik otrzyma status „Wymaga danych” zamiast wymyślonej kwoty.
              </p>
            </CardContent>
          </Card>
        ) : (
          <CalculationResultView data={result} />
        )}
      </div>
    </div>
  )
}

function ChoiceCard({
  name,
  checked,
  onSelect,
  title,
  description,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  title: string
  description: string
}): ReactNode {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border/70 hover:bg-muted/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        className="mt-0.5 size-4 accent-[var(--primary)]"
        checked={checked}
        onChange={onSelect}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}

function periodText(weeks: number, days: number): string {
  if (days <= 0) return "—"
  return weeks > 0 && weeks * 7 === days
    ? `${weeks} tyg. (${days} dni)`
    : weeks > 0
      ? `${weeks} tyg. ${days - weeks * 7} dni (${days} dni)`
      : `${days} dni`
}

function CalculationResultView({ data }: { data: ResponseBody }) {
  const result = data.result
  const isIndeterminate = result.status === "INDETERMINATE"
  const notEligible = result.status === "NOT_ELIGIBLE"

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet aria-hidden="true" className="size-4 text-primary" />
                Szacunek łączny
              </CardTitle>
              <CardDescription>
                Wersja silnika:{" "}
                <span className="font-mono">{data.engineVersion}</span> · zestaw
                reguł:{" "}
                <span className="font-mono">{result.ruleSetVersion}</span>
              </CardDescription>
            </div>
            <Badge
              variant={
                notEligible
                  ? "destructive"
                  : isIndeterminate
                    ? "warning"
                    : "success"
              }
            >
              {notEligible
                ? "Brak uprawnienia"
                : isIndeterminate
                  ? "Wymaga danych"
                  : "Wyliczone"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">
              {formatPln(result.totalGrosze)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Kwota brutto, przed zaliczką PIT.{" "}
              {result.verified
                ? "Parametry zweryfikowane."
                : "Wynik niezweryfikowany — sprawdź ostrzeżenia poniżej."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric
              label={
                result.mode === "BIRTH"
                  ? "Macierzyński"
                  : "Na warunkach macierzyńskiego"
              }
              value={`${result.maternityWeeks} tyg.`}
            />
            {result.mode === "BIRTH" ? (
              <Metric
                label="Po porodzie"
                value={`${result.postBirthWeeks} tyg.`}
              />
            ) : (
              <Metric
                label="Wiek dziecka"
                value={
                  result.ageAtPlacementYears === null
                    ? "—"
                    : `${result.ageAtPlacementYears.toFixed(1).replace(".", ",")} lat`
                }
              />
            )}
            {result.supplementaryWeeks > 0 && (
              <Metric
                label="Uzupełniający"
                value={`${result.supplementaryWeeks} tyg.`}
              />
            )}
            <Metric
              label="Pula rodzicielska"
              value={`${result.parentalPoolWeeks} tyg.`}
            />
            <Metric
              label="Dla drugiego rodzica"
              value={`${result.secondParentWeeks} tyg.`}
            />
            {result.extensionWeeks > 0 && (
              <Metric
                label="Przedłużenie"
                value={`${result.extensionWeeks} tyg. (limit ${result.extensionCapWeeks})`}
              />
            )}
            <Metric
              label="Podstawa mamy"
              value={formatPln(result.basisGrosze)}
            />
            <Metric
              label="Podstawa drugiego rodzica"
              value={formatPln(result.secondParentBasisGrosze)}
            />
          </dl>

          {data.calculationId && (
            <p className="text-xs text-muted-foreground">
              Zapisano jako{" "}
              <span className="font-mono">
                {data.calculationId.slice(0, 8)}…
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rozbicie na okresy</CardTitle>
          <CardDescription>
            Każda pozycja ma świadczeniobiorcę, rodzaj urlopu, stawkę i podstawę
            prawną.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableCaption className="sr-only">
              Rozbicie zasiłków na okresy, świadczeniobiorców i stawki
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Świadczeniobiorca</TableHead>
                <TableHead>Rodzaj urlopu</TableHead>
                <TableHead>Okres</TableHead>
                <TableHead>Stawka</TableHead>
                <TableHead className="pr-4 text-right">Kwota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.lines.map((line, index) => (
                <TableRow key={`${line.kind}-${index}`}>
                  <TableCell className="pl-4 font-medium whitespace-normal">
                    {line.beneficiary === "MOTHER"
                      ? "Mama"
                      : "Tata / drugi rodzic"}
                  </TableCell>
                  <TableCell className="max-w-[15rem] whitespace-normal">
                    <p className="font-medium">{line.leaveType}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.legalReference}
                    </p>
                    {line.minimumApplied && (
                      <p className="text-xs text-muted-foreground">
                        Podniesiono do 1 000 zł/mies. (U art. 31 ust. 3a)
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {periodText(line.weeks, line.days)}
                  </TableCell>
                  <TableCell>{formatPercent(line.rate)}</TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular-nums">
                    {formatPln(line.amountGrosze)}
                  </TableCell>
                </TableRow>
              ))}
              {result.lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="pl-4 text-muted-foreground">
                    Brak świadczeń do wyliczenia dla podanych danych.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale aria-hidden="true" className="size-4 text-primary" />
            Dlaczego tak?
          </CardTitle>
          <CardDescription>
            Ślad reguł — ten sam wynik można odtworzyć z zapisanego wejścia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {result.trace.map((step, index) => (
              <li key={`${step.ruleId}-${index}`} className="flex gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <div>
                  <p className="text-sm font-medium">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {step.ruleId}
                    </span>
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                    {step.detail}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.legalReference}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {result.warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Ważne zastrzeżenia</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {result.warnings.map((warning) => (
                <li key={warning} className="text-pretty">
                  {warning}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/os-czasu">
            Zaplanuj terminy
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dokumenty">Sprawdź dokumenty</Link>
        </Button>
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}
