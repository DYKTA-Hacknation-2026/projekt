import {
  EMPLOYMENT_OPTIONS,
  type QuestionDefinition,
  type QuestionOption,
  type SituationAnswers,
  type WizardStepId,
} from "./types"

/**
 * Declarative questionnaire. Each entry is one field of the form and one fact
 * consumed by the engine. `visible` answers "should we ask this at all?";
 * `required` answers "can the analysis run without it?".
 */

export const STEP_META: Record<WizardStepId, { title: string; lead: string }> =
  {
    situation: {
      title: "Twoja sytuacja",
      lead: "Zacznijmy od tego, z czym przychodzisz. To ustawia całą dalszą ścieżkę.",
    },
    family: {
      title: "Sytuacja rodzinna",
      lead: "Pytamy tylko o to, co wynika z wybranej sytuacji i wpływa na uprawnienia.",
    },
    work: {
      title: "Praca i ubezpieczenie",
      lead: "Ubezpieczenie chorobowe decyduje o prawie do zasiłków. Nie zakładamy, że pracujesz na etacie.",
    },
    additional: {
      title: "Dodatkowe informacje",
      lead: "To pytania, które zmieniają wynik. Możesz je pominąć — wtedy oznaczymy wynik jako częściowy.",
    },
    summary: {
      title: "Analiza i wyniki",
      lead: "Sprawdź podsumowanie, uruchom analizę i przejdź do konkretnych kroków.",
    },
  }

function scenarioIn(...scenarios: SituationAnswers["scenario"][]) {
  return (answers: SituationAnswers) => scenarios.includes(answers.scenario)
}

function employmentIn(...forms: SituationAnswers["motherEmployment"][]) {
  return (answers: SituationAnswers) => forms.includes(answers.motherEmployment)
}

function fatherEmploymentIn(...forms: SituationAnswers["fatherEmployment"][]) {
  return (answers: SituationAnswers) => forms.includes(answers.fatherEmployment)
}

function yes(value: string): boolean {
  return value === "YES"
}

function dateError(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "Podaj datę w formacie dzień-miesiąc-rok."
  }
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    return "Ta data nie istnieje. Sprawdź dzień i miesiąc."
  }
  return null
}

function numberInRange(value: string, min: number, max: number): string | null {
  const parsed = Number(value.replace(",", "."))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return `Podaj liczbę od ${min} do ${max}.`
  }
  return null
}

const fractionOptions: readonly QuestionOption[] = [
  { value: "1", label: "Pełny etat" },
  { value: "0.75", label: "3/4 etatu" },
  { value: "0.5", label: "1/2 etatu" },
  { value: "0.25", label: "1/4 etatu" },
]

const sicknessOptions: readonly QuestionOption[] = [
  { value: "COMPULSORY", label: "Obowiązkowe" },
  { value: "VOLUNTARY", label: "Dobrowolne" },
  { value: "NONE", label: "Nie mam ubezpieczenia chorobowego" },
]

const debtOptions: readonly QuestionOption[] = [
  { value: "NO", label: "Nie" },
  { value: "YES", label: "Tak" },
  { value: "UNKNOWN", label: "Nie wiem" },
]

