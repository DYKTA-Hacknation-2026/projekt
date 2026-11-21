import type {
  CalculatorInput,
  CalculatorMode,
  EmploymentType,
  MonthlyIncomeEntry,
  PaymentOption,
  SicknessCoverage,
  SpecialCase,
} from "@zpr/domain"

/**
 * Best-effort importer for a private ZUS sample case (`SC-xx.json`).
 *
 * The case files are a reviewable extraction, not a stable API. The importer
 * fills the calculator with the facts the file actually contains and reports
 * everything else as `missing`; it never invents a date, amount or insurance
 * status. The calculator remains a what-if simulation, not a reproduction of
 * the historical ZUS decision.
 */

type UnknownRecord = Record<string, unknown>

export interface SampleCaseMapping {
  title: string | null
  code: string | null
  input: CalculatorInput
  notes: string[]
  missing: string[]
  expected: {
    outcome: string | null
    notes: string[]
    amounts: UnknownRecord | null
  }
  historical: boolean
}

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function isoDate(value: unknown): string | null {
  const valueText = text(value)
  return valueText && /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null
}

function daysBetween(start: string, end: string): number {
  const from = Date.parse(`${start}T00:00:00Z`)
  const to = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

function weeksBetween(start: string, end: string): number {
  return Math.max(0, Math.ceil((daysBetween(start, end) + 1) / 7))
}

function employmentFromTitle(kind: string | null): EmploymentType {
  const value = kind?.toUpperCase() ?? ""
  if (value === "EMPLOYMENT") return "EMPLOYEE"
  if (value === "MANDATE") return "CONTRACTOR"
  return "BUSINESS"
}

function coverageFromTitle(
  title: UnknownRecord,
  employment: EmploymentType
): SicknessCoverage {
  const coverage = record(title.sicknessCoverage)
  const mode = text(coverage?.mode)?.toUpperCase()
  if (mode === "NONE") return "NONE"
  if (mode === "VOLUNTARY") return "VOLUNTARY"
  if (mode === "COMPULSORY") return "COMPULSORY"
  return employment === "EMPLOYEE" ? "COMPULSORY" : "VOLUNTARY"
}

interface ParentFacts {
  role: "MOTHER" | "FATHER"
  enabled: boolean
  employmentType: EmploymentType
  sicknessInsurance: SicknessCoverage
  grossMonthlyGrosze?: number
  monthlyIncomes?: MonthlyIncomeEntry[]
  knownBasisGrosze?: number
  workingTimeFraction?: number
  insuranceStartDate?: string
  insuranceEndDate?: string
  payerSize?: "OVER_20" | "UP_TO_20"
  contributionDebt?: boolean
}

function baseFromParent(
  parent: UnknownRecord,
  role: "MOTHER" | "FATHER",
  expectedBasis: number | null,
  notes: string[],
  missing: string[]
): ParentFacts {
  const title = array(parent.insuranceTitles)
    .map(record)
    .find((entry): entry is UnknownRecord => entry !== null)
  if (!title) {
    missing.push(
      `${role === "MOTHER" ? "Mama" : "Drugi rodzic"}: brak tytułu ubezpieczenia w sprawie — ustaw brak ubezpieczenia i sprawdź ręcznie.`
    )
    return {
      role,
      enabled: false,
      employmentType: "EMPLOYEE",
      sicknessInsurance: "NONE",
    }
  }
  const rawKind = text(title.kind)
  if (rawKind && /COOPERATING|UNKNOWN/i.test(rawKind)) {
    notes.push(
      `${role === "MOTHER" ? "Mama" : "Drugi rodzic"}: tytuł „${rawKind}” zmapowano na działalność/inni — potwierdź ubezpieczenie.`
    )
  }
  const employmentType = employmentFromTitle(rawKind)
  const sicknessInsurance = coverageFromTitle(title, employmentType)
  const declaredBasis = numberValue(title.declaredBasisGrosze)
  const basisInputs = array(title.basisInputs)
    .map(record)
    .filter((entry): entry is UnknownRecord => entry !== null)
  const monthlyIncomes: MonthlyIncomeEntry[] = basisInputs
    .filter((entry) => booleanValue(entry.included) !== false)
    .map((entry) => ({
      month: text(entry.month),
      grossGrosze: numberValue(entry.amountGrosze),
    }))
    .filter(
      (entry): entry is { month: string; grossGrosze: number } =>
        entry.month !== null &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(entry.month) &&
        entry.grossGrosze !== null
    )
    .map((entry) => ({ grossGrosze: entry.grossGrosze }))
  const workingTimeFraction = numberValue(title.workingTimeFraction) ?? undefined
  const coverage = record(title.sicknessCoverage)
  const coveragePeriod = array(coverage?.periods)
    .map(record)
    .find((period): period is UnknownRecord => period !== null)
  const payer = record(title.payer)
  const insuredCount = numberValue(payer?.insuredCountOn30Nov)
  const common = {
    role,
    employmentType,
    sicknessInsurance,
    workingTimeFraction,
    insuranceStartDate:
      isoDate(title.startDate) ?? isoDate(coveragePeriod?.from) ?? undefined,
    insuranceEndDate:
      isoDate(title.endDate) ?? isoDate(coveragePeriod?.to) ?? undefined,
    payerSize:
      insuredCount === null
        ? undefined
        : insuredCount > 20
          ? ("OVER_20" as const)
          : ("UP_TO_20" as const),
    contributionDebt: booleanValue(parent.contributionArrears) ?? undefined,
  }

  if (monthlyIncomes.length > 0) {
    return {
      ...common,
      enabled: true,
      monthlyIncomes,
    }
  }
  if (declaredBasis !== null && declaredBasis > 0) {
    return {
      ...common,
      enabled: true,
      grossMonthlyGrosze: declaredBasis,
    }
  }
  if (role === "MOTHER" && expectedBasis !== null && expectedBasis > 0) {
    return {
      ...common,
      enabled: true,
      knownBasisGrosze: expectedBasis,
    }
  }
  missing.push(
    `${role === "MOTHER" ? "Mama" : "Drugi rodzic"}: brak podstawy wymiaru w sprawie — uzupełnij ją ręcznie.`
  )
  return {
    ...common,
    enabled: true,
  }
}

export function mapSampleCaseToCalculatorInput(raw: unknown): SampleCaseMapping {
  const notes: string[] = []
  const missing: string[] = []
  const root = record(raw) ?? {}
  const facts = record(root.facts) ?? root
  const household = record(facts.household) ?? {}
  const familyEvent = record(household.familyEvent) ?? record(facts.familyEvent) ?? {}
  const scenario = record(facts.scenario) ?? record(root.scenario) ?? {}
  const expected = record(root.expected) ?? {}
  const expectedBasis = numberValue(record(expected.basis)?.monthlyBasisGrosze)
  const eventKind = text(familyEvent.kind)?.toUpperCase() ?? "BIRTH"
  const arrangement = text(familyEvent.arrangement) ?? ""
  const adoption = eventKind === "CARE_TAKING" && /ADOPT/i.test(arrangement)
  const foster = eventKind === "CARE_TAKING" && !adoption
  const mode: CalculatorMode =
    eventKind === "PREGNANCY"
      ? "BIRTH"
      : adoption
        ? "ADOPTION"
        : foster
          ? "FOSTER_CARE"
          : "BIRTH"

  const childRows = array(familyEvent.children)
    .map(record)
    .filter((child): child is UnknownRecord => child !== null)
  const childrenCount = Math.max(
    1,
    numberValue(familyEvent.childrenCount) ??
      (childRows.length > 0 ? childRows.length : 1)
  )
  const childBirthDate = isoDate(childRows[0]?.birthDate)
  const placementDate = isoDate(familyEvent.date ?? familyEvent.careTakingDate)
  const zaZyciem = childRows.some((child) =>
    array(child.flags).some((flag) => text(flag)?.toUpperCase() === "ZA_ZYCIEM")
  )
  const allStillborn =
    childRows.length > 0 &&
    childRows.every((child) => booleanValue(child.stillborn) === true)
  const specialCase: SpecialCase = allStillborn ? "STILLBIRTH" : "STANDARD"
  const childAgeYears =
    childBirthDate && placementDate
      ? daysBetween(childBirthDate, placementDate) / 365.2425
      : numberValue(childRows[0]?.ageAtPlacement) ?? undefined

  if (!placementDate) {
    missing.push(
      mode === "BIRTH"
        ? "Podaj datę porodu."
        : "Podaj datę przyjęcia dziecka na wychowanie."
    )
  }
  if (mode !== "BIRTH" && !childBirthDate) {
    missing.push(
      "Brak daty urodzenia dziecka — nie da się sprawdzić limitu wieku 7/10/14 lat."
    )
  }
  if (eventKind === "PREGNANCY") {
    notes.push(
      "Sprawa dotyczy ciąży/choroby, a kalkulator liczy zasiłki macierzyńskie/rodzicielskie — wczytano tylko dane, które dało się przenieść."
    )
  }
  if (childrenCount > 1 && childRows.some((child) => booleanValue(child.stillborn))) {
    notes.push(
      "Przy porodzie mnogim z martwym urodzeniem kalkulator obsługuje tylko jeden wariant straty — wynik może wymagać korekty."
    )
  }

  const parentsRaw = array(household.parents)
    .map(record)
    .filter((parent): parent is UnknownRecord => parent !== null)
    .slice(0, 2)
  const usedRoles = new Set<"MOTHER" | "FATHER">()
  const parentRoleById = new Map<string, "MOTHER" | "FATHER">()
  const parentFacts: ParentFacts[] = []
  for (const [index, parent] of parentsRaw.entries()) {
    const rawRole = text(parent.role)?.toUpperCase()
    let role: "MOTHER" | "FATHER" =
      rawRole === "FATHER" ? "FATHER" : rawRole === "MOTHER" ? "MOTHER" : index === 0 ? "MOTHER" : "FATHER"
    if (role === "MOTHER" && usedRoles.has("MOTHER")) role = "FATHER"
    if (role === "FATHER" && usedRoles.has("FATHER")) role = "MOTHER"
    usedRoles.add(role)
    const id = text(parent.id)
    if (id) parentRoleById.set(id, role)
    parentFacts.push(baseFromParent(parent, role, expectedBasis, notes, missing))
  }
  if (parentFacts.length === 0) {
    missing.push("Sprawa nie zawiera danych rodzica.")
  }

  const mother = parentFacts.find((parent) => parent.role === "MOTHER")
  const father = parentFacts.find((parent) => parent.role === "FATHER")
  const activeMother = mother?.enabled ? mother : undefined
  const activeFather = father?.enabled ? father : undefined
  // Father-only cases (e.g. an uninsured mother) have the expected basis on
  // the only parent; use it for him rather than inventing a mother's basis.
  if (
    !activeMother &&
    activeFather &&
    activeFather.knownBasisGrosze === undefined &&
    activeFather.grossMonthlyGrosze === undefined &&
    expectedBasis !== null
  ) {
    activeFather.knownBasisGrosze = expectedBasis
  }
  const motherType = activeMother?.employmentType ?? "EMPLOYEE"
  const fatherType = activeFather?.employmentType ?? "EMPLOYEE"
  const motherIncome = activeMother?.grossMonthlyGrosze ?? 0
  const fatherIncome = activeFather?.grossMonthlyGrosze
  const knownBasis =
    activeMother?.knownBasisGrosze ??
    (!activeMother ? activeFather?.knownBasisGrosze : undefined)
  const secondKnownBasis = activeFather?.knownBasisGrosze
  const monthlyIncomes = activeMother?.monthlyIncomes
  const incomeMode = knownBasis || secondKnownBasis
    ? "KNOWN_BASIS"
    : monthlyIncomes && monthlyIncomes.length > 0
      ? "DETAILED"
      : "SIMPLE"

  const segments = array(scenario.segments)
    .map(record)
    .filter((segment): segment is UnknownRecord => segment !== null)
  let motherWeeks = 0
  let fatherWeeks = 0
  let takeoverWeeks = 0
  let takeoverReason: CalculatorInput["fatherMaternityTakeoverReason"] | undefined
  let paternityDays = 0
  let workFraction = 0
  let workCombinedWeeks = 0
  let combineInExtension = Boolean(
    record(record(record(expected.periods)?.workCombinationExtension))
  )
  let hospitalWeeks = 0
  let supplementaryWeeks = 0
  let preBirthWeeks = 0
  const birthDate = isoDate(familyEvent.date)
  const motherMaternityWeeks = numberValue(
    segments.find(
      (segment) =>
        text(segment.kind)?.toUpperCase() === "MATERNITY" &&
        parentRoleById.get(text(segment.parentId) ?? "") !== "FATHER"
    )?.weeks
  )

  for (const segment of segments) {
    const kind = text(segment.kind)?.toUpperCase() ?? ""
    const parent = parentRoleById.get(text(segment.parentId) ?? "")
    const start = isoDate(segment.start ?? segment.from)
    const end = isoDate(segment.end ?? segment.to)
    const weeks =
      numberValue(segment.baseWeeks) ??
      numberValue(segment.weeks) ??
      (start && end ? weeksBetween(start, end) : 0)
    const work = numberValue(segment.workFraction)
    if (kind === "MATERNITY" || kind === "MATERNITY_TERMS") {
      if (parent === "FATHER") {
        takeoverWeeks = weeks
        const rawReason = text(segment.takeoverReason)?.toUpperCase() ?? ""
        const reasons: Record<
          string,
          NonNullable<CalculatorInput["fatherMaternityTakeoverReason"]>
        > = {
          MOTHER_RESIGNED_AFTER_14W: "MOTHER_RESIGNS_AFTER_14_WEEKS",
          MOTHER_RESIGNS_AFTER_14_WEEKS: "MOTHER_RESIGNS_AFTER_14_WEEKS",
          MOTHER_INCAPACITY: "MOTHER_INCAPACITY",
          MOTHER_HOSPITALIZED: "MOTHER_HOSPITALIZED",
          MOTHER_DIED: "MOTHER_DIED",
          MOTHER_ABANDONED_CHILD: "MOTHER_ABANDONED_CHILD",
          UNINSURED_MOTHER_DIED: "UNINSURED_MOTHER_DIED",
          UNINSURED_MOTHER_ABANDONED_CHILD: "UNINSURED_MOTHER_ABANDONED_CHILD",
          UNINSURED_MOTHER_INCAPACITY: "UNINSURED_MOTHER_INCAPACITY",
          UNINSURED_MOTHER_EMPLOYED: "UNINSURED_MOTHER_EMPLOYED",
        }
        takeoverReason = reasons[rawReason] ?? "MOTHER_RESIGNS_AFTER_14_WEEKS"
      } else if (start && birthDate && start < birthDate) {
        preBirthWeeks = Math.min(6, weeksBetween(start, birthDate))
      }
      continue
    }
    if (kind === "PARENTAL") {
      if (parent === "FATHER") {
        fatherWeeks += weeks
      } else {
        motherWeeks += weeks
        if (work !== null && work > 0) {
          workFraction = Math.max(workFraction, work)
          workCombinedWeeks += weeks
        }
      }
      continue
    }
    if (kind === "PATERNITY") {
      paternityDays = Math.max(
        0,
        Math.round(
          numberValue(segment.days) ??
            (start && end ? daysBetween(start, end) + 1 : 14)
        )
      )
      continue
    }
    if (kind === "SUPPLEMENTARY_MATERNITY") {
      supplementaryWeeks += weeks
      hospitalWeeks += weeks
      continue
    }
    if (kind === "SICKNESS") {
      notes.push(
        "Sprawa obejmuje zasiłek chorobowy — kalkulator nie liczy zasiłku chorobowego, tylko macierzyński/rodzicielski."
      )
    }
  }
  if (supplementaryWeeks > 0) {
    hospitalWeeks = supplementaryWeeks
    missing.push(
      "Uzupełniający urlop: sprawa nie podaje jednoznacznie tygodnia ciąży/masy urodzeniowej — potwierdź je, aby silnik dobrał limit 15/8 tyg."
    )
  }
  if (takeoverWeeks > 0 && motherMaternityWeeks !== null) {
    preBirthWeeks = Math.min(6, preBirthWeeks)
  }

  const paymentOption: PaymentOption =
    text(scenario.paymentOption) === "FLAT_81_5" ? "FLAT_81_5" : "STANDARD_100_70"
  const flatRateApplicationDate = isoDate(
    scenario.option81_5ApplicationDate ?? scenario.flatRateApplicationDate
  )
  const expectedOutcome =
    text(record(expected.eligibility)?.status) ??
    text(expected.outcome) ??
    null
  const expectedNotes = array(expected.notes)
    .map(text)
    .filter((note): note is string => note !== null)
  const eventDate = placementDate ?? birthDate
  const historical = eventDate !== null && eventDate < "2026-07-01"

  const input: CalculatorInput = {
    grossMonthlyIncomeGrosze: Math.round(motherIncome),
    secondParentMonthlyIncomeGrosze:
      fatherIncome !== undefined ? Math.round(fatherIncome) : undefined,
    knownBasisGrosze: knownBasis !== undefined ? Math.round(knownBasis) : undefined,
    secondParentKnownBasisGrosze:
      secondKnownBasis !== undefined ? Math.round(secondKnownBasis) : undefined,
    childrenCount,
    hasZaZyciem: zaZyciem,
    paymentOption,
    maternityWeeksBeforeBirth: preBirthWeeks,
    secondParentParentalWeeks: fatherWeeks,
    motherParentalWeeks: motherWeeks || undefined,
    parentalWorkFraction: workFraction,
    workCombinedWeeks: workCombinedWeeks || undefined,
    combineWorkInExtension: combineInExtension,
    paternityDays,
    fatherMaternityTakeoverWeeks: takeoverWeeks || undefined,
    fatherMaternityTakeoverReason: takeoverReason,
    flatRateApplicationDate: flatRateApplicationDate ?? undefined,
    courtApplicationDate: isoDate(familyEvent.courtApplicationDate) ?? undefined,
    adoptionFinalDate: isoDate(familyEvent.adoptionFinalDate) ?? undefined,
    previouslyUsedMaternityTermsWeeks:
      numberValue(familyEvent.previouslyUsedMaternityTermsWeeks) ?? undefined,
    previouslyUsedParentalWeeks:
      numberValue(familyEvent.previouslyUsedParentalWeeks) ?? undefined,
    mode,
    birthDate: mode === "BIRTH" ? (birthDate ?? undefined) : undefined,
    childAgeYears,
    childBirthDate: childBirthDate ?? undefined,
    placementDate: placementDate ?? undefined,
    isDeferredSchooling: booleanValue(familyEvent.schoolDeferred) ?? undefined,
    isProfessionalFosterFamily:
      booleanValue(familyEvent.professionalFosterFamily) ??
      (/\bPROFESSIONAL\b/i.test(arrangement) &&
      !/NON[_-]?PROFESSIONAL/i.test(arrangement)
        ? true
        : undefined),
    childHospitalWeeks: hospitalWeeks || undefined,
    specialCase,
    incomeMode,
    monthlyIncomes,
    employmentType: motherType,
    motherEmploymentType: motherType,
    fatherEmploymentType: fatherType,
    motherEnabled: activeMother !== undefined,
    fatherEnabled: activeFather !== undefined,
    motherSicknessInsurance: activeMother?.sicknessInsurance,
    fatherSicknessInsurance: activeFather?.sicknessInsurance,
    motherInsuranceStartDate: activeMother?.insuranceStartDate,
    fatherInsuranceStartDate: activeFather?.insuranceStartDate,
    motherInsuranceEndDate: activeMother?.insuranceEndDate,
    fatherInsuranceEndDate: activeFather?.insuranceEndDate,
    motherPayerSize: activeMother?.payerSize,
    fatherPayerSize: activeFather?.payerSize,
    motherContributionDebt: activeMother?.contributionDebt,
    fatherContributionDebt: activeFather?.contributionDebt,
    employmentFraction:
      activeMother?.workingTimeFraction ??
      activeFather?.workingTimeFraction ??
      1,
  }

  if (incomeMode === "KNOWN_BASIS" && father !== undefined && secondKnownBasis === undefined) {
    notes.push(
      "Dla drugiego rodzica brak znanej podstawy — kalkulator użyje podstawy mamy; uzupełnij ją ręcznie."
    )
  }
  if (father !== undefined && fatherIncome === undefined) {
    notes.push(
      "Drugi rodzic nie ma w sprawie własnej podstawy/dochodu — kwota zostanie policzona z podstawy mamy."
    )
  }
  if (historical) {
    notes.push(
      "Sprawa jest historyczna (przed 1.07.2026). To symulacja na obecnych stawkach, nie odtworzenie decyzji ZUS."
    )
  }

  return {
    code: text(root.code),
    title: text(root.title),
    input,
    notes,
    missing,
    expected: {
      outcome: expectedOutcome,
      notes: expectedNotes,
      amounts: record(expected.amounts),
    },
    historical,
  }
}
