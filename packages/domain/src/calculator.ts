import { averageMonthlyIncome, basisFromGross, minimumBasis } from "./basis"
import {
  ADOPTION_MAX_AGE_YEARS,
  CONTRIBUTION_DEDUCTION,
  DAYS_PER_YEAR,
  FLAT_RATE,
  FOSTER_MAX_AGE_DEFERRED_YEARS,
  FOSTER_MAX_AGE_YEARS,
  GUARANTEED_MATERNITY_WEEKS,
  GUARANTEED_PARENTAL_WEEKS,
  GUARANTEED_PARENTAL_WEEKS_ZA_ZYCIEM,
  LATE_DEATH_BENEFIT_DAYS,
  LOSS_MATERNITY_WEEKS,
  LOSS_MIN_DAYS_AFTER_DEATH,
  MATERNITY_MIN_MOTHER_WEEKS,
  MATERNITY_RATE,
  MATERNITY_WEEKS_BY_CHILDREN,
  PARENTAL_BENEFIT_FLOOR_GROSZE,
  PARENTAL_NON_TRANSFERABLE_WEEKS,
  PARENTAL_POOL_WEEKS,
  PARENTAL_RATE,
  PARENTAL_TOTAL_CAP_WEEKS,
} from "./constants"
import { addYears, daysBetween, parseIsoDate } from "./calculator-dates"
import { dailyBasis, daysAmount } from "./money"

import type {
  CalculationLine,
  CalculationTraceStep,
  CalculatorInput,
  CalculatorMode,
  CalculatorResult,
  EmploymentType,
  SpecialCase,
} from "./types"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function finite(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback
}

function optionalNonNegative(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(0, value)
    : undefined
}

function normalizeInput(input: CalculatorInput): CalculatorInput {
  return {
    ...input,
    mode: input.mode ?? "BIRTH",
    specialCase: input.specialCase ?? "STANDARD",
    grossMonthlyIncomeGrosze: Math.max(
      0,
      Math.round(finite(input.grossMonthlyIncomeGrosze))
    ),
    secondParentMonthlyIncomeGrosze:
      input.secondParentMonthlyIncomeGrosze === undefined
        ? undefined
        : Math.max(0, Math.round(finite(input.secondParentMonthlyIncomeGrosze))),
    childrenCount: clamp(Math.round(finite(input.childrenCount, 1)), 1, 5),
    maternityWeeksBeforeBirth: clamp(
      Math.round(finite(input.maternityWeeksBeforeBirth)),
      0,
      6
    ),
    secondParentParentalWeeks: Math.max(
      0,
      Math.round(finite(input.secondParentParentalWeeks))
    ),
    parentalWorkFraction: clamp(finite(input.parentalWorkFraction), 0, 0.5),
    paternityDays: clamp(Math.round(finite(input.paternityDays)), 0, 14),
    fatherMaternityTakeoverWeeks: Math.max(
      0,
      Math.round(finite(input.fatherMaternityTakeoverWeeks))
    ),
    childHospitalWeeks: optionalNonNegative(input.childHospitalWeeks),
    employmentFraction: clamp(finite(input.employmentFraction, 1), 0.1, 1),
  }
}

interface ResolvedBasis {
  grossGrosze: number
  basisGrosze: number
  minimumApplied: boolean
}

function resolveBasis(
  grossGrosze: number,
  employmentType: EmploymentType,
  employmentFraction: number
): ResolvedBasis {
  let basis = basisFromGross(grossGrosze)
  let minimumApplied = false
  if (employmentType === "EMPLOYEE" && grossGrosze > 0) {
    const min = minimumBasis(employmentFraction)
    if (basis < min) {
      basis = min
      minimumApplied = true
    }
  }
  return { grossGrosze, basisGrosze: basis, minimumApplied }
}

interface AgeCheck {
  ageYears: number | null
  remainingWeeks: number | null
  overLimit: boolean
}

function checkChildAge(
  input: CalculatorInput,
  limitYears: number
): AgeCheck {
  const birth = parseIsoDate(input.childBirthDate)
  const placement = parseIsoDate(input.placementDate)

  if (birth !== null && placement !== null) {
    const remainingDays = daysBetween(placement, addYears(birth, limitYears))
    return {
      ageYears: Math.max(0, daysBetween(birth, placement) / DAYS_PER_YEAR),
      remainingWeeks: Math.max(0, Math.floor(remainingDays / 7)),
      overLimit: remainingDays <= 0,
    }
  }

  if (input.childAgeYears !== undefined && Number.isFinite(input.childAgeYears)) {
    const age = Math.max(0, input.childAgeYears)
    return {
      ageYears: age,
      remainingWeeks: Math.max(
        0,
        Math.floor(((limitYears - age) * DAYS_PER_YEAR) / 7)
      ),
      overLimit: age >= limitYears,
    }
  }

  return { ageYears: null, remainingWeeks: null, overLimit: false }
}

