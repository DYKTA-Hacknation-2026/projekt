import type { DocumentKind } from "@zpr/contracts/content"

import { CATEGORY_SLUGS } from "./slugs"
import { REVIEW_DATE } from "./meta"

export interface DocumentSeed {
  slug: string
  categorySlug: string
  code?: string
  name: string
  kind: DocumentKind
  purpose: string
  whenRequired: string
  filledBy: string
  submittedBy: string
  informationNeeded: string[]
  additionalDocuments: string[]
  submissionChannels: string[]
  officialUrl?: string
  officialSourceLabel?: string
  generatorHref?: string
  generatorLabel?: string
  note?: string
  sortOrder: number
  lastReviewedAt: string
}

export const CONTENT_DOCUMENTS: DocumentSeed[] = [
  {
    slug: "wniosek-zam",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "ZAM",
    name: "Wniosek o zasiłek macierzyński",
    kind: "FORM",
    purpose:
      "Jeden wniosek o zasiłek macierzyński za okres urlopu macierzyńskiego, na warunkach urlopu macierzyńskiego, rodzicielskiego, uzupełniającego i ojcowskiego.",
    whenRequired:
      "Gdy zasiłek macierzyński wypłaca ZUS albo gdy wnioskodawca nie jest pracownikiem. Pracownik składa u pracodawcy wniosek o urlop, a ZAM jest potrzebny, gdy dokumenty trafiają do ZUS.",
    filledBy: "Osoba ubiegająca się o zasiłek (ubezpieczona matka, ojciec lub inny uprawniony).",
    submittedBy:
      "Wnioskodawca — do płatnika składek albo bezpośrednio do ZUS, zależnie od sytuacji.",
    informationNeeded: [
      "Dane wnioskodawcy i numer PESEL (lub dokument tożsamości).",
      "Dane dziecka: imię, nazwisko, PESEL, data i miejsce urodzenia.",
      "Dane drugiego rodzica, jeżeli dzielicie urlop lub zasiłek.",
      "Okres i rodzaj urlopu, którego dotyczy wniosek.",
      "Numer rachunku bankowego do wypłaty zasiłku.",
    ],
    additionalDocuments: [
      "Skrócony odpis aktu urodzenia — gdy zasiłek wypłaca płatnik składek. Gdy wypłaca ZUS, dane są pozyskiwane z rejestru.",
      "Zaświadczenie Z-3 lub Z-3a, gdy zasiłek wypłaca ZUS.",
      "Zaświadczenie „Za życiem”, jeżeli dziecko je posiada.",
      "Dokumenty adopcyjne lub o umieszczeniu w rodzinie zastępczej, jeżeli dotyczy.",
    ],
    submissionChannels: [
      "PUE/eZUS — najwygodniej, jeśli masz profil.",
      "Płatnik składek (pracodawca, zleceniodawca).",
      "Placówka ZUS lub poczta — w formie papierowej.",
    ],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski",
    officialSourceLabel: "ZUS — aktualne formularze zasiłku macierzyńskiego",
    generatorHref: "/kalkulator",
    generatorLabel: "Sprawdź kwotę w kalkulatorze",
    note:
      "Od 24 października 2026 r. ZAM zastępuje ZUR i ZAO. Jeden formularz obejmuje wszystkie rodzaje urlopu — wypełnia się właściwą część.",
    sortOrder: 10,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zaswiadczenie-z-3",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "Z-3",
    name: "Zaświadczenie płatnika składek — pracownicy",
    kind: "CERTIFICATE",
    purpose:
      "Zaświadczenie pracodawcy o okresach zatrudnienia, urlopach i składnikach wynagrodzenia potrzebnych do ustalenia prawa do zasiłku i jego wysokości.",
    whenRequired:
      "Gdy zasiłek wypłaca ZUS i ubezpieczony jest pracownikiem. Przy kolejnym zasiłku za nieprzerwany okres może wystarczyć ZAS-12.",
    filledBy: "Pracodawca (płatnik składek) na podstawie dokumentacji kadrowej.",
    submittedBy: "Pracodawca przekazuje zaświadczenie do ZUS, często przez PUE/eZUS.",
    informationNeeded: [
      "Dane płatnika i ubezpieczonego.",
      "Okresy zatrudnienia i urlopów.",
      "Składniki wynagrodzenia stanowiące podstawę wymiaru zasiłku.",
      "Informacje o zmianach wpływających na prawo do zasiłku.",
    ],
    additionalDocuments: [
      "e-ZLA lub wniosek o zasiłek macierzyński.",
      "Dokumenty potwierdzające zdarzenie (akt urodzenia, zaświadczenie o przysposobieniu).",
    ],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS", "Poczta"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    officialSourceLabel: "ZUS — formularze zasiłku chorobowego",
    generatorHref: "/dokumenty",
    generatorLabel: "Sprawdź dokument w analizatorze",
    note:
      "Z-3 wypełnia pracodawca, nie pracownik. Aktualizacja formularza: 24 października 2026 r.",
    sortOrder: 20,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zaswiadczenie-z-3a",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "Z-3a",
    name: "Zaświadczenie płatnika składek — osoby niebędące pracownikami",
    kind: "CERTIFICATE",
    purpose:
      "Zaświadczenie płatnika dla ubezpieczonych innych niż pracownicy, np. zleceniobiorców, potrzebne do ustalenia prawa do zasiłku.",
    whenRequired:
      "Gdy zasiłek wypłaca ZUS, a wnioskodawca nie jest pracownikiem. Nie dotyczy osób prowadzących działalność, duchownych i marynarzy — ci nie składają już Z-3b.",
    filledBy: "Płatnik składek, np. zleceniodawca.",
    submittedBy: "Płatnik przekazuje zaświadczenie do ZUS lub wnioskodawca składa je w ZUS.",
    informationNeeded: [
      "Dane płatnika i ubezpieczonego.",
      "Okres podlegania ubezpieczeniu chorobowemu.",
      "Podstawa wymiaru składek i przychód.",
      "Informacje o przerwach i zmianach tytułu ubezpieczenia.",
    ],
    additionalDocuments: [
      "e-ZLA lub wniosek o zasiłek.",
      "Dokumenty potwierdzające zdarzenie.",
    ],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS", "Poczta"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    officialSourceLabel: "ZUS — formularze zasiłku chorobowego",
    note: "Aktualizacja formularza: 24 października 2026 r.",
    sortOrder: 30,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zaswiadczenie-z-3b",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "Z-3b",
    name: "Zaświadczenie Z-3b — formularz wycofany",
    kind: "CERTIFICATE",
    purpose:
      "Dawniej zaświadczenie płatnika dla osób prowadzących pozarolniczą działalność, osób współpracujących, duchownych i marynarzy.",
    whenRequired:
      "Nie jest już wymagane. Od 24 października 2026 r. ZUS ustala prawo do zasiłku na podstawie wniosku i pozostałych dokumentów.",
    filledBy: "Nie wypełniaj nowego Z-3b.",
    submittedBy: "Nie składaj Z-3b — jeśli masz stary formularz, nie wysyłaj go.",
    informationNeeded: [
      "Zamiast Z-3b złóż wniosek ZAM lub ZAS-53 oraz wymagane dokumenty.",
    ],
    additionalDocuments: [
      "Wniosek ZAM — zasiłek macierzyński.",
      "Wniosek ZAS-53 — zasiłek chorobowy.",
    ],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS"],
    officialUrl: "https://www.zus.pl/-/kolejne-uproszczenia-w-zasi%C5%82kach",
    officialSourceLabel: "ZUS — komunikat o zmianach od 24 października 2026 r.",
    note:
      "Formularz wycofany. Zachowaj tę kartę jako wyjaśnienie — nie kopiuj starego druku i nie składaj go w ZUS.",
    sortOrder: 40,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "wniosek-zas-53",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "ZAS-53",
    name: "Wniosek o zasiłek chorobowy",
    kind: "FORM",
    purpose:
      "Wniosek o zasiłek chorobowy składany bezpośrednio przez osobę prowadzącą działalność, osobę współpracującą, duchownego lub marynarza.",
    whenRequired:
      "Gdy zasiłek chorobowy ma wypłacić ZUS, a wnioskodawca rozlicza składki sam za siebie. Przy zasiłku za dalszy nieprzerwany okres stosuje się ZAS-12.",
    filledBy: "Ubezpieczony ubiegający się o zasiłek.",
    submittedBy: "Wnioskodawca — do ZUS, najwygodniej przez PUE/eZUS.",
    informationNeeded: [
      "Dane wnioskodawcy i płatnika składek.",
      "Okres niezdolności do pracy i numer e-ZLA.",
      "Numer rachunku bankowego.",
      "Informacje o tytule ubezpieczenia i podstawie wymiaru.",
    ],
    additionalDocuments: [
      "e-ZLA — lekarz przesyła je elektronicznie.",
      "Zaświadczenie lub dokumenty o okresie ubezpieczenia, jeżeli ZUS ich nie ma.",
      "Z-10, jeżeli wniosek dotyczy okresu po ustaniu ubezpieczenia.",
    ],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS", "Poczta"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    officialSourceLabel: "ZUS — formularze zasiłku chorobowego",
    note: "Aktualizacja formularza: 24 października 2026 r.",
    sortOrder: 50,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zaswiadczenie-zas-12",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "ZAS-12",
    name: "Zaświadczenie płatnika składek — dalszy okres",
    kind: "CERTIFICATE",
    purpose:
      "Uproszczone zaświadczenie płatnika, gdy ZUS ma ustalić prawo do zasiłku chorobowego lub opiekuńczego za dalszy, nieprzerwany okres.",
    whenRequired:
      "Gdy niezdolność do pracy lub opieka trwa nieprzerwanie i nie ma potrzeby ponownego składania pełnego Z-3/Z-3a.",
    filledBy: "Płatnik składek.",
    submittedBy: "Płatnik przekazuje zaświadczenie do ZUS.",
    informationNeeded: [
      "Dane płatnika i ubezpieczonego.",
      "Okres zwolnienia lub opieki.",
      "Informacja, czy zatrudnienie i ubezpieczenie trwają.",
    ],
    additionalDocuments: ["e-ZLA za dalszy okres."],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS", "Poczta"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    officialSourceLabel: "ZUS — formularze zasiłku chorobowego",
    note:
      "Aktualizacja formularza: 26 października 2026 r. Nie zastępuje pierwszego Z-3/Z-3a.",
    sortOrder: 60,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "oswiadczenie-z-10",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "Z-10",
    name: "Oświadczenie po ustaniu ubezpieczenia",
    kind: "CERTIFICATE",
    purpose:
      "Oświadczenie osoby ubiegającej się o zasiłek chorobowy lub świadczenie rehabilitacyjne za okres po ustaniu zatrudnienia lub innego tytułu ubezpieczenia.",
    whenRequired:
      "Gdy niezdolność do pracy przypada po zakończeniu ubezpieczenia, a wnioskodawca ubiega się o zasiłek.",
    filledBy: "Ubezpieczony.",
    submittedBy: "Wnioskodawca — do ZUS.",
    informationNeeded: [
      "Dane wnioskodawcy.",
      "Informacja o innych tytułach zarobkowania i świadczeniach.",
      "Informacja o działalności gospodarczej i prawie do zasiłku dla bezrobotnych.",
    ],
    additionalDocuments: [
      "e-ZLA.",
      "Zaświadczenie od byłego płatnika (Z-3/Z-3a).",
    ],
    submissionChannels: ["PUE/eZUS", "Placówka ZUS", "Poczta"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy",
    officialSourceLabel: "ZUS — formularze zasiłku chorobowego",
    note: "Aktualizacja formularza: 24 października 2026 r.",
    sortOrder: 70,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "e-zla",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "e-ZLA — elektroniczne zwolnienie lekarskie",
    kind: "CERTIFICATE",
    purpose:
      "Zaświadczenie lekarskie o czasowej niezdolności do pracy. Podstawa wypłaty zasiłku chorobowego i opiekuńczego.",
    whenRequired:
      "Gdy lekarz stwierdzi niezdolność do pracy lub konieczność osobistej opieki nad chorym dzieckiem albo członkiem rodziny.",
    filledBy: "Lekarz lub upoważniony asystent medyczny.",
    submittedBy:
      "Lekarz przesyła e-ZLA elektronicznie do ZUS i płatnika. Pacjent nie musi dostarczać wydruku, chyba że zwolnienie wystawiono w trybie alternatywnym.",
    informationNeeded: [
      "Dane pacjenta i płatnika składek.",
      "Okres niezdolności do pracy lub opieki.",
      "Kod B, jeżeli niezdolność przypada na okres ciąży.",
    ],
    additionalDocuments: [
      "Wniosek o zasiłek, jeżeli jest wymagany.",
      "Zaświadczenie o hospitalizacji — w sytuacjach szczególnych.",
    ],
    submissionChannels: [
      "System e-ZLA — lekarz wysyła elektronicznie.",
      "Wydruk e-ZLA lub zaświadczenie alternatywne — tylko gdy system nie działa.",
    ],
    officialUrl: "https://www.zus.pl/ezla",
    officialSourceLabel: "ZUS — e-ZLA",
    note:
      "Sama ciąża nie jest podstawą do e-ZLA. Potrzebna jest niezdolność do pracy stwierdzona przez lekarza. Kod B daje 100% podstawy.",
    sortOrder: 80,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "wniosek-z-15",
    categorySlug: CATEGORY_SLUGS.documents,
    code: "Z-15",
    name: "Wniosek o zasiłek opiekuńczy",
    kind: "FORM",
    purpose:
      "Jeden wniosek o zasiłek opiekuńczy z powodu opieki nad chorym dzieckiem lub innym chorym członkiem rodziny.",
    whenRequired:
      "Gdy ubiegasz się o zasiłek opiekuńczy. Od 24 października 2026 r. Z-15 zastępuje dotychczasowe Z-15A i Z-15B (na eZUS od połowy listopada).",
    filledBy: "Ubezpieczony sprawujący opiekę.",
    submittedBy: "Pracownik — pracodawcy; osoba prowadząca działalność — do ZUS.",
    informationNeeded: [
      "Dane wnioskodawcy i płatnika.",
      "Okres opieki.",
      "Informacja o liczbie dni wykorzystanych przez drugiego rodzica.",
      "Dane osoby, nad którą sprawowana jest opieka.",
    ],
    additionalDocuments: [
      "e-ZLA na opiekę.",
      "Zaświadczenie o zamknięciu żłobka, przedszkola lub szkoły — w odpowiednich sytuacjach.",
    ],
    submissionChannels: ["Płatnik składek", "PUE/eZUS", "Placówka ZUS"],
    officialUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-opiekunczy",
    officialSourceLabel: "ZUS — formularze zasiłku opiekuńczego",
    note:
      "Jeżeli masz starszy formularz Z-15A lub Z-15B, sprawdź, czy Twój płatnik akceptuje go w okresie przejściowym. Nowe wnioski składaj na Z-15.",
    sortOrder: 90,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "skrocony-odpis-aktu-urodzenia",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "Skrócony odpis aktu urodzenia",
    kind: "ATTACHMENT",
    purpose:
      "Dokument potwierdzający urodzenie dziecka, jego dane i pochodzenie. Wykorzystywany przy wnioskach o zasiłek macierzyński.",
    whenRequired:
      "Gdy zasiłek wypłaca płatnik składek albo gdy ZUS nie może pozyskać danych z rejestru. Gdy zasiłek wypłaca ZUS, co do zasady odpis nie jest już dołączany.",
    filledBy: "Kierownik urzędu stanu cywilnego — dokument urzędowy.",
    submittedBy: "Rodzic — pracodawcy lub do ZUS, jeżeli jest wymagany.",
    informationNeeded: [
      "Dane z aktu: imię, nazwisko, data i miejsce urodzenia dziecka.",
      "Dane rodziców.",
    ],
    additionalDocuments: [
      "Wniosek o zasiłek macierzyński.",
      "Dokument tożsamości rodzica.",
    ],
    submissionChannels: ["Urząd stanu cywilnego — odbiór", "PUE/eZUS — jako załącznik, jeśli wymagany"],
    officialUrl: "https://www.gov.pl/web/gov/zglos-urodzenie-dziecka",
    officialSourceLabel: "Gov.pl — zgłoszenie urodzenia dziecka",
    note:
      "Odpis otrzymuje się bezpłatnie po zgłoszeniu urodzenia. Nie kupuj „wzorów” aktu urodzenia w internecie.",
    sortOrder: 100,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "zaswiadczenie-za-zyciem",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "Zaświadczenie „Za życiem”",
    kind: "CERTIFICATE",
    purpose:
      "Potwierdza ciężkie i nieodwracalne upośledzenie albo nieuleczalną chorobę zagrażającą życiu, które powstały w prenatalnym okresie rozwoju dziecka lub w czasie porodu.",
    whenRequired:
      "Gdy rodzic ubiega się o wydłużony urlop rodzicielski (65/67 tygodni) lub inne uprawnienia programu „Za życiem”.",
    filledBy: "Lekarz specjalista, na zasadach określonych w ustawie.",
    submittedBy: "Rodzic — pracodawcy lub do ZUS, zależnie od wniosku.",
    informationNeeded: [
      "Dane dziecka i rodzica.",
      "Zaświadczenie lekarskie.",
      "Wniosek o urlop lub zasiłek.",
    ],
    additionalDocuments: [
      "Wniosek o urlop rodzicielski.",
      "Wniosek ZAM, jeżeli zasiłek wypłaca ZUS.",
    ],
    submissionChannels: ["Płatnik składek", "PUE/eZUS", "Placówka ZUS"],
    officialUrl: "https://www.gov.pl/web/rodzina/za-zyciem",
    officialSourceLabel: "Gov.pl — program „Za życiem”",
    note:
      "Zaświadczenie wystawia lekarz specjalista. Nie zastępuje go zwykłe zaświadczenie od lekarza rodzinnego.",
    sortOrder: 110,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "dokumenty-adopcyjne",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "Dokumenty adopcyjne i rodziny zastępczej",
    kind: "ATTACHMENT",
    purpose:
      "Potwierdzają przyjęcie dziecka na wychowanie i uprawniają do urlopu na warunkach urlopu macierzyńskiego oraz zasiłku.",
    whenRequired:
      "Przy wniosku o urlop lub zasiłek związany z przysposobieniem albo rodziną zastępczą.",
    filledBy: "Sąd opiekuńczy, starosta lub ośrodek pomocy społecznej — zależnie od dokumentu.",
    submittedBy: "Rodzic — pracodawcy i do ZUS.",
    informationNeeded: [
      "Zaświadczenie sądu o dacie wystąpienia z wnioskiem o przysposobienie.",
      "Odpis aktu urodzenia dziecka.",
      "Orzeczenie o umieszczeniu w rodzinie zastępczej albo umowa z starostą.",
      "Decyzja o odroczeniu obowiązku szkolnego, jeżeli dotyczy.",
    ],
    additionalDocuments: [
      "Wniosek o urlop.",
      "Wniosek ZAM.",
      "Dokument tożsamości rodzica.",
    ],
    submissionChannels: ["Płatnik składek", "PUE/eZUS", "Placówka ZUS"],
    officialUrl: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/niezbedne-dokumenty",
    officialSourceLabel: "ZUS — dokumenty do zasiłku macierzyńskiego",
    note:
      "Zakres dokumentów zależy od tego, czy chodzi o przysposobienie, rodzinę zastępczą, czy rodzinę zastępczą zawodową. Zawodowa jest wyłączona z zasiłku macierzyńskiego.",
    sortOrder: 120,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "wniosek-urlopowy-pracodawca",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "Wniosek urlopowy do pracodawcy",
    kind: "DEMO",
    purpose:
      "Wniosek o udzielenie urlopu macierzyńskiego, rodzicielskiego lub ojcowskiego. Nie jest formularzem ZUS — to dokument kadrowy.",
    whenRequired:
      "Gdy pracownik chce skorzystać z urlopu. Pracodawca udziela urlopu na podstawie wniosku i dokumentów wymaganych rozporządzeniem.",
    filledBy: "Pracownik.",
    submittedBy: "Pracownik — pracodawcy.",
    informationNeeded: [
      "Imię i nazwisko pracownika.",
      "Rodzaj i wymiar urlopu.",
      "Okres, na który urlop ma być udzielony.",
      "Informacja o wcześniej wykorzystanym urlopie i częściach.",
      "Oświadczenie o urlopie wykorzystanym przez drugiego rodzica — przy rodzicielskim.",
    ],
    additionalDocuments: [
      "Skrócony odpis aktu urodzenia.",
      "Zaświadczenie sądu — przy adopcji.",
      "Zaświadczenie „Za życiem” — przy wydłużonym urlopie.",
    ],
    submissionChannels: ["Pracodawca — papierowo lub elektronicznie"],
    officialUrl: "https://dziennikustaw.gov.pl/DU/2025/322",
    officialSourceLabel: "Rozporządzenie MRPiPS — wnioski urlopowe (Dz.U. 2025 poz. 322)",
    note:
      "To dokument demonstracyjny, a nie oficjalny formularz ZUS. Wzór wniosku ustala pracodawca, ale musi on zawierać dane wymagane rozporządzeniem.",
    sortOrder: 130,
    lastReviewedAt: REVIEW_DATE,
  },
  {
    slug: "dokument-tozsamosci-i-rachunek",
    categorySlug: CATEGORY_SLUGS.documents,
    name: "Dokument tożsamości i numer rachunku",
    kind: "ATTACHMENT",
    purpose:
      "Potwierdzenie tożsamości wnioskodawcy i wskazanie rachunku, na który ZUS ma wypłacić zasiłek.",
    whenRequired:
      "Przy składaniu wniosku w ZUS, gdy dane nie są potwierdzone elektronicznie, oraz przy wypłacie zasiłku.",
    filledBy: "Wnioskodawca.",
    submittedBy: "Wnioskodawca — do ZUS lub płatnika.",
    informationNeeded: [
      "Dokument tożsamości: dowód osobisty lub paszport.",
      "Numer rachunku bankowego.",
    ],
    additionalDocuments: ["Wniosek o zasiłek."],
    submissionChannels: ["PUE/eZUS — dane z profilu", "Placówka ZUS — okazanie dokumentu"],
    officialUrl: "https://www.zus.pl/ezus",
    officialSourceLabel: "ZUS — PUE/eZUS",
    note:
      "Nie przesyłaj skanów dokumentów tożsamości e-mailem. Wniosek złóż przez PUE/eZUS albo osobiście w placówce.",
    sortOrder: 140,
    lastReviewedAt: REVIEW_DATE,
  },
]