export const QUESTIONS: readonly QuestionDefinition[] = [
  {
    id: "scenario",
    step: "situation",
    label: "Co najlepiej opisuje Twoją sytuację?",
    why: "Scenariusz decyduje, o co pytamy dalej i jak liczymy terminy.",
    engineField: "event.kind",
    kind: "choice",
    required: () => true,
    missingHint: "Wybierz scenariusz, od którego zaczynamy.",
    options: [
      {
        value: "PLANNING",
        label: "Planuję rodzicielstwo",
        description:
          "Nie znasz jeszcze terminu albo dopiero się przygotowujesz. Pokażemy, co będzie potrzebne.",
      },
      {
        value: "PREGNANCY",
        label: "Oczekuję narodzin dziecka",
        description:
          "Podasz przewidywany termin porodu i sytuację ubezpieczeniową.",
      },
      {
        value: "BIRTH",
        label: "Dziecko już się urodziło",
        description: "Liczby i terminy policzymy od faktycznej daty porodu.",
      },
      {
        value: "ON_LEAVE",
        label: "Korzystam już z urlopu lub świadczenia",
        description:
          "Uwzględnimy wykorzystane tygodnie i pokażemy, co zostało.",
      },
      {
        value: "CARE",
        label: "Przyjmuję dziecko (adopcja lub rodzina zastępcza)",
        description: "Uprawnienia liczą się od dnia przyjęcia dziecka.",
      },
      {
        value: "CHECK_DOCUMENT",
        label: "Chcę sprawdzić konkretny wniosek",
        description:
          "Zbierzemy minimalny profil, a potem przejdziesz do analizy dokumentu.",
      },
    ],
  },

  {
    id: "userRole",
    step: "situation",
    label: "Kogo dotyczy ta analiza?",
    help: "Możesz opisać swoją sytuację jako matka albo jako ojciec / drugi rodzic. Drugi rodzic jest opcjonalny w kolejnym kroku.",
    why: "Silnik liczy uprawnienia odrębnie dla matki i ojca; rola decyduje o przypisaniu ubezpieczenia i urlopu.",
    engineField: "parents[].role",
    kind: "choice",
    visible: (answers) => answers.scenario !== "",
    required: (answers) => answers.scenario !== "",
    options: [
      {
        value: "MOTHER",
        label: "Matka / osoba, która urodziła lub przyjmuje dziecko",
        description: "Domyślnie przypisujemy Ci macierzyński i rodzicielski.",
      },
      {
        value: "FATHER",
        label: "Ojciec / drugi rodzic",
        description:
          "Twoje ubezpieczenie i urlop będą liczone jako drugiego rodzica; matkę możesz dodać osobno.",
      },
    ],
  },

  // ---------------------------------------------------------------- family
  {
    id: "leaveKind",
    step: "family",
    label: "Z jakiego urlopu lub świadczenia już korzystasz?",
    why: "Rodzaj urlopu określa, które tygodnie są już wykorzystane, a które zostały.",
    engineField:
      "plan.maternityStartDate / plan.parentalSegments / plan.paternity",
    kind: "choice",
    visible: scenarioIn("ON_LEAVE"),
    required: scenarioIn("ON_LEAVE"),
    missingHint: "Wskaż, z jakiego urlopu już korzystasz.",
    options: [
      { value: "MATERNITY", label: "Urlop macierzyński" },
      { value: "PARENTAL", label: "Urlop rodzicielski" },
      { value: "PATERNITY", label: "Urlop ojcowski" },
    ],
  },
  {
    id: "dueDate",
    step: "family",
    label: "Przewidywany termin porodu",
    help: "Jeśli nie znasz dokładnej daty, zostaw puste — wskażemy brak i policzymy wynik częściowy.",
    why: "Od terminu porodu liczą się okresy zasiłku macierzyńskiego i terminy wniosków.",
    engineField: "event.expectedDueDate",
    kind: "date",
    visible: (answers) =>
      scenarioIn("PLANNING", "PREGNANCY", "CHECK_DOCUMENT")(answers) ||
      (answers.scenario === "ON_LEAVE" && answers.leaveKind === "MATERNITY"),
    required: (answers) =>
      answers.scenario === "PREGNANCY" ||
      ((answers.scenario === "ON_LEAVE" ||
        answers.scenario === "CHECK_DOCUMENT") &&
        !answers.birthDate),
    validate: dateError,
    missingHint:
      "Podaj przewidywany termin porodu, aby policzyć okresy i terminy.",
  },
  {
    id: "birthDate",
    step: "family",
    label: "Data urodzenia dziecka",
    why: "Dzień porodu jest dniem powstania prawa do zasiłku macierzyńskiego.",
    engineField: "event.birthDate",
    kind: "date",
    visible: scenarioIn("BIRTH", "ON_LEAVE", "CHECK_DOCUMENT"),
    required: (answers) => {
      if (answers.scenario === "BIRTH") return true
      if (answers.scenario === "CHECK_DOCUMENT") return !answers.dueDate
      if (answers.scenario === "ON_LEAVE") {
        return answers.leaveKind === "MATERNITY" ? !answers.dueDate : true
      }
      return false
    },
    validate: dateError,
    missingHint:
      "Podaj faktyczną datę porodu — inaczej terminy mogą być nieaktualne.",
  },
  {
    id: "childrenCount",
    step: "family",
    label: "Ile dzieci urodziło się lub urodzi przy jednym porodzie?",
    help: "Przy bliźniętach wymiar urlopu się wydłuża. Przy adopcji wpisz liczbę przyjętych dzieci.",
    why: "Liczba dzieci zmienia wymiar urlopu macierzyńskiego i rodzicielskiego.",
    engineField: "event.childrenCount",
    kind: "select",
    options: [1, 2, 3, 4, 5].map((count) => ({
      value: String(count),
      label: count === 5 ? "5 lub więcej" : String(count),
    })),
    required: () => true,
    missingHint: "Podaj liczbę dzieci.",
  },
  {
    id: "careKind",
    step: "family",
    label: "Jaki to rodzaj opieki?",
    why: "Adopcja i rodzina zastępcza mają inne limity wieku i terminy.",
    engineField: "event.kind",
    kind: "choice",
    visible: scenarioIn("CARE"),
    required: scenarioIn("CARE"),
    missingHint: "Wskaż, czy chodzi o adopcję, czy o rodzinę zastępczą.",
    options: [
      { value: "ADOPTION", label: "Adopcja" },
      { value: "FOSTER_CARE", label: "Rodzina zastępcza" },
    ],
  },
  {
    id: "careTakingDate",
    step: "family",
    label: "Data przyjęcia dziecka na wychowanie",
    why: "Od tej daty liczą się uprawnienia adopcyjne i termin wniosku.",
    engineField: "event.careTakingDate",
    kind: "date",
    visible: scenarioIn("CARE"),
    required: scenarioIn("CARE"),
    validate: dateError,
    missingHint: "Podaj datę przyjęcia dziecka.",
  },
  {
    id: "childBirthDate",
    step: "family",
    label: "Data urodzenia dziecka",
    why: "Silnik sprawdza limit wieku dziecka uprawniający do urlopu.",
    engineField: "event.childBirthDate",
    kind: "date",
    visible: scenarioIn("CARE"),
    required: scenarioIn("CARE"),
    validate: dateError,
    missingHint: "Podaj datę urodzenia dziecka.",
  },
  {
    id: "courtApplicationDate",
    step: "family",
    label: "Data złożenia wniosku do sądu opiekuńczego (jeśli znasz)",
    help: "Dotyczy adopcji. Możesz pominąć.",
    why: "Termin urlopu na warunkach urlopu macierzyńskiego zależy od wniosku o przysposobienie.",
    engineField: "event.courtApplicationDate",
    kind: "date",
    visible: (answers) =>
      answers.scenario === "CARE" && answers.careKind === "ADOPTION",
    validate: dateError,
  },
  {
    id: "adoptionFinalDate",
    step: "family",
    label: "Data uprawomocnienia się adopcji (jeśli znasz)",
    help: "Dotyczy adopcji. Możesz pominąć.",
    why: "Od uprawomocnienia liczy się termin urlopu ojcowskiego przy adopcji.",
    engineField: "event.adoptionFinalDate",
    kind: "date",
    visible: (answers) =>
      answers.scenario === "CARE" && answers.careKind === "ADOPTION",
    validate: dateError,
  },
  {
    id: "stillbirth",
    step: "family",
    label: "Czy dziecko urodziło się martwe?",
    why: "Martwe urodzenie zmienia uprawnienia do urlopu rodzicielskiego i zasiłku pogrzebowego.",
    engineField: "event.stillbirth",
    kind: "choice",
    visible: (answers) =>
      answers.scenario === "BIRTH" ||
      (answers.scenario === "ON_LEAVE" && answers.birthDate !== ""),
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
    ],
  },
  {
    id: "hasZaZyciem",
    step: "family",
    label: "Czy masz zaświadczenie „Za życiem”?",
    help: "Zaświadczenie wydaje lekarz, gdy ciąża jest zagrożona lub dziecko urodziło się z ciężkim upośledzeniem.",
    why: "„Za życiem” wydłuża urlop rodzicielski do 65/67 tygodni.",
    engineField: "event.zaZyciem",
    kind: "choice",
    visible: scenarioIn("PREGNANCY", "BIRTH", "ON_LEAVE"),
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
      { value: "UNKNOWN", label: "Nie wiem" },
    ],
  },
  {
    id: "premature",
    step: "family",
    label: "Czy dziecko urodziło się przedwcześnie?",
    help: "Chodzi o poród przed 28. tygodniem ciąży albo z masą poniżej 1000 g.",
    why: "Wcześniactwo może uprawniać do uzupełniającego urlopu macierzyńskiego.",
    engineField:
      "event.gestationalWeeksCompleted / event.lowestBirthWeightGrams",
    kind: "choice",
    visible: (answers) =>
      answers.scenario === "BIRTH" ||
      (answers.scenario === "ON_LEAVE" && answers.birthDate !== ""),
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
    ],
  },
  {
    id: "gestationalWeeks",
    step: "family",
    label: "W którym tygodniu ciąży urodziło się dziecko?",
    suffix: "tydzień",
    why: "Silnik sprawdza warunek uzupełniającego urlopu macierzyńskiego.",
    engineField: "event.gestationalWeeksCompleted",
    kind: "number",
    min: 0,
    max: 45,
    visible: (answers) =>
      (answers.scenario === "BIRTH" ||
        (answers.scenario === "ON_LEAVE" && answers.birthDate !== "")) &&
      yes(answers.premature),
    validate: (value) => numberInRange(value, 0, 45),
  },
  {
    id: "birthWeightGrams",
    step: "family",
    label: "Najniższa masa urodzeniowa dziecka",
    suffix: "g",
    why: "Masa poniżej 1000 g jest samodzielną przesłanką uzupełniającego urlopu.",
    engineField: "event.lowestBirthWeightGrams",
    kind: "number",
    min: 1,
    max: 10000,
    visible: (answers) =>
      (answers.scenario === "BIRTH" ||
        (answers.scenario === "ON_LEAVE" && answers.birthDate !== "")) &&
      yes(answers.premature),
    validate: (value) => numberInRange(value, 1, 10000),
  },
  {
    id: "fatherIncluded",
    step: "family",
    label: "Czy uwzględnić drugiego rodzica?",
    help: "Drugi rodzic może mieć własne uprawnienia i własną podstawę wymiaru.",
    why: "Uprawnienia drugiego rodzica liczą się odrębnie; bez tej informacji pomijamy jego część.",
    engineField: "parents[FATHER]",
    kind: "choice",
    options: [
      { value: "YES", label: "Tak, uwzględnij drugiego rodzica" },
      { value: "NO", label: "Nie, licz tylko mnie" },
    ],
    required: () => true,
  },

  // ------------------------------------------------------------------ work
  {
    id: "motherEmployment",
    step: "work",
    label: "Jaka jest Twoja forma zatrudnienia?",
    why: "Tytuł ubezpieczenia decyduje o prawie do zasiłku i o tym, kto go wypłaca.",
    engineField: "parents[MOTHER].insurance.title",
    kind: "choice",
    options: EMPLOYMENT_OPTIONS,
    required: () => true,
    missingHint:
      "Wskaż formę zatrudnienia — bez tego nie ustalimy ubezpieczenia.",
  },
  {
    id: "motherEmployerName",
    step: "work",
    label: "Pracodawca / zleceniodawca",
    help: "Opcjonalnie. Przydaje się tylko do opisu sprawy, nie do obliczeń.",
    why: "Informacja porządkowa w zapisanej sprawie.",
    engineField: "—",
    kind: "text",
    visible: employmentIn("EMPLOYMENT", "MANDATE"),
    placeholder: "np. nazwa firmy",
  },
  {
    id: "motherSickness",
    step: "work",
    label: "Czy masz ubezpieczenie chorobowe?",
    help: "Przy zleceniu i działalności jest dobrowolne. Bez niego zasiłek macierzyński nie przysługuje.",
    why: "Ubezpieczenie chorobowe w dniu porodu jest warunkiem zasiłku macierzyńskiego.",
    engineField: "parents[MOTHER].insurance.sicknessInsurance",
    kind: "choice",
    visible: employmentIn("MANDATE", "SELF_EMPLOYMENT", "OTHER"),
    required: employmentIn("MANDATE", "SELF_EMPLOYMENT", "OTHER"),
    options: sicknessOptions,
    missingHint: "Wskaż, czy masz ubezpieczenie chorobowe.",
  },
  {
    id: "motherInsuranceStartDate",
    step: "work",
    label: "Od kiedy jesteś ubezpieczona?",
    help: "Jeśli nie pamiętasz, pomiń. Wpłynie to na dokładność, nie na prawo do zasiłku.",
    why: "Początek ubezpieczenia pozwala ocenić okresy i ewentualną przerwę.",
    engineField: "parents[MOTHER].insurance.startDate",
    kind: "date",
    visible: (answers) =>
      answers.motherEmployment !== "NONE" && answers.motherEmployment !== "",
    validate: dateError,
  },
  {
    id: "motherInsuranceEndsBeforeEvent",
    step: "work",
    label: "Czy Twoje zatrudnienie lub ubezpieczenie kończy się przed porodem?",
    why: "Zakończenie tytułu w ciąży może dawać zasiłek w wysokości macierzyńskiego do porodu.",
    engineField:
      "parents[MOTHER].insurance.endDate / endReason / endedDuringPregnancy",
    kind: "choice",
    visible: (answers) =>
      answers.motherEmployment !== "NONE" && answers.motherEmployment !== "",
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
      { value: "UNKNOWN", label: "Nie wiem" },
    ],
  },
  {
    id: "motherInsuranceEndDate",
    step: "work",
    label: "Kiedy kończy się zatrudnienie lub ubezpieczenie?",
    why: "Data zakończenia decyduje, czy zasiłek przysługuje do porodu.",
    engineField: "parents[MOTHER].insurance.endDate",
    kind: "date",
    visible: (answers) => answers.motherInsuranceEndsBeforeEvent === "YES",
    required: (answers) => answers.motherInsuranceEndsBeforeEvent === "YES",
    validate: dateError,
    missingHint: "Podaj datę końca ubezpieczenia.",
  },
  {
    id: "motherEndReason",
    step: "work",
    label: "Dlaczego kończy się zatrudnienie lub ubezpieczenie?",
    why: "Przyczyna zakończenia zmienia uprawnienia (np. upadłość pracodawcy, koniec umowy).",
    engineField: "parents[MOTHER].insurance.endReason",
    kind: "select",
    visible: (answers) => answers.motherInsuranceEndsBeforeEvent === "YES",
    required: (answers) => answers.motherInsuranceEndsBeforeEvent === "YES",
    missingHint: "Wskaż przyczynę zakończenia ubezpieczenia.",
    options: [
      {
        value: "FIXED_TERM_CONTRACT_END",
        label: "Koniec umowy na czas określony",
      },
      {
        value: "TERMINATION_BY_EMPLOYER",
        label: "Wypowiedzenie przez pracodawcę",
      },
      {
        value: "RESIGNATION_OR_AGREEMENT",
        label: "Rezygnacja lub porozumienie stron",
      },
      { value: "EMPLOYER_BANKRUPTCY", label: "Upadłość pracodawcy" },
      { value: "EMPLOYER_LIQUIDATION", label: "Likwidacja pracodawcy" },
      { value: "EMPLOYER_DEATH", label: "Śmierć pracodawcy" },
      { value: "MANDATE_CONTRACT_END", label: "Koniec umowy zlecenia" },
      { value: "BUSINESS_CLOSED", label: "Zamknięcie działalności" },
      { value: "OTHER", label: "Inna przyczyna" },
    ],
  },
  {
    id: "motherIncome",
    step: "work",
    label: "Ile wynosi Twoje miesięczne wynagrodzenie brutto?",
    help: "Podaj średnią kwotę brutto. Jeśli nie wiesz, zostaw puste — pokażemy wynik bez kwoty.",
    why: "Wynagrodzenie jest podstawą obliczenia wysokości zasiłku.",
    engineField: "parents[MOTHER].basis",
    kind: "number",
    suffix: "zł",
    min: 0,
    max: 1000000,
    visible: (answers) =>
      answers.motherEmployment !== "NONE" && answers.motherEmployment !== "",
    validate: (value) => numberInRange(value, 0, 1_000_000),
  },
  {
    id: "motherBasisMode",
    step: "work",
    label: "Skąd mamy wziąć podstawę wymiaru?",
    why: "Podstawa z zaświadczenia płatnika jest już po potrąceniu składek; wynagrodzenie brutto wymaga przeliczenia.",
    engineField: "parents[MOTHER].basis.method",
    kind: "choice",
    visible: (answers) =>
      answers.motherEmployment !== "NONE" && answers.motherEmployment !== "",
    options: [
      { value: "GROSS", label: "Z wynagrodzenia brutto" },
      { value: "KNOWN", label: "Mam podstawę z Z-3 / Z-3a" },
    ],
  },
  {
    id: "motherWorkingTimeFraction",
    step: "work",
    label: "Jaki masz wymiar czasu pracy?",
    why: "Przy niepełnym etacie silnik sprawdza minimalną podstawę wymiaru.",
    engineField: "parents[MOTHER].insurance.workingTimeFraction",
    kind: "select",
    visible: employmentIn("EMPLOYMENT"),
    options: fractionOptions,
  },
  {
    id: "motherPayerSize",
    step: "work",
    label: "Ilu ubezpieczonych ma Twój płatnik?",
    help: "Pracodawca do 20 ubezpieczonych wypłaca wynagrodzenie chorobowe przez 33 dni, powyżej 20 — przez 14 dni. Jeśli nie wiesz, pomiń.",
    why: "Wielkość płatnika zmienia okres wynagrodzenia chorobowego wypłacanego przez pracodawcę.",
    engineField: "parents[MOTHER].insurance.payerSize",
    kind: "select",
    visible: employmentIn("EMPLOYMENT"),
    options: [
      { value: "", label: "Nie wiem" },
      { value: "OVER_20", label: "Ponad 20 ubezpieczonych" },
      { value: "UP_TO_20", label: "Do 20 ubezpieczonych" },
    ],
  },
  {
    id: "motherContributionDebt",
    step: "work",
    label: "Czy masz zaległości składkowe?",
    why: "Zaległości powyżej progu mogą pozbawić prawa do zasiłku przy dobrowolnym ubezpieczeniu.",
    engineField: "parents[MOTHER].insurance.contributionDebt",
    kind: "select",
    visible: employmentIn("MANDATE", "SELF_EMPLOYMENT"),
    options: debtOptions,
  },
  {
    id: "fatherEmployment",
    step: "work",
    label: "Jaka jest forma zatrudnienia drugiego rodzica?",
    why: "Drugi rodzic ma własne ubezpieczenie i własną podstawę wymiaru.",
    engineField: "parents[FATHER].insurance.title",
    kind: "choice",
    options: EMPLOYMENT_OPTIONS,
    visible: (answers) => yes(answers.fatherIncluded),
    required: (answers) => yes(answers.fatherIncluded),
    missingHint: "Wskaż formę zatrudnienia drugiego rodzica.",
  },
  {
    id: "fatherSickness",
    step: "work",
    label: "Czy drugi rodzic ma ubezpieczenie chorobowe?",
    why: "Bez ubezpieczenia chorobowego drugiemu rodzicowi nie przysługuje zasiłek.",
    engineField: "parents[FATHER].insurance.sicknessInsurance",
    kind: "choice",
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      fatherEmploymentIn("MANDATE", "SELF_EMPLOYMENT", "OTHER")(answers),
    required: (answers) =>
      yes(answers.fatherIncluded) &&
      fatherEmploymentIn("MANDATE", "SELF_EMPLOYMENT", "OTHER")(answers),
    options: sicknessOptions,
    missingHint: "Wskaż ubezpieczenie chorobowe drugiego rodzica.",
  },
  {
    id: "fatherInsuranceStartDate",
    step: "work",
    label: "Od kiedy drugi rodzic jest ubezpieczony?",
    help: "Opcjonalnie.",
    why: "Pozwala ocenić okresy ubezpieczenia drugiego rodzica.",
    engineField: "parents[FATHER].insurance.startDate",
    kind: "date",
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      answers.fatherEmployment !== "NONE" &&
      answers.fatherEmployment !== "",
    validate: dateError,
  },
  {
    id: "fatherIncome",
    step: "work",
    label: "Wynagrodzenie brutto drugiego rodzica",
    help: "Opcjonalnie. Bez kwoty pokażemy uprawnienia, ale nie kwotę.",
    why: "Podstawa drugiego rodzica służy do wyliczenia jego zasiłku.",
    engineField: "parents[FATHER].basis",
    kind: "number",
    suffix: "zł",
    min: 0,
    max: 1000000,
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      answers.fatherEmployment !== "NONE" &&
      answers.fatherEmployment !== "",
    validate: (value) => numberInRange(value, 0, 1_000_000),
  },
  {
    id: "fatherBasisMode",
    step: "work",
    label: "Podstawa wymiaru drugiego rodzica",
    why: "Podstawa z zaświadczenia nie wymaga ponownego potrącania składek.",
    engineField: "parents[FATHER].basis.method",
    kind: "choice",
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      answers.fatherEmployment !== "NONE" &&
      answers.fatherEmployment !== "",
    options: [
      { value: "GROSS", label: "Z wynagrodzenia brutto" },
      { value: "KNOWN", label: "Mam podstawę z Z-3 / Z-3a" },
    ],
  },
  {
    id: "fatherContributionDebt",
    step: "work",
    label: "Czy drugi rodzic ma zaległości składkowe?",
    why: "Zaległości mogą pozbawić prawa do zasiłku przy dobrowolnym ubezpieczeniu.",
    engineField: "parents[FATHER].insurance.contributionDebt",
    kind: "select",
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      fatherEmploymentIn("MANDATE", "SELF_EMPLOYMENT")(answers),
    options: debtOptions,
  },

  // ------------------------------------------------------------ additional
  {
    id: "leaveStartDate",
    step: "additional",
    label: "Od kiedy korzystasz z urlopu lub świadczenia?",
    why: "Pozwala ustawić obecny urlop we właściwym miejscu planu.",
    engineField: "plan.maternityStartDate / plan.parentalSegments[].startDate",
    kind: "date",
    visible: scenarioIn("ON_LEAVE"),
    required: scenarioIn("ON_LEAVE"),
    validate: dateError,
    missingHint: "Podaj datę rozpoczęcia obecnego urlopu.",
  },
  {
    id: "parentalWeeksUsed",
    step: "additional",
    label: "Ile tygodni urlopu rodzicielskiego już wykorzystano?",
    why: "Odejmiemy wykorzystane tygodnie od wspólnej puli.",
    engineField: "plan.parentalSegments (pozostały wymiar)",
    kind: "number",
    suffix: "tyg.",
    min: 0,
    max: 67,
    visible: (answers) =>
      answers.scenario === "ON_LEAVE" && answers.leaveKind === "PARENTAL",
    required: (answers) =>
      answers.scenario === "ON_LEAVE" && answers.leaveKind === "PARENTAL",
    validate: (value) => numberInRange(value, 0, 67),
    missingHint: "Podaj, ile tygodni urlopu rodzicielskiego już wykorzystano.",
  },
  {
    id: "paymentOption",
    step: "additional",
    label: "Jak chcesz rozliczyć zasiłek?",
    help: "Wariant 81,5% obejmuje cały urlop i wymaga pisemnego wniosku w ciągu 21 dni od porodu.",
    why: "Wybór wariantu zmienia wysokość zasiłku za macierzyński i rodzicielski.",
    engineField: "plan.paymentOption",
    kind: "choice",
    visible: (answers) => answers.scenario !== "CHECK_DOCUMENT",
    required: (answers) => answers.scenario !== "CHECK_DOCUMENT",
    options: [
      {
        value: "STANDARD_100_70",
        label: "100% za macierzyński, 70% za rodzicielski",
        description: "Standardowy wariant bez dodatkowego wniosku.",
      },
      {
        value: "FLAT_81_5",
        label: "81,5% za cały urlop",
        description: "Wymaga pisemnego wniosku; zwykle daje więcej łącznie.",
      },
    ],
  },
  {
    id: "maternityWeeksBeforeBirth",
    step: "additional",
    label: "Ile tygodni urlopu macierzyńskiego przed porodem?",
    help: "Możesz wykorzystać od 0 do 6 tygodni. Wpływa to na daty, nie na prawo.",
    why: "Część urlopu macierzyńskiego można wykorzystać przed porodem.",
    engineField: "plan.maternityWeeksBeforeBirth",
    kind: "select",
    options: [0, 1, 2, 3, 4, 5, 6].map((weeks) => ({
      value: String(weeks),
      label: weeks === 0 ? "0 tygodni" : `${weeks} tyg.`,
    })),
    visible: (answers) =>
      scenarioIn("PREGNANCY", "PLANNING")(answers) ||
      (answers.scenario === "ON_LEAVE" && answers.leaveKind === "MATERNITY"),
  },
  {
    id: "fatherLeaveWeeks",
    step: "additional",
    label: "Ile tygodni urlopu rodzicielskiego planuje drugi rodzic?",
    help: "9 tygodni jest zarezerwowane dla drugiego rodzica i nie przechodzi na Ciebie.",
    why: "Podział urlopu rodzicielskiego zmienia długość i kwoty dla obojga rodziców.",
    engineField: "plan.parentalSegments[FATHER].weeks",
    kind: "select",
    options: Array.from({ length: 10 }, (_, weeks) => ({
      value: String(weeks),
      label: weeks === 0 ? "0 tygodni" : `${weeks} tyg.`,
    })),
    visible: (answers) =>
      yes(answers.fatherIncluded) &&
      answers.scenario !== "CHECK_DOCUMENT" &&
      answers.scenario !== "CARE",
  },
  {
    id: "fatherPaternity",
    step: "additional",
    label: "Czy ojciec dziecka planuje urlop ojcowski?",
    help: "Urlop ojcowski to 14 dni, zwykle wykorzystywane zaraz po porodzie.",
    why: "Urlop ojcowski jest osobnym uprawnieniem ojca dziecka.",
    engineField: "plan.paternity",
    kind: "choice",
    options: [
      { value: "YES", label: "Tak" },
      { value: "NO", label: "Nie" },
    ],
    visible: (answers) =>
      answers.scenario !== "CHECK_DOCUMENT" &&
      (answers.userRole === "FATHER" || yes(answers.fatherIncluded)),
    required: (answers) =>
      answers.scenario !== "CHECK_DOCUMENT" &&
      (answers.userRole === "FATHER" || yes(answers.fatherIncluded)),
  },
  {
    id: "motherNewTitleDuringPregnancy",
    step: "additional",
    label: "Czy w czasie ciąży rozpoczęto nową pracę lub działalność?",
    help: "To nie odbiera uprawnień, ale ZUS może badać, czy umowa nie została zawarta dla pozoru.",
    why: "Nowy tytuł w ciąży jest sygnałem ryzyka w silniku.",
    engineField: "parents[MOTHER].titleStartedDuringPregnancy",
    kind: "choice",
    visible: (answers) =>
      scenarioIn("PREGNANCY", "PLANNING")(answers) &&
      answers.motherEmployment !== "NONE" &&
      answers.motherEmployment !== "",
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
    ],
  },
  {
    id: "motherBasisRaisedDuringPregnancy",
    step: "additional",
    label: "Czy podstawa wymiaru została podniesiona w czasie ciąży?",
    help: "Silnik oznaczy to jako sygnał ryzyka, nie jako automatyczne odebranie prawa.",
    why: "Podniesienie podstawy w ciąży może być badane przez ZUS.",
    engineField: "parents[MOTHER].contributionBasisRaisedDuringPregnancy",
    kind: "choice",
    visible: (answers) =>
      scenarioIn("PREGNANCY", "PLANNING")(answers) &&
      answers.motherEmployment !== "NONE" &&
      answers.motherEmployment !== "",
    options: [
      { value: "NO", label: "Nie" },
      { value: "YES", label: "Tak" },
    ],
  },
]