/** KP art. 180² — supplementary maternity leave cap for premature / ill newborns. */
function supplementaryCap(
  week: number | undefined,
  weightGrams: number | undefined
): { cap: number; category: "A" | "B" | "C" } | null {
  if ((week !== undefined && week < 28) || (weightGrams !== undefined && weightGrams <= 1000)) {
    return { cap: 15, category: "A" }
  }
  if (week !== undefined && week < 37) return { cap: 8, category: "B" }
  if (week !== undefined) return { cap: 8, category: "C" }
  return null
}

function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`.replace(".", ",")
}

/**
 * Deterministic, explainable benefit calculation.
 *
 * It intentionally returns `verified: false`: the minimum-wage and
 * świadczenie rodzicielskie values (Q-29) and the final rounding policy
 * (Q-15) are not yet formally approved.
 */
export function calculateBenefits(input: CalculatorInput): CalculatorResult {
  const n = normalizeInput(input)
  const mode: CalculatorMode = n.mode ?? "BIRTH"
  const specialCase: SpecialCase = n.specialCase ?? "STANDARD"
  const children = n.childrenCount
  const flat = n.paymentOption === "FLAT_81_5"
  const maternityRate = flat ? FLAT_RATE : MATERNITY_RATE
  const parentalRate = flat ? FLAT_RATE : PARENTAL_RATE
  const warnings: string[] = []
  const trace: CalculationTraceStep[] = []
  const isBirth = mode === "BIRTH"
  const employmentType = n.employmentType ?? "EMPLOYEE"
  const employmentFraction = n.employmentFraction ?? 1

  // ---- Basis (FR-CALC-05) ----
  let motherGross = n.grossMonthlyIncomeGrosze
  const detailed =
    n.incomeMode === "DETAILED" && (n.monthlyIncomes?.length ?? 0) > 0
  if (detailed) {
    const average = averageMonthlyIncome(n.monthlyIncomes ?? [])
    motherGross = average.averageGrosze
    trace.push({
      ruleId: "LR-113",
      label: `Podstawa z ${average.usedMonths} mies. (tryb szczegółowy)`,
      detail: `Wyłączono ${average.excludedMonths} mies. z absencją powyżej 50% czasu pracy, uzupełniono (dopełnienie) ${average.supplementedMonths} mies. Średnia brutto: ${motherGross / 100} zł.`,
      legalReference: "U art. 36, 38",
    })
    if (average.usedMonths === 0) {
      warnings.push(
        "Wszystkie miesiące wyłączono z obliczeń — brak danych do ustalenia podstawy wymiaru."
      )
    }
  }
  const mother = resolveBasis(motherGross, employmentType, employmentFraction)
  const secondGross = n.secondParentMonthlyIncomeGrosze ?? motherGross
  const second =
    n.secondParentMonthlyIncomeGrosze === undefined
      ? mother
      : resolveBasis(secondGross, employmentType, employmentFraction)
  const basisGrosze = mother.basisGrosze
  const secondBasisGrosze = second.basisGrosze
  if (n.secondParentMonthlyIncomeGrosze === undefined) {
    warnings.push(
      "Nie podano osobnego dochodu drugiego rodzica — jego zasiłek policzono z podstawy mamy."
    )
  }
  if (mother.minimumApplied || (second !== mother && second.minimumApplied)) {
    trace.push({
      ruleId: "LR-180",
      label: "Zastosowano minimalną podstawę wymiaru",
      detail: `Dla pracownika podstawa nie może być niższa niż minimalne wynagrodzenie × (1 − 13,71%) = ${minimumBasis(employmentFraction) / 100} zł.`,
      legalReference: "U art. 36 ust. 1; Q-29",
    })
  }

  // ---- Eligibility, age limits and guarantee (FR-CALC-04) ----
  let eligible = true
  let guaranteeApplied = false
  let ageYears: number | null = null
  const baseMaternity = MATERNITY_WEEKS_BY_CHILDREN[children] ?? 37
  const standardPool: number = n.hasZaZyciem
    ? children > 1
      ? PARENTAL_POOL_WEEKS.zaZyciemMultiple
      : PARENTAL_POOL_WEEKS.zaZyciemSingle
    : children > 1
      ? PARENTAL_POOL_WEEKS.multiple
      : PARENTAL_POOL_WEEKS.single

  let maternityWeeks = baseMaternity
  let parentalPoolWeeks = standardPool

  if (mode === "FOSTER_CARE" && n.isProfessionalFosterFamily) {
    eligible = false
    warnings.push(
      "Zawodowe rodziny zastępcze są wyłączone z prawa do urlopu na warunkach macierzyńskiego i rodzicielskiego (KP art. 183 §1). Zasiłek przysługuje wyłącznie rodzinie zastępczej niezawodowej."
    )
    trace.push({
      ruleId: "LR-142",
      label: "Wykluczenie zawodowej rodziny zastępczej",
      detail:
        "Uprawnienie dotyczy przyjęcia dziecka na wychowanie przez rodzinę zastępczą niezawodową; zawodowa rodzina zastępcza go nie nabywa.",
      legalReference: "KP art. 183 §1",
    })
  }

  if (!isBirth && eligible) {
    const limitYears =
      mode === "ADOPTION"
        ? ADOPTION_MAX_AGE_YEARS
        : n.isDeferredSchooling
          ? FOSTER_MAX_AGE_DEFERRED_YEARS
          : FOSTER_MAX_AGE_YEARS
    const age = checkChildAge(n, limitYears)
    ageYears = age.ageYears
    const limitText =
      mode === "ADOPTION"
        ? "14. roku życia (adopcja)"
        : n.isDeferredSchooling
          ? "10. roku życia (rodzina zastępcza, odroczony obowiązek szkolny)"
          : "7. roku życia (rodzina zastępcza)"

    if (age.ageYears === null || age.remainingWeeks === null) {
      warnings.push(
        "Nie podano wieku dziecka ani dat — nie sprawdzono limitu wieku ani gwarancji minimalnej."
      )
    } else if (age.overLimit) {
      eligible = false
      warnings.push(
        `Dziecko przekracza limit wieku: urlop przysługuje do ukończenia ${limitText}.`
      )
      trace.push({
        ruleId: "LR-140",
        label: "Przekroczony limit wieku dziecka",
        detail: `Wiek dziecka przy przyjęciu: ${age.ageYears.toFixed(1).replace(".", ",")} lat; limit: ${limitText}.`,
        legalReference: "KP art. 183 §1",
      })
    } else {
      trace.push({
        ruleId: "LR-140",
        label: `Limit wieku: do ukończenia ${limitText}`,
        detail: `Wiek dziecka przy przyjęciu: ${age.ageYears.toFixed(1).replace(".", ",")} lat; do granicy wieku pozostało ok. ${age.remainingWeeks} tyg.`,
        legalReference: "KP art. 183 §1",
      })
      if (age.remainingWeeks < baseMaternity + standardPool) {
        guaranteeApplied = true
        maternityWeeks = clamp(
          age.remainingWeeks,
          GUARANTEED_MATERNITY_WEEKS,
          baseMaternity
        )
        const guaranteedPool = n.hasZaZyciem
          ? GUARANTEED_PARENTAL_WEEKS_ZA_ZYCIEM
          : GUARANTEED_PARENTAL_WEEKS
        parentalPoolWeeks = Math.max(
          guaranteedPool,
          Math.min(standardPool, age.remainingWeeks - maternityWeeks)
        )
        trace.push({
          ruleId: "LR-141",
          label: `Gwarancja minimalna: ${maternityWeeks} tyg. + ${parentalPoolWeeks} tyg.`,
          detail: `Standardowy wymiar (${baseMaternity} + ${standardPool} tyg.) nie mieści się przed granicą wieku, więc przysługuje co najmniej ${GUARANTEED_MATERNITY_WEEKS} tyg. urlopu na warunkach macierzyńskiego i ${guaranteedPool} tyg. rodzicielskiego.`,
          legalReference: "KP art. 183 §3",
        })
      }
    }
  }

  // ---- Loss of the child (art. 180¹) ----
  const isLoss = isBirth && specialCase !== "STANDARD"
  const earlyLoss =
    isLoss &&
    (specialCase === "STILLBIRTH" || specialCase === "CHILD_DEATH_BEFORE_8W")
  const lateLoss = isLoss && specialCase === "CHILD_DEATH_AFTER_8W"
  let maternityDays = 0

  if (earlyLoss) {
    const deathDay =
      specialCase === "STILLBIRTH" ? 0 : Math.max(0, Math.round(finite(n.childDeathDay)))
    maternityDays = Math.max(
      LOSS_MATERNITY_WEEKS * 7,
      deathDay + LOSS_MIN_DAYS_AFTER_DEATH
    )
    maternityWeeks = Math.floor(maternityDays / 7)
    parentalPoolWeeks = 0
    trace.push({
      ruleId: "LR-161",
      label: "Utrata dziecka: macierzyński 8 tygodni",
      detail: `Martwe urodzenie lub zgon przed ukończeniem 8. tygodnia życia: wymiar wynosi ${LOSS_MATERNITY_WEEKS} tyg., ale nie krócej niż ${LOSS_MIN_DAYS_AFTER_DEATH} dni od zgonu (${maternityDays} dni). Urlop rodzicielski nie przysługuje.`,
      legalReference: "KP art. 180¹",
    })
  } else if (lateLoss) {
    maternityWeeks = 0
    parentalPoolWeeks = 0
    maternityDays = LATE_DEATH_BENEFIT_DAYS
    trace.push({
      ruleId: "LR-161",
      label: "Zgon dziecka po 8. tygodniu życia",
      detail: `Zasiłek przysługuje przez ${LATE_DEATH_BENEFIT_DAYS} dni od dnia zgonu. Okres sprzed zgonu rozlicza się osobno.`,
      legalReference: "KP art. 180¹",
    })
  } else {
    maternityDays = maternityWeeks * 7
  }

  if (!eligible) {
    maternityWeeks = 0
    maternityDays = 0
    parentalPoolWeeks = 0
  }

  const preBirthWeeks = isBirth && !isLoss ? n.maternityWeeksBeforeBirth : 0
  const postBirthWeeks = Math.max(0, maternityWeeks - preBirthWeeks)

  // ---- Father takeover of maternity leave (art. 180 §4) ----
  const canTakeover = eligible && !isLoss && maternityWeeks > 0
  const takeoverMax = Math.max(0, maternityWeeks - MATERNITY_MIN_MOTHER_WEEKS)
  const takeoverWeeks = canTakeover
    ? Math.min(n.fatherMaternityTakeoverWeeks ?? 0, takeoverMax)
    : 0
  if (canTakeover && (n.fatherMaternityTakeoverWeeks ?? 0) > takeoverMax) {
    warnings.push(
      `Ojciec może przejąć najwyżej ${takeoverMax} tyg. urlopu macierzyńskiego (matka musi wykorzystać co najmniej ${MATERNITY_MIN_MOTHER_WEEKS} tyg.). Ograniczono do ${takeoverMax}.`
    )
  }
  const motherMaternityWeeks = maternityWeeks - takeoverWeeks
  if (takeoverWeeks > 0) {
    trace.push({
      ruleId: "LR-151",
      label: `Ojciec przejmuje ${takeoverWeeks} tyg. urlopu macierzyńskiego`,
      detail: `Matka rezygnuje z reszty urlopu po co najmniej ${MATERNITY_MIN_MOTHER_WEEKS} tygodniach. Zasiłek ojca: 100% jego podstawy.`,
      legalReference: "KP art. 180 §4; U art. 31 ust. 1",
    })
  }

  // ---- Parental pool split (flexible, FR-CALC-03) ----
  let secondParentWeeks = clamp(n.secondParentParentalWeeks, 0, parentalPoolWeeks)
  let motherParentalWeeks: number
  if (n.motherParentalWeeks === undefined) {
    secondParentWeeks = Math.min(
      secondParentWeeks,
      PARENTAL_NON_TRANSFERABLE_WEEKS
    )
    motherParentalWeeks = Math.min(
      Math.max(0, parentalPoolWeeks - PARENTAL_NON_TRANSFERABLE_WEEKS),
      parentalPoolWeeks - secondParentWeeks
    )
  } else {
    motherParentalWeeks = clamp(
      Math.round(finite(n.motherParentalWeeks)),
      0,
      parentalPoolWeeks
    )
    if (secondParentWeeks > parentalPoolWeeks - motherParentalWeeks) {
      secondParentWeeks = parentalPoolWeeks - motherParentalWeeks
      warnings.push(
        `Suma tygodni obojga rodziców nie może przekroczyć puli (${parentalPoolWeeks} tyg.). Zmniejszono wymiar drugiego rodzica do ${secondParentWeeks} tyg.`
      )
    }
    if (
      parentalPoolWeeks > 0 &&
      motherParentalWeeks < PARENTAL_NON_TRANSFERABLE_WEEKS
    ) {
      warnings.push(
        `Mama rezygnuje z części niezbywalnych ${PARENTAL_NON_TRANSFERABLE_WEEKS} tygodni urlopu rodzicielskiego (zostaje ${motherParentalWeeks} tyg.) — druga strona może je wykorzystać tylko po złożeniu odpowiedniego oświadczenia.`
      )
    }
  }
  const secondNonTransferable = Math.min(
    secondParentWeeks,
    PARENTAL_NON_TRANSFERABLE_WEEKS
  )
  const secondShared = secondParentWeeks - secondNonTransferable

  // ---- Work combination and extension (FR-CALC-02) ----
  const fraction = n.parentalWorkFraction
  const combinedWeeks =
    fraction > 0
      ? clamp(
          Math.round(finite(n.workCombinedWeeks, motherParentalWeeks)),
          0,
          motherParentalWeeks
        )
      : 0
  const extensionCapWeeks = n.hasZaZyciem
    ? children > 1
      ? PARENTAL_TOTAL_CAP_WEEKS.zaZyciemMultiple
      : PARENTAL_TOTAL_CAP_WEEKS.zaZyciemSingle
    : children > 1
      ? PARENTAL_TOTAL_CAP_WEEKS.multiple
      : PARENTAL_TOTAL_CAP_WEEKS.single
  const combineInExtension = Boolean(n.combineWorkInExtension)
  let extensionWeeks = 0
  if (combinedWeeks > 0 && parentalPoolWeeks > 0) {
    const wanted = combineInExtension
      ? Math.floor(combinedWeeks / (1 - fraction) + 1e-9) - combinedWeeks
      : Math.round(combinedWeeks * fraction)
    const allowed = Math.max(0, extensionCapWeeks - parentalPoolWeeks)
    extensionWeeks = Math.min(wanted, allowed)
    if (wanted > allowed) {
      warnings.push(
        `Łączny wymiar urlopu rodzicielskiego z przedłużeniem nie może przekroczyć ${extensionCapWeeks} tyg. Przedłużenie ograniczono z ${wanted} do ${allowed} tyg.`
      )
    }
    trace.push({
      ruleId: "LR-170",
      label: `Przedłużenie urlopu rodzicielskiego: ${extensionWeeks} tyg.`,
      detail: combineInExtension
        ? `Praca łączona także w przedłużeniu: ⌊${combinedWeeks} / (1 − ${fraction})⌋ − ${combinedWeeks} = ${wanted} tyg. Limit łączny: ${extensionCapWeeks} tyg. Zasiłek za okres łączony = stawka × podstawa × (1 − ${fraction}).`
        : `Przedłużenie proporcjonalne do wymiaru czasu pracy: ${combinedWeeks} × ${fraction} ≈ ${wanted} tyg. Zasiłek za okres łączony = stawka × podstawa × (1 − ${fraction}).`,
      legalReference: "KP art. 182¹f; U art. 31 ust. 4a",
    })
  }

  // ---- Supplementary maternity (art. 180²) ----
  let supplementaryWeeks = 0
  if (eligible && isBirth && !isLoss) {
    const hospital = Math.round(n.childHospitalWeeks ?? 0)
    if (hospital > 0) {
      const category = supplementaryCap(n.birthWeekOfPregnancy, n.birthWeightGrams)
      if (!category) {
        warnings.push(
          "Podaj tydzień ciąży lub masę urodzeniową, aby ustalić uzupełniający urlop macierzyński."
        )
      } else if (
        category.category === "C" &&
        n.childHospitalDaysDay5To28 !== undefined &&
        n.childHospitalDaysDay5To28 < 2
      ) {
        warnings.push(
          "Dziecko urodzone o czasie wymaga co najmniej 2 dni hospitalizacji między 5. a 28. dniem życia — uzupełniający urlop nie przysługuje."
        )
      } else {
        supplementaryWeeks = Math.min(hospital, category.cap)
        if (
          category.category === "C" &&
          n.childHospitalDaysDay5To28 === undefined
        ) {
          warnings.push(
            "Uzupełniający urlop dla dziecka urodzonego o czasie wymaga potwierdzenia min. 2 dni hospitalizacji między 5. a 28. dniem życia."
          )
        }
        trace.push({
          ruleId: "LR-160",
          label: `Uzupełniający urlop macierzyński: ${supplementaryWeeks} tyg.`,
          detail: `Hospitalizacja ${hospital} tyg. (tydzień za tydzień), limit ${category.cap} tyg. (${
            category.category === "A"
              ? "poród przed 28. tygodniem lub masa ≤ 1000 g"
              : category.category === "B"
                ? "poród w 28.–37. tygodniu"
                : "poród od 37. tygodnia z hospitalizacją"
          }). Płatny 100% podstawy, bezpośrednio po urlopie macierzyńskim.`,
          legalReference: "KP art. 180²; U art. 31 ust. 1",
        })
      }
    }
  }

  // ---- Lines ----
  const lines: CalculationLine[] = []
  const minimumNotes = { applied: false }

  function pushLine(
    line: Omit<CalculationLine, "amountGrosze" | "minimumApplied" | "days"> & {
      days?: number
      reduction?: number
      basis: number
    }
  ): void {
    const days = line.days ?? line.weeks * 7
    if (days <= 0) return
    const reduction = line.reduction ?? 1
    let amount = daysAmount(line.basis, line.rate * reduction, days)
    let minimumApplied = false
    if (reduction === 1) {
      const floor = Math.round((PARENTAL_BENEFIT_FLOOR_GROSZE * days) / 30)
      if (amount < floor) {
        amount = floor
        minimumApplied = true
        minimumNotes.applied = true
      }
    }
    const { basis: _basis, reduction: _reduction, days: _days, ...rest } = line
    void _basis
    void _reduction
    void _days
    lines.push({ ...rest, days, amountGrosze: amount, minimumApplied })
  }

  if (lateLoss) {
    pushLine({
      kind: "LOSS_OF_CHILD",
      beneficiary: "MOTHER",
      leaveType: "Zasiłek po zgonie dziecka",
      label: "Zasiłek po zgonie dziecka (7 dni od zgonu)",
      weeks: 0,
      days: maternityDays,
      rate: MATERNITY_RATE,
      basis: basisGrosze,
      legalReference: "KP art. 180¹; U art. 31 ust. 1",
    })
  } else {
    const maternityLabel = isBirth
      ? earlyLoss
        ? "Urlop macierzyński po utracie dziecka (8 tygodni)"
        : "Zasiłek macierzyński (urlop macierzyński)"
      : guaranteeApplied
        ? "Urlop na warunkach macierzyńskiego (gwarancja minimalna)"
        : "Urlop na warunkach urlopu macierzyńskiego"
    const motherMaternityDays =
      earlyLoss ? maternityDays : motherMaternityWeeks * 7
    pushLine({
      kind: earlyLoss ? "LOSS_OF_CHILD" : "MATERNITY",
      beneficiary: "MOTHER",
      leaveType: isBirth
        ? earlyLoss
          ? "Macierzyński po utracie dziecka"
          : "Urlop macierzyński"
        : "Urlop na warunkach macierzyńskiego",
      label: maternityLabel,
      weeks: Math.floor(motherMaternityDays / 7),
      days: motherMaternityDays,
      rate: maternityRate,
      basis: basisGrosze,
      legalReference: isBirth
        ? earlyLoss
          ? "KP art. 180¹; U art. 31 ust. 1"
          : "KP art. 180 §1; U art. 31 ust. 1"
        : "KP art. 183 §1; U art. 30a, 31 ust. 1",
    })
  }

  pushLine({
    kind: "MATERNITY_SUPPLEMENTARY",
    beneficiary: "MOTHER",
    leaveType: "Uzupełniający urlop macierzyński",
    label: "Uzupełniający urlop macierzyński (hospitalizacja dziecka)",
    weeks: supplementaryWeeks,
    rate: MATERNITY_RATE,
    basis: basisGrosze,
    legalReference: "KP art. 180²; U art. 31 ust. 1",
  })

  pushLine({
    kind: "MATERNITY_TAKEOVER",
    beneficiary: "SECOND_PARENT",
    leaveType: "Przejęty urlop macierzyński",
    label: "Urlop macierzyński przejęty przez ojca",
    weeks: takeoverWeeks,
    rate: MATERNITY_RATE,
    basis: secondBasisGrosze,
    legalReference: "KP art. 180 §4; U art. 31 ust. 1",
  })

  const fullMotherParental = motherParentalWeeks - combinedWeeks
  pushLine({
    kind: "PARENTAL",
    beneficiary: "MOTHER",
    leaveType: "Urlop rodzicielski",
    label: "Zasiłek macierzyński (urlop rodzicielski mamy)",
    weeks: fullMotherParental,
    rate: parentalRate,
    basis: basisGrosze,
    legalReference: "KP art. 182¹a; U art. 31 ust. 2–3",
  })
  pushLine({
    kind: "PARENTAL",
    beneficiary: "MOTHER",
    leaveType: "Urlop rodzicielski (praca łączona)",
    label: `Urlop rodzicielski mamy łączony z pracą (${Math.round(fraction * 100)}% etatu)`,
    weeks: combinedWeeks,
    rate: parentalRate,
    reduction: 1 - fraction,
    basis: basisGrosze,
    legalReference: "KP art. 182¹e; U art. 31 ust. 4a",
  })
  pushLine({
    kind: "WORK_COMBINATION_EXTENSION",
    beneficiary: "MOTHER",
    leaveType: "Przedłużenie urlopu rodzicielskiego",
    label: "Przedłużenie urlopu rodzicielskiego (praca łączona)",
    weeks: extensionWeeks,
    rate: parentalRate,
    reduction: combineInExtension ? 1 - fraction : 1,
    basis: basisGrosze,
    legalReference: "KP art. 182¹e–f; U art. 31 ust. 4a",
  })

  pushLine({
    kind: "PARENTAL",
    beneficiary: "SECOND_PARENT",
    leaveType: "Urlop rodzicielski (niezbywalny)",
    label: `Urlop rodzicielski drugiego rodzica (${secondNonTransferable} tyg. niezbywalnych)`,
    weeks: secondNonTransferable,
    rate: PARENTAL_RATE,
    basis: secondBasisGrosze,
    legalReference: "KP art. 182¹a §4; U art. 31 ust. 3f",
  })
  pushLine({
    kind: "PARENTAL",
    beneficiary: "SECOND_PARENT",
    leaveType: "Urlop rodzicielski (część wspólna)",
    label: "Urlop rodzicielski drugiego rodzica (część wspólna puli)",
    weeks: secondShared,
    rate: parentalRate,
    basis: secondBasisGrosze,
    legalReference: "KP art. 182¹a; U art. 31 ust. 2–3",
  })

  const paternityDays = eligible && !isLoss ? n.paternityDays : 0
  pushLine({
    kind: "PATERNITY",
    beneficiary: "SECOND_PARENT",
    leaveType: "Urlop ojcowski",
    label: "Zasiłek macierzyński (urlop ojcowski)",
    weeks: 0,
    days: paternityDays,
    rate: MATERNITY_RATE,
    basis: secondBasisGrosze,
    legalReference: "KP art. 182³; U art. 31 ust. 1",
  })

  const totalGrosze = lines.reduce((sum, line) => sum + line.amountGrosze, 0)

  if (minimumNotes.applied) {
    trace.push({
      ruleId: "LR-181",
      label: "Zastosowano dolny limit zasiłku 1 000 zł miesięcznie",
      detail:
        "Kwota zasiłku za okres pełnego urlopu nie może być niższa niż kwota świadczenia rodzicielskiego (1 000 zł miesięcznie, proporcjonalnie do dni).",
      legalReference: "U art. 31 ust. 3a",
    })
  }

  // ---- Warnings ----
  if (fraction > 0) {
    warnings.push(
      "Łączenie urlopu rodzicielskiego z pracą wymaga wniosku najpóźniej 21 dni przed rozpoczęciem pracy. Pracodawca może odmówić ze względów organizacyjnych."
    )
  }
  if (flat && eligible) {
    warnings.push(
      isBirth
        ? "Wariant 81,5% wymaga pisemnego wniosku w ciągu 21 dni od porodu (lub przyjęcia dziecka). Dziewięć tygodni drugiego rodzica zawsze pozostaje na poziomie 70%."
        : `Wariant 81,5% wymaga pisemnego wniosku w ciągu 21 dni od przyjęcia dziecka${n.placementDate ? ` (${n.placementDate})` : ""}. Dziewięć tygodni drugiego rodzica zawsze pozostaje na poziomie 70%.`
    )
  }
  if (preBirthWeeks > 0) {
    warnings.push(
      "Maksymalnie 6 tygodni urlopu macierzyńskiego można wykorzystać przed przewidywanym terminem porodu; potrzebne jest zaświadczenie lekarskie."
    )
  }
  if (isLoss && n.paternityDays > 0) {
    warnings.push(
      "W przypadku utraty dziecka nie wyliczono urlopu ojcowskiego ani rodzicielskiego."
    )
  }
  if (!isBirth && n.maternityWeeksBeforeBirth > 0) {
    warnings.push(
      "Przy adopcji i rodzinie zastępczej urlop nie może być wykorzystany przed przyjęciem dziecka — pominięto tygodnie „przed porodem”."
    )
  }

  // ---- Trace ----
  trace.unshift(
    {
      ruleId: "LR-123",
      label: `Wymiar urlopu ${isBirth ? "macierzyńskiego" : "na warunkach macierzyńskiego"}: ${maternityWeeks} tygodni`,
      detail: `Liczba dzieci: ${children === 5 ? "5 lub więcej" : children}. Wykorzystano ${preBirthWeeks} tyg. przed porodem, po porodzie pozostaje ${postBirthWeeks} tyg.`,
      legalReference: isBirth ? "KP art. 180 §1–2" : "KP art. 183 §1",
    },
    {
      ruleId: "LR-127",
      label: `Pula urlopu rodzicielskiego: ${parentalPoolWeeks} tygodni`,
      detail: `Dla mamy: ${motherParentalWeeks} tyg., dla drugiego rodzica: ${secondParentWeeks} tyg. (po ${PARENTAL_NON_TRANSFERABLE_WEEKS} tygodni niezbywalne dla każdego z rodziców).`,
      legalReference: "KP art. 182¹a; KP art. 182¹c",
    },
    {
      ruleId: "LR-130",
      label: flat
        ? "Wybrano wariant 81,5% dla całego okresu"
        : "Wybrano wariant 100% (macierzyński) + 70% (rodzicielski)",
      detail: `Stawki: macierzyński ${pct(maternityRate)}, rodzicielski ${pct(parentalRate)}. Wartości zaokrąglane do groszy.`,
      legalReference: "U art. 30a, 31 ust. 1–4",
    },
    {
      ruleId: "LR-112",
      label: "Podstawa wymiaru po potrąceniu składki chorobowej",
      detail: `Podstawa miesięczna = wynagrodzenie brutto × (1 − ${(CONTRIBUTION_DEDUCTION * 100).toFixed(2).replace(".", ",")}%) = ${basisGrosze / 100} zł. Podstawa dzienna = 1/30 podstawy miesięcznej.`,
      legalReference: "U art. 36, 38; P s. 24",
    },
    {
      ruleId: "LR-150",
      label: "Zasiłek drugiego rodzica liczony z jego podstawy",
      detail: `Podstawa drugiego rodzica: ${secondBasisGrosze / 100} zł. Niezbywalne ${PARENTAL_NON_TRANSFERABLE_WEEKS} tyg. zawsze po 70%, urlop ojcowski i przejęty macierzyński po 100%.`,
      legalReference: "U art. 31 ust. 1, 3f",
    },
    {
      ruleId: "LR-133",
      label: `Urlop ojcowski: ${paternityDays} dni`,
      detail:
        "Maksymalnie 14 dni, w jednej lub dwóch częściach; termin do ukończenia 12. miesiąca życia dziecka.",
      legalReference: "KP art. 182³",
    }
  )

  return {
    input: {
      ...n,
      grossMonthlyIncomeGrosze: motherGross,
      secondParentParentalWeeks: secondParentWeeks,
      motherParentalWeeks,
      fatherMaternityTakeoverWeeks: takeoverWeeks,
    },
    mode,
    eligible,
    normalizedChildrenCount: children,
    maternityWeeks,
    motherMaternityWeeks,
    fatherMaternityTakeoverWeeks: takeoverWeeks,
    supplementaryWeeks,
    preBirthWeeks,
    postBirthWeeks,
    parentalPoolWeeks,
    secondParentWeeks,
    motherParentalWeeks,
    extensionWeeks,
    extensionCapWeeks,
    paternityDays,
    ageAtPlacementYears: ageYears,
    guaranteeApplied,
    basisGrosze,
    dailyBasisGrosze: dailyBasis(basisGrosze),
    secondParentBasisGrosze: secondBasisGrosze,
    secondParentDailyBasisGrosze: dailyBasis(secondBasisGrosze),
    lines,
    totalGrosze,
    verified: false,
    status: eligible ? "INDETERMINATE" : "NOT_ELIGIBLE",
    warnings: [
      ...warnings,
      "Kwoty są szacunkiem demonstracyjnym. Minimalna podstawa, maksymalny wymiar i kwota świadczenia rodzicielskiego (Q-29) oraz zasady zaokrąglania (Q-15) wymagają zatwierdzenia.",
    ],
    trace,
  }
}

export { calculatorToAssessmentInput, calculatorToLeavePlan, calculateEngineBenefits } from "./engine-calculator"
