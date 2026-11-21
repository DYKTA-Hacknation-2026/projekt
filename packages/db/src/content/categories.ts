import { CATEGORY_SLUGS } from "./slugs"

export interface CategorySeed {
  slug: string
  title: string
  description: string
  icon: string
  sortOrder: number
}

export const CONTENT_CATEGORIES: CategorySeed[] = [
  {
    slug: CATEGORY_SLUGS.pregnancy,
    title: "Ciąża i poród",
    description:
      "Prawa w pracy, zwolnienie lekarskie, badania i sytuacje, w których ciąża wymaga dodatkowej uwagi.",
    icon: "HeartPulse",
    sortOrder: 10,
  },
  {
    slug: CATEGORY_SLUGS.benefits,
    title: "Świadczenia i zasiłki",
    description:
      "Zasiłek macierzyński, chorobowy i opiekuńczy: komu przysługują, jak są liczone i jak długo trwają.",
    icon: "HandCoins",
    sortOrder: 20,
  },
  {
    slug: CATEGORY_SLUGS.insurance,
    title: "Ubezpieczenia i zatrudnienie",
    description:
      "Umowa o pracę, zlecenie, działalność gospodarcza, przerwy w ubezpieczeniu i zmiana pracodawcy.",
    icon: "ShieldCheck",
    sortOrder: 30,
  },
  {
    slug: CATEGORY_SLUGS.leaves,
    title: "Urlopy i prawa rodzicielskie",
    description:
      "Macierzyński, rodzicielski i ojcowski — wymiary, podział między rodziców i łączenie z pracą.",
    icon: "CalendarHeart",
    sortOrder: 40,
  },
  {
    slug: CATEGORY_SLUGS.documents,
    title: "Dokumenty i formularze",
    description:
      "Który formularz jest aktualny, kto go wypełnia i gdzie go złożyć. Bez nieaktualnych druków.",
    icon: "FileText",
    sortOrder: 50,
  },
  {
    slug: CATEGORY_SLUGS.procedures,
    title: "Procedury i formalności",
    description:
      "Przewodniki krok po kroku: od wniosku o zasiłek po zgłoszenie urodzenia dziecka.",
    icon: "ListChecks",
    sortOrder: 60,
  },
  {
    slug: CATEGORY_SLUGS.adoption,
    title: "Adopcja i rodzicielstwo zastępcze",
    description:
      "Urlopy, zasiłki i dokumenty dla rodziców adopcyjnych oraz rodzin zastępczych.",
    icon: "HousePlus",
    sortOrder: 70,
  },
  {
    slug: CATEGORY_SLUGS.special,
    title: "Sytuacje szczególne",
    description:
      "Przedwczesny poród, ciąża mnoga, śmierć dziecka, koniec umowy i niepełna historia ubezpieczenia.",
    icon: "LifeBuoy",
    sortOrder: 80,
  },
  {
    slug: CATEGORY_SLUGS.glossary,
    title: "Pojęcia i definicje",
    description:
      "Trudne terminy urzędowe wyjaśnione po ludzku, z przykładem użycia.",
    icon: "BookMarked",
    sortOrder: 90,
  },
]
