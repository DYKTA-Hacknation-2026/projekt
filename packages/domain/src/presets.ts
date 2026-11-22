import type { CalculatorInput } from "./types"

export type PresetTab = "BIRTH" | "ADOPTION"

export interface PresetCase {
  id: string
  label: string
  description: string
  /** Which form tab the preset belongs to. */
  tab: PresetTab
  input: CalculatorInput
}

const base: CalculatorInput = {
  grossMonthlyIncomeGrosze: 800_000,
  childrenCount: 1,
  hasZaZyciem: false,
  paymentOption: "STANDARD_100_70",
  maternityWeeksBeforeBirth: 0,
  secondParentParentalWeeks: 0,
  parentalWorkFraction: 0,
  paternityDays: 0,
  mode: "BIRTH",
}

/**
 * Illustrative scenarios modelled on the ZUS case sets. The figures are
 * demonstration values, not the official ZUS data.
 */
export const PRESET_CASES: readonly PresetCase[] = [
  {
    id: "anna-zam",
    label: "Anna – pracownik, ZAM",
    description:
      "Pracownica etatowa, jedno dziecko, 2 tygodnie urlopu przed porodem, wariant 100% + 70%.",
    tab: "BIRTH",
    input: {
      ...base,
      grossMonthlyIncomeGrosze: 720_000,
      maternityWeeksBeforeBirth: 2,
      employmentType: "EMPLOYEE",
    },
  },
  {
    id: "tomasz-z3",
    label: "Tomasz – pracownik, Z-3",
    description:
      "Ojciec z własną pensją: 14 dni urlopu ojcowskiego i 9 tygodni niezbywalnego rodzicielskiego (70%).",
    tab: "BIRTH",
    input: {
      ...base,
      grossMonthlyIncomeGrosze: 600_000,
      secondParentMonthlyIncomeGrosze: 950_000,
      secondParentParentalWeeks: 9,
      paternityDays: 14,
      employmentType: "EMPLOYEE",
    },
  },
  {
    id: "kasia-z3a",
    label: "Kasia – zleceniobiorca, Z-3a",
    description:
      "Zleceniobiorczyni ze zmiennymi dochodami z 12 miesięcy; dwa miesiące z absencją powyżej 50%.",
    tab: "BIRTH",
    input: {
      ...base,
      grossMonthlyIncomeGrosze: 450_000,
      employmentType: "CONTRACTOR",
      incomeMode: "DETAILED",
      monthlyIncomes: [
        { grossGrosze: 420_000 },
        { grossGrosze: 380_000 },
        { grossGrosze: 450_000 },
        { grossGrosze: 510_000 },
        { grossGrosze: 150_000, absenceOver50Percent: true },
        { grossGrosze: 120_000, absenceOver50Percent: true },
        { grossGrosze: 470_000 },
        { grossGrosze: 430_000 },
        { grossGrosze: 400_000 },
        { grossGrosze: 480_000 },
        { grossGrosze: 460_000 },
        { grossGrosze: 440_000 },
      ],
    },
  },
  {
    id: "marta-adopcja",
    label: "Marta – adopcja 5-latka",
    description:
      "Adopcja dziecka w wieku 5 lat: urlop na warunkach macierzyńskiego 20 tygodni + rodzicielski.",
    tab: "ADOPTION",
    input: {
      ...base,
      mode: "ADOPTION",
      grossMonthlyIncomeGrosze: 650_000,
      childBirthDate: "2021-03-10",
      placementDate: "2026-03-10",
      childAgeYears: 5,
    },
  },
  {
    id: "piotr-wczesniak",
    label: "Piotr – wcześniak 27. tydzień",
    description:
      "Poród w 27. tygodniu, masa 950 g, 12 tygodni hospitalizacji — uzupełniający urlop macierzyński.",
    tab: "BIRTH",
    input: {
      ...base,
      grossMonthlyIncomeGrosze: 900_000,
      birthWeekOfPregnancy: 27,
      birthWeightGrams: 950,
      childHospitalWeeks: 12,
      secondParentParentalWeeks: 9,
      paternityDays: 14,
    },
  },
  {
    id: "oliwia-rodzina-zastepcza",
    label: "Oliwia – rodzina zastępcza niezawodowa",
    description:
      "Przyjęcie 4-letniego dziecka do rodziny zastępczej niezawodowej: 20 tygodni na warunkach macierzyńskiego + rodzicielski.",
    tab: "ADOPTION",
    input: {
      ...base,
      mode: "FOSTER_CARE",
      grossMonthlyIncomeGrosze: 700_000,
      childAgeYears: 4,
      placementDate: "2026-09-01",
      childBirthDate: "2022-09-01",
    },
  },
  {
    id: "ewa-praca-z-urlopem",
    label: "Ewa – praca łączona z urlopem",
    description:
      "Mama pracuje na ½ etatu przez cały urlop rodzicielski; przedłużenie także łączone z pracą, tata bierze 9 tygodni.",
    tab: "BIRTH",
    input: {
      ...base,
      grossMonthlyIncomeGrosze: 850_000,
      secondParentMonthlyIncomeGrosze: 650_000,
      secondParentParentalWeeks: 9,
      parentalWorkFraction: 0.5,
      combineWorkInExtension: true,
      paternityDays: 14,
    },
  },
]

export function findPresetCase(id: string): PresetCase | undefined {
  return PRESET_CASES.find((preset) => preset.id === id)
}
