import type { ContentItemType } from "@zpr/contracts/content"

import {
  ARTICLE_SLUGS,
  DOCUMENT_SLUGS,
  GLOSSARY_SLUGS,
  GUIDE_SLUGS,
} from "./slugs"

export interface RelationSeed {
  fromType: ContentItemType
  fromSlug: string
  toType: ContentItemType
  toSlug: string
  label?: string
  sortOrder?: number
}

const A = "ARTICLE" as const
const D = "DOCUMENT" as const
const G = "GUIDE" as const
const T = "GLOSSARY" as const

export const CONTENT_RELATIONS: RelationSeed[] = [
  // Artykuły → dokumenty
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: D, toSlug: DOCUMENT_SLUGS.zam, label: "Wniosek o zasiłek", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: D, toSlug: DOCUMENT_SLUGS.z3, label: "Zaświadczenie pracodawcy", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: D, toSlug: DOCUMENT_SLUGS.birthCertificate, label: "Akt urodzenia", sortOrder: 30 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityLeave, toType: D, toSlug: DOCUMENT_SLUGS.leaveApplication, label: "Wniosek urlopowy", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.parentalLeave, toType: D, toSlug: DOCUMENT_SLUGS.leaveApplication, label: "Wniosek o urlop rodzicielski", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.parentalLeave, toType: D, toSlug: DOCUMENT_SLUGS.zam, label: "Zasiłek za urlop rodzicielski", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.paternityLeave, toType: D, toSlug: DOCUMENT_SLUGS.leaveApplication, label: "Wniosek o urlop ojcowski", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.pregnancySickLeave, toType: D, toSlug: DOCUMENT_SLUGS.ezla, label: "e-ZLA", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.pregnancySickLeave, toType: D, toSlug: DOCUMENT_SLUGS.z3, label: "Zaświadczenie Z-3", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.sicknessBenefit, toType: D, toSlug: DOCUMENT_SLUGS.ezla, label: "e-ZLA", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.sicknessBenefit, toType: D, toSlug: DOCUMENT_SLUGS.zas53, label: "ZAS-53 dla przedsiębiorcy", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.sicknessBenefit, toType: D, toSlug: DOCUMENT_SLUGS.zas12, label: "Kontynuacja zasiłku", sortOrder: 30 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.sicknessBenefit, toType: D, toSlug: DOCUMENT_SLUGS.z10, label: "Po ustaniu ubezpieczenia", sortOrder: 40 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.careBenefit, toType: D, toSlug: DOCUMENT_SLUGS.z15, label: "Wniosek Z-15", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.careBenefit, toType: D, toSlug: DOCUMENT_SLUGS.ezla, label: "e-ZLA na opiekę", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.documentsAfterBirth, toType: D, toSlug: DOCUMENT_SLUGS.birthCertificate, label: "Akt urodzenia", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.documentsAfterBirth, toType: D, toSlug: DOCUMENT_SLUGS.zam, label: "Wniosek o zasiłek", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.adoption, toType: D, toSlug: DOCUMENT_SLUGS.adoptionDocuments, label: "Dokumenty adopcyjne", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.adoption, toType: D, toSlug: DOCUMENT_SLUGS.zam, label: "Wniosek ZAM", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.fosterCare, toType: D, toSlug: DOCUMENT_SLUGS.adoptionDocuments, label: "Orzeczenie lub umowa", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.contractEnd, toType: D, toSlug: DOCUMENT_SLUGS.z10, label: "Oświadczenie Z-10", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.stillbirthAndLoss, toType: D, toSlug: DOCUMENT_SLUGS.birthCertificate, label: "Akt urodzenia", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.prematureAndMultiple, toType: D, toSlug: DOCUMENT_SLUGS.zaZyciem, label: "Zaświadczenie „Za życiem”", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.hospitalisation, toType: D, toSlug: DOCUMENT_SLUGS.z15, label: "Zasiłek opiekuńczy", sortOrder: 10 },

  // Artykuły → przewodniki
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: G, toSlug: GUIDE_SLUGS.maternityApplication, label: "Przewodnik krok po kroku", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.pregnancySickLeave, toType: G, toSlug: GUIDE_SLUGS.pregnancySickLeave, label: "Jak uzyskać zasiłek", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.documentsAfterBirth, toType: G, toSlug: GUIDE_SLUGS.documentsAfterBirth, label: "Dokumenty krok po kroku", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.parentalLeave, toType: G, toSlug: GUIDE_SLUGS.splitParentalLeave, label: "Jak podzielić urlop", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.contractEnd, toType: G, toSlug: GUIDE_SLUGS.afterContractEnds, label: "Co zrobić po umowie", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.careBenefit, toType: G, toSlug: GUIDE_SLUGS.careAllowanceApplication, label: "Wniosek o zasiłek", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.adoption, toType: G, toSlug: GUIDE_SLUGS.adoptionStepByStep, label: "Adopcja krok po kroku", sortOrder: 10 },

  // Powiązane artykuły
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: A, toSlug: ARTICLE_SLUGS.parentalLeave, label: "Urlop rodzicielski", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: A, toSlug: ARTICLE_SLUGS.maternityLeave, label: "Urlop macierzyński", sortOrder: 20 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.maternityBenefit, toType: A, toSlug: ARTICLE_SLUGS.amountAndBasis, label: "Podstawa wymiaru", sortOrder: 30 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.pregnancyRights, toType: A, toSlug: ARTICLE_SLUGS.pregnancySickLeave, label: "Zwolnienie w ciąży", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.pregnancySickLeave, toType: A, toSlug: ARTICLE_SLUGS.sicknessBenefit, label: "Zasiłek chorobowy", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.contractEnd, toType: A, toSlug: ARTICLE_SLUGS.insuranceGaps, label: "Przerwy w ubezpieczeniu", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.mandateAndBusiness, toType: A, toSlug: ARTICLE_SLUGS.sicknessInsurance, label: "Ubezpieczenie chorobowe", sortOrder: 10 },
  { fromType: A, fromSlug: ARTICLE_SLUGS.careBenefit, toType: A, toSlug: ARTICLE_SLUGS.hospitalisation, label: "Hospitalizacja", sortOrder: 10 },

  // Słownik → artykuły (relacje w drugą stronę pokażą się w artykule)
  { fromType: T, fromSlug: GLOSSARY_SLUGS.insured, toType: A, toSlug: ARTICLE_SLUGS.sicknessInsurance, label: "Ubezpieczony", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.payer, toType: A, toSlug: ARTICLE_SLUGS.maternityBenefit, label: "Płatnik składek", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.insuranceTitle, toType: A, toSlug: ARTICLE_SLUGS.sicknessInsurance, label: "Tytuł ubezpieczenia", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.sicknessInsurance, toType: A, toSlug: ARTICLE_SLUGS.mandateAndBusiness, label: "Ubezpieczenie chorobowe", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.contributionBasis, toType: A, toSlug: ARTICLE_SLUGS.amountAndBasis, label: "Podstawa składek", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.benefitBasis, toType: A, toSlug: ARTICLE_SLUGS.amountAndBasis, label: "Podstawa zasiłku", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.waitingPeriod, toType: A, toSlug: ARTICLE_SLUGS.entitlementConditions, label: "Okres wyczekiwania", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.sicknessBenefit, toType: A, toSlug: ARTICLE_SLUGS.sicknessBenefit, label: "Zasiłek chorobowy", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.maternityBenefit, toType: A, toSlug: ARTICLE_SLUGS.maternityBenefit, label: "Zasiłek macierzyński", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.benefitPeriod, toType: A, toSlug: ARTICLE_SLUGS.sicknessBenefit, label: "Okres zasiłkowy", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.incapacity, toType: A, toSlug: ARTICLE_SLUGS.pregnancySickLeave, label: "Niezdolność do pracy", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.ezla, toType: A, toSlug: ARTICLE_SLUGS.pregnancySickLeave, label: "e-ZLA", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.careBenefit, toType: A, toSlug: ARTICLE_SLUGS.careBenefit, label: "Zasiłek opiekuńczy", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.parentalLeave, toType: A, toSlug: ARTICLE_SLUGS.parentalLeave, label: "Urlop rodzicielski", sortOrder: 10 },
  { fromType: T, fromSlug: GLOSSARY_SLUGS.adoptionLeave, toType: A, toSlug: ARTICLE_SLUGS.adoption, label: "Urlop adopcyjny", sortOrder: 10 },
]
