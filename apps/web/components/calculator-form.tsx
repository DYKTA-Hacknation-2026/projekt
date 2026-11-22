"use client"

import { useEffect, useState } from "react"
import { Calculator, Info, Sparkles } from "lucide-react"

import type { CalculatorInput, RuleSet } from "@zpr/domain"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"

import {
  readCalculatorPrefill,
  type CalculatorPrefill,
} from "@/lib/calculator-prefill"
import { formatPln } from "@/lib/format"

import { AdvancedCalculator } from "./calculator/calculator-advanced-form"
import { QuickCalculator } from "./calculator/quick-calculator"

type CalculatorMode = "QUICK" | "ADVANCED"

function withDefaults(partial: Partial<CalculatorInput>): CalculatorInput {
  return {
    grossMonthlyIncomeGrosze: 0,
    childrenCount: 1,
    hasZaZyciem: false,
    paymentOption: "STANDARD_100_70",
    maternityWeeksBeforeBirth: 2,
    secondParentParentalWeeks: 9,
    parentalWorkFraction: 0,
    paternityDays: 14,
    mode: "BIRTH",
    employmentType: "EMPLOYEE",
    motherEmploymentType: "EMPLOYEE",
    fatherEmploymentType: "EMPLOYEE",
    motherEnabled: true,
    fatherEnabled: true,
    motherSicknessInsurance: "COMPULSORY",
    fatherSicknessInsurance: "COMPULSORY",
    incomeMode: "SIMPLE",
    ...partial,
  }
}

export function CalculatorForm({ ruleSet }: { ruleSet: RuleSet }) {
  const [mode, setMode] = useState<CalculatorMode>("QUICK")
  const [prefill, setPrefill] = useState<CalculatorPrefill | null>(null)
  const [initialInput, setInitialInput] = useState<CalculatorInput | null>(null)

  useEffect(() => {
    const loaded = readCalculatorPrefill(window.sessionStorage)
    if (loaded) {
      setPrefill(loaded)
      setInitialInput(withDefaults(loaded.input))
      // A payer's basis (Z-3/Z-3a) is a detailed parameter: open the advanced
      // view so the user can review the override and the rest of the evidence.
      if (
        loaded.source === "DOCUMENT" ||
        loaded.input.monthlyBasisOverrideGrosze !== undefined ||
        loaded.input.knownBasisGrosze !== undefined
      ) {
        setMode("ADVANCED")
      }
    }
    // Read once: the handoff keys are cleared by the reader.
  }, [])

  function openAdvanced(input: CalculatorInput) {
    setInitialInput(input)
    setMode("ADVANCED")
  }

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Tryb kalkulatora"
        className="grid gap-2 sm:grid-cols-2"
      >
        <button
          type="button"
          aria-pressed={mode === "QUICK"}
          onClick={() => setMode("QUICK")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            mode === "QUICK"
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : "border-border/70 hover:bg-muted/40"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            Szybkie wyliczenie
          </span>
          <span className="mt-1 block text-xs text-pretty text-muted-foreground">
            Cztery proste kroki. Nie musisz znać pojęć ani numerów dokumentów.
            Domyślny tryb dla większości rodziców.
          </span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "ADVANCED"}
          onClick={() => setMode("ADVANCED")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            mode === "ADVANCED"
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : "border-border/70 hover:bg-muted/40"
          )}
        >
          <span className="flex items-center gap-2 font-medium">
            <Calculator aria-hidden="true" className="size-4 text-primary" />
            Zaawansowane wyliczenie
          </span>
          <span className="mt-1 block text-xs text-pretty text-muted-foreground">
            Pełny zestaw parametrów: historia 12 miesięcy, Z-3/Z-3a,
            ubezpieczenie, płatnik, zaległości i szczegółowy podział urlopów.
          </span>
        </button>
      </div>

      {prefill && (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertTitle>
            {prefill.source === "DOCUMENT"
              ? "Dane z potwierdzonego dokumentu"
              : prefill.source === "ONBOARDING"
                ? "Dane z kreatora"
                : prefill.source === "IMPORT"
                  ? "Dane z raportu pobrania"
                  : "Dane z poprzedniego trybu kalkulatora"}
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {prefill.notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
              {prefill.source === "DOCUMENT" &&
                prefill.input.monthlyBasisOverrideGrosze !== undefined && (
                  <li>
                    Podstawa wymiaru z dokumentu:{" "}
                    <strong>
                      {formatPln(prefill.input.monthlyBasisOverrideGrosze)}
                    </strong>{" "}
                    miesięcznie. Nie potrącamy z niej składek ponownie.
                  </li>
                )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {mode === "QUICK" ? (
        <QuickCalculator
          ruleSet={ruleSet}
          initialInput={initialInput}
          prefillNotices={prefill?.notices ?? []}
          onAdvanced={openAdvanced}
        />
      ) : (
        <AdvancedCalculator
          ruleSet={ruleSet}
          initialInput={initialInput}
          initialBasisSource={
            prefill?.source === "DOCUMENT" ? "DOCUMENT" : "IMPORT"
          }
          onBackToQuick={() => setMode("QUICK")}
        />
      )}
    </div>
  )
}

export default CalculatorForm