export function questionsForStep(
  step: WizardStepId,
  answers: SituationAnswers
): QuestionDefinition[] {
  return QUESTIONS.filter(
    (question) =>
      question.step === step && (question.visible?.(answers) ?? true)
  )
}

export function isQuestionRequired(
  question: QuestionDefinition,
  answers: SituationAnswers
): boolean {
  return question.required?.(answers) ?? false
}

export interface QuestionIssue {
  questionId: QuestionDefinition["id"]
  message: string
}

/** Validates the visible questions of one step, including required fields. */
export function validateStep(
  step: WizardStepId,
  answers: SituationAnswers
): QuestionIssue[] {
  const issues: QuestionIssue[] = []
  for (const question of questionsForStep(step, answers)) {
    const value = answers[question.id].trim()
    if (value === "") {
      if (isQuestionRequired(question, answers)) {
        issues.push({
          questionId: question.id,
          message: question.missingHint ?? `Uzupełnij pole: ${question.label}`,
        })
      }
      continue
    }
    const error = question.validate?.(value, answers)
    if (error) issues.push({ questionId: question.id, message: error })
  }
  return issues
}

/** Missing or invalid answers across the whole questionnaire. */
export function missingAnswers(answers: SituationAnswers): QuestionIssue[] {
  return (["situation", "family", "work", "additional"] as const).flatMap(
    (step) => validateStep(step, answers)
  )
}
