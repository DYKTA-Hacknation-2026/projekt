/**
 * Stable slugs for the seeded Centrum wiedzy content.
 *
 * Slugs are the public URLs and the join key used by the seed, so they must not
 * change once a page has been shared. Titles may change freely in the database.
 */

export const CATEGORY_SLUGS = {
  pregnancy: "ciaza-i-porod",
  benefits: "swiadczenia-i-zasilki",
  insurance: "ubezpieczenia-i-zatrudnienie",
  leaves: "urlopy-i-prawa-rodzicielskie",
  documents: "dokumenty-i-formularze",
  procedures: "procedury-i-formalnosci",
  adoption: "adopcja-i-rodzicielstwo-zastepcze",
  special: "sytuacje-szczegolne",
  glossary: "pojecia-i-definicje",
} as const

export const ARTICLE_SLUGS = {
  pregnancyRights: "prawa-kobiety-w-ciazy-w-pracy",
  pregnancySickLeave: "zwolnienie-lekarskie-w-ciazy",
  prematureAndMultiple: "przedwczesny-porod-i-ciaza-mnoga",
  maternityBenefit: "zasilek-macierzynski",
  sicknessBenefit: "zasilek-chorobowy",
  careBenefit: "zasilek-opiekunczy",
  amountAndBasis: "wysokosc-i-podstawa-wymiaru",
  entitlementConditions: "warunki-prawa-do-zasilku",
  sicknessInsurance: "ubezpieczenie-chorobowe",
  mandateAndBusiness: "umowa-zlecenie-i-dzialalnosc",
  insuranceGaps: "przerwy-w-ubezpieczeniu-i-zmiana-pracy",
  maternityLeave: "urlop-macierzynski",
  parentalLeave: "urlop-rodzicielski",
  paternityLeave: "urlop-ojcowski",
  documentsAfterBirth: "dokumenty-po-urodzeniu-dziecka",
  adoption: "adopcja-urlopy-i-zasilki",
  fosterCare: "rodzicielstwo-zastepcze",
  stillbirthAndLoss: "urodzenie-martwego-dziecka-i-smierc-dziecka",
  contractEnd: "koniec-umowy-w-ciazy",
  multipleTitles: "kilka-tytulow-ubezpieczenia",
  hospitalisation: "hospitalizacja-dziecka-lub-matki",
} as const

export const DOCUMENT_SLUGS = {
  zam: "wniosek-zam",
  z3: "zaswiadczenie-z-3",
  z3a: "zaswiadczenie-z-3a",
  z3b: "zaswiadczenie-z-3b",
  zas53: "wniosek-zas-53",
  zas12: "zaswiadczenie-zas-12",
  z10: "oswiadczenie-z-10",
  ezla: "e-zla",
  z15: "wniosek-z-15",
  birthCertificate: "skrocony-odpis-aktu-urodzenia",
  zaZyciem: "zaswiadczenie-za-zyciem",
  adoptionDocuments: "dokumenty-adopcyjne",
  leaveApplication: "wniosek-urlopowy-pracodawca",
  identityAndAccount: "dokument-tozsamosci-i-rachunek",
} as const

export const GUIDE_SLUGS = {
  maternityApplication: "jak-ubiegac-sie-o-zasilek-macierzynski",
  pregnancySickLeave: "jak-uzyskac-zasilek-chorobowy-w-ciazy",
  documentsAfterBirth: "dokumenty-po-narodzinach-krok-po-kroku",
  splitParentalLeave: "jak-podzielic-urlop-rodzicielski",
  afterContractEnds: "co-zrobic-po-zakonczeniu-umowy",
  careAllowanceApplication: "wniosek-o-zasilek-opiekunczy",
  adoptionStepByStep: "adopcja-krok-po-kroku",
} as const

export const GLOSSARY_SLUGS = {
  insured: "ubezpieczony",
  payer: "platnik-skladek",
  insuranceTitle: "tytul-ubezpieczenia",
  sicknessInsurance: "ubezpieczenie-chorobowe",
  contributionBasis: "podstawa-wymiaru-skladek",
  benefitBasis: "podstawa-wymiaru-zasilku",
  waitingPeriod: "okres-wyczekiwania",
  sicknessBenefit: "zasilek-chorobowy",
  maternityBenefit: "zasilek-macierzynski",
  benefitPeriod: "okres-zasilkowy",
  incapacity: "niezdolnosc-do-pracy",
  ezla: "e-zla",
  careBenefit: "zasilek-opiekunczy",
  parentalLeave: "urlop-rodzicielski",
  adoptionLeave: "urlop-na-warunkach-urlopu-macierzynskiego",
} as const
