"use client"

import Link from "next/link"
import { useEffect, useState, type FormEvent } from "react"
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

import type { CalculatorResult, PaymentOption } from "@zpr/domain"
import { importPrefillStorageSchema } from "@zpr/contracts/data-import"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
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
import { formatPln, formatPercent } from "@/lib/format"

type ResponseBody = {
  calculationId: string | null
  saved: boolean
  engineVersion: string
  result: CalculatorResult
  detail?: string
  issues?: Array<{ path: string; message: string }>
}

export function CalculatorForm() {
  const [income, setIncome] = useState("8000")
  const [children, setChildren] = useState("1")
  const [paymentOption, setPaymentOption] =
    useState<PaymentOption>("STANDARD_100_70")
  const [hasZaZyciem, setHasZaZyciem] = useState(false)
  const [preBirthWeeks, setPreBirthWeeks] = useState("2")
  const [secondParentWeeks, setSecondParentWeeks] = useState("9")
  const [workFraction, setWorkFraction] = useState("0")
  const [paternityDays, setPaternityDays] = useState("14")
  const [save, setSave] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResponseBody | null>(null)
  const [monthlyBasis, setMonthlyBasis] = useState<number | undefined>()
  const [useImportedBasis, setUseImportedBasis] = useState(true)
  const [importLoaded, setImportLoaded] = useState(false)

  useEffect(() => {
    const rawImport = window.sessionStorage.getItem("zpr:import-prefill")
    if (rawImport) {
      try {
        const parsed = importPrefillStorageSchema.safeParse(JSON.parse(rawImport))
        if (parsed.success) {
          const data = parsed.data.data
          if (data.grossMonthlyIncomePln !== undefined) {
            setIncome(String(data.grossMonthlyIncomePln))
          }
          if (data.childrenCount !== undefined) {
            setChildren(String(Math.min(5, Math.max(1, data.childrenCount))))
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

    const raw = window.sessionStorage.getItem("zpr:document-prefill")
    if (!raw) return
    window.sessionStorage.removeItem("zpr:document-prefill")
    try {
      const parsed = JSON.parse(raw) as { income?: string }
      if (parsed.income && Number.isFinite(Number(parsed.income))) {
        setIncome(parsed.income)
        setMonthlyBasis(undefined)
      }
    } catch {
      // Ignore a stale or malformed prefill.
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    try {
      const incomePln = Number(income)
      if (!Number.isFinite(incomePln) || incomePln < 0) {
        throw new Error("Podaj poprawny miesięczny dochód brutto.")
      }

      const response = await fetch("/api/v1/calculations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: {
            grossMonthlyIncomeGrosze: Math.round(incomePln * 100),
            monthlyBasisOverrideGrosze:
              useImportedBasis && monthlyBasis !== undefined
                ? monthlyBasis
                : undefined,
            childrenCount: Number(children),
            hasZaZyciem,
            paymentOption,
            maternityWeeksBeforeBirth: Number(preBirthWeeks),
            secondParentParentalWeeks: Number(secondParentWeeks),
            parentalWorkFraction: Number(workFraction),
            paternityDays: Number(paternityDays),
          },
          save,
        }),
      })

      const data = (await response.json()) as ResponseBody
      if (!response.ok) {
        const issue = data.issues?.[0]
        throw new Error(
          issue
            ? `${issue.path}: ${issue.message}`
            : data.detail ?? "Nie udało się wykonać obliczenia."
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

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator aria-hidden="true" className="size-4 text-primary" />
            Dane do wyliczenia
          </CardTitle>
          <CardDescription>
            Wynik zapisuje się z wersją silnika i pełnym wejściem. Kwoty są
            szacunkiem do czasu zatwierdzenia Q-29 i Q-15.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit} aria-busy={pending}>
          <CardContent className="space-y-5">
            {importLoaded && (
              <Alert variant="info">
                <Info aria-hidden="true" />
                <AlertTitle>Dane z symulowanych źródeł</AlertTitle>
                <AlertDescription>
                  Dochód i liczba dzieci pochodzą z zaakceptowanego raportu
                  pobrania. Możesz je zmienić — kalkulator nadal liczy
                  deterministycznie.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="income">Miesięczny dochód brutto (zł)</Label>
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
                        Użyj podstawy wymiaru z ZUS (symulacja)
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatPln(monthlyBasis)} miesięcznie. Odznacz, aby
                        wyliczyć podstawę z podanego wynagrodzenia.
                      </span>
                    </span>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="children">Dzieci z jednego porodu</Label>
                <Select
                  id="children"
                  value={children}
                  onChange={(event) => setChildren(event.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count === 5 ? "5 lub więcej" : count}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preBirth">Tygodnie urlopu przed porodem</Label>
                <Select
                  id="preBirth"
                  value={preBirthWeeks}
                  onChange={(event) => setPreBirthWeeks(event.target.value)}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {weeks} tyg.
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondParent">Tydzień dla drugiego rodzica</Label>
                <Select
                  id="secondParent"
                  value={secondParentWeeks}
                  onChange={(event) => setSecondParentWeeks(event.target.value)}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {weeks} tyg. (maks. 9)
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paternity">Dni urlopu ojcowskiego</Label>
                <Select
                  id="paternity"
                  value={paternityDays}
                  onChange={(event) => setPaternityDays(event.target.value)}
                >
                  {[0, 7, 14].map((days) => (
                    <option key={days} value={days}>
                      {days} dni
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work">Praca podczas urlopu rodzicielskiego</Label>
                <Select
                  id="work"
                  value={workFraction}
                  onChange={(event) => setWorkFraction(event.target.value)}
                >
                  <option value="0">Bez pracy</option>
                  <option value="0.25">¼ etatu</option>
                  <option value="0.5">½ etatu</option>
                </Select>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Wariant wypłaty</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <PaymentOptionCard
                  checked={paymentOption === "STANDARD_100_70"}
                  onSelect={() => setPaymentOption("STANDARD_100_70")}
                  title="100% + 70%"
                  description="Macierzyński 100%, rodzicielski 70%."
                />
                <PaymentOptionCard
                  checked={paymentOption === "FLAT_81_5"}
                  onSelect={() => setPaymentOption("FLAT_81_5")}
                  title="81,5%"
                  description="Wniosek w ciągu 21 dni od porodu."
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
                    Wydłuża pulę urlopu rodzicielskiego do 65/67 tygodni.
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
                <Info aria-hidden="true" className="size-4 text-muted-foreground" />
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

function PaymentOptionCard({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
        checked
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border/70 hover:bg-muted/40"
      }`}
    >
      <input
        type="radio"
        name="paymentOption"
        className="mt-0.5 size-4 accent-[var(--primary)]"
        checked={checked}
        onChange={onSelect}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function CalculationResultView({ data }: { data: ResponseBody }) {
  const result = data.result
  const isIndeterminate = result.status === "INDETERMINATE"

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
                <span className="font-mono">{data.engineVersion}</span>
              </CardDescription>
            </div>
            <Badge variant={isIndeterminate ? "warning" : "success"}>
              {isIndeterminate ? "Wymaga danych" : "Wyliczone"}
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
                : "Wynik niezweryfikowany — Q-29 i Q-15."}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Macierzyński" value={`${result.maternityWeeks} tyg.`} />
            <Metric label="Po porodzie" value={`${result.postBirthWeeks} tyg.`} />
            <Metric label="Pula rodzicielska" value={`${result.parentalPoolWeeks} tyg.`} />
            <Metric label="Dla drugiego rodzica" value={`${result.secondParentWeeks} tyg.`} />
            <Metric label="Podstawa miesięczna" value={formatPln(result.basisGrosze)} />
            <Metric label="Podstawa dzienna" value={formatPln(result.dailyBasisGrosze)} />
          </dl>

          {data.calculationId && (
            <p className="text-xs text-muted-foreground">
              Zapisano jako{" "}
              <span className="font-mono">{data.calculationId.slice(0, 8)}…</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rozbicie na okresy</CardTitle>
          <CardDescription>
            Każda pozycja ma stawkę i podstawę prawną.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Świadczenie</TableHead>
                <TableHead>Okres</TableHead>
                <TableHead>Stawka</TableHead>
                <TableHead className="text-right pr-4">Kwota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.lines.map((line) => (
                <TableRow key={line.label}>
                  <TableCell className="max-w-[16rem] pl-4 whitespace-normal">
                    <p className="font-medium">{line.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.legalReference}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {line.weeks > 0 ? `${line.weeks} tyg.` : `${line.days} dni`}
                  </TableCell>
                  <TableCell>{formatPercent(line.rate)}</TableCell>
                  <TableCell className="pr-4 text-right font-medium tabular-nums">
                    {formatPln(line.amountGrosze)}
                  </TableCell>
                </TableRow>
              ))}
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
            {result.trace.map((step) => (
              <li key={step.ruleId} className="flex gap-3">
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
