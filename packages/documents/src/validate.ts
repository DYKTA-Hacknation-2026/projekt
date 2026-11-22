import {
  FORM_TITLES,
  normalizeFieldValue,
  type DocumentFormCode,
  type ExtractedField,
  type ValidationFinding,
} from "@zpr/contracts/documents"
import { ruleSetFor } from "@zpr/domain/engine"

/**
 * Validators (P6-04). They never change values; they only report. Severity:
 *   ERROR   — blocks applying the values until the user fixes the field,
 *   WARNING — the user must read it (withdrawn form, legal consequence),
 *   INFO    — guidance (attachments, fields to double-check).
 */

export interface ValidationContext {
  form: DocumentFormCode
  attachments: readonly DocumentFormCode[]
  fields: readonly ExtractedField[]
  /** Evaluation date (Europe/Warsaw). */
  asOf: string
  hasTextLayer: boolean
  ocrAttempted: boolean
  detectionFromFileNameOnly: boolean
}

const LEGACY_REPLACEMENT: Partial<Record<DocumentFormCode, string>> = {
  ZUR: "ZAM",
  ZAO: "ZAM",
  "Z-3b": "— (druk zniesiony; ZUS ustala dane sam, wniosek ZAS-53 lub ZAM)",
}

function value(fields: readonly ExtractedField[], key: string): string | null {
  const field = fields.find((item) => item.semanticKey === key)
  if (!field || field.value === "") return null
  return normalizeFieldValue(field, field.value) || null
}

export function validateFormVersion(ctx: ValidationContext): ValidationFinding[] {
  if (!LEGACY_REPLACEMENT[ctx.form]) return []
  // LR-05: forms are tied to the rule set in force on the filing date. Without a
  // readable document date we use today — and say so, because a claim filed
  // before 24.10.2026 on the old form is a legally different situation (A-14).
  const documentDate = value(ctx.fields, "documentDate")
  const reference = documentDate ?? ctx.asOf
  const merged = ruleSetFor(reference)?.parameters.forms.zamMerged ?? true
  if (merged) {
    return [
      {
        severity: "WARNING",
        code: "FORM_WITHDRAWN",
        ruleId: "LR-05",
        message: `${FORM_TITLES[ctx.form]}. Od 24 października 2026 r. ZUR i ZAO zastąpił formularz ZAM, a Z-3b zniesiono. ${
          documentDate ? `Dokument ma datę ${documentDate}.` : "Nie odczytano daty dokumentu — przyjęto dzisiejszą."
        } Złóż dokument na aktualnym druku (${LEGACY_REPLACEMENT[ctx.form]}). Dane z pól możesz wykorzystać do symulacji po sprawdzeniu.`,
        legalBasis: "Treść zadania s. 12 przyp. 3–5 (LR-05)",
      },
    ]
  }
  return [
    {
      severity: "INFO",
      code: "FORM_PRE_REFORM",
      ruleId: "LR-05",
      message: `Dokument sprzed 24.10.2026 r. (${documentDate}) na dawnym druku ${ctx.form}. Wtedy był to właściwy formularz — potwierdź datę złożenia, bo od niej zależy wersja przepisów.`,
      legalBasis: "Treść zadania s. 12 przyp. 3–5; Poradnik ZUS s. 35",
    },
  ]
}

export function validateRequired(ctx: ValidationContext): ValidationFinding[] {
  return ctx.fields
    .filter((field) => field.required && (field.value === "" || normalizeFieldValue(field, field.value) === null))
    .map((field) => ({
      severity: "ERROR" as const,
      code: field.value === "" ? "FIELD_MISSING" : "FIELD_INVALID",
      fieldKey: field.key,
      message:
        field.value === ""
          ? `Nie odczytano pola „${field.label}”. Uzupełnij je przed obliczeniem.`
          : `Wartość pola „${field.label}” ma niepoprawny format. Popraw ją przed obliczeniem.`,
    }))
}

export function validateDates(ctx: ValidationContext): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const start = value(ctx.fields, "insuranceStartDate")
  const end = value(ctx.fields, "insuranceEndDate")
  const birth = value(ctx.fields, "eventDate")
  const due = value(ctx.fields, "expectedDueDate")
  const periodStart = value(ctx.fields, "benefitPeriodStart")
  const periodEnd = value(ctx.fields, "benefitPeriodEnd")
  const event = birth ?? due

  if (start && end && end < start) {
    findings.push({ severity: "ERROR", code: "DATES_INSURANCE_ORDER", fieldKey: "koniecUbezpieczenia", message: `Koniec ubezpieczenia (${end}) jest wcześniejszy niż jego początek (${start}). Sprawdź daty.` })
  }
  if (periodStart && periodEnd && periodEnd < periodStart) {
    findings.push({ severity: "ERROR", code: "DATES_PERIOD_ORDER", fieldKey: "okresDo", message: `Koniec okresu zasiłku (${periodEnd}) jest wcześniejszy niż jego początek (${periodStart}).` })
  }
  if (end && event && end < event) {
    findings.push({
      severity: "WARNING",
      code: "INSURANCE_ENDED_BEFORE_EVENT",
      fieldKey: "koniecUbezpieczenia",
      ruleId: "LR-72",
      message: `Ubezpieczenie chorobowe ustało (${end}) przed ${birth ? "porodem" : "przewidywanym terminem porodu"} (${event}). Prawo do zasiłku macierzyńskiego po ustaniu ubezpieczenia przysługuje tylko w szczególnych przypadkach — silnik to sprawdzi.`,
      legalBasis: "U art. 29 ust. 1, art. 30",
    })
  }
  if (start && event && start > event) {
    findings.push({ severity: "WARNING", code: "INSURANCE_STARTED_AFTER_EVENT", fieldKey: "poczatekUbezpieczenia", message: `Ubezpieczenie zaczęło się (${start}) po dacie porodu (${event}). Sprawdź daty.` })
  }
  if (birth && birth > ctx.asOf) {
    findings.push({ severity: "WARNING", code: "BIRTH_IN_FUTURE", fieldKey: "dataPorodu", message: `Data porodu (${birth}) jest w przyszłości. Jeśli to przewidywany termin, wpisz ją w polu „Przewidywany termin porodu”.` })
  }
  if (birth && due && Math.abs(Date.parse(birth) - Date.parse(due)) > 120 * 86_400_000) {
    findings.push({ severity: "WARNING", code: "DATES_DUE_BIRTH_GAP", fieldKey: "terminPorodu", message: "Data porodu i przewidywany termin różnią się o ponad 4 miesiące. Sprawdź, czy daty dotyczą tego samego dziecka." })
  }
  return findings
}

export function validateAttachments(ctx: ValidationContext): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const title = value(ctx.fields, "employmentType")
  const benefitApplication = ctx.form === "ZAM" || ctx.form === "ZUR" || ctx.form === "ZAO"
  const hasPayerCertificate = ctx.attachments.some((code) => code === "Z-3" || code === "Z-3a" || code === "Z-3b")
  if (benefitApplication && (title === "EMPLOYMENT" || title === "MANDATE") && !hasPayerCertificate) {
    findings.push({
      severity: "INFO",
      code: "ATTACHMENT_PAYER_CERTIFICATE",
      message: `Gdy zasiłek wypłaca ZUS, płatnik dołącza zaświadczenie ${title === "EMPLOYMENT" ? "Z-3" : "Z-3a"} — bez niego ZUS nie ustali podstawy wymiaru. Pracodawca przekazuje dokumenty do ZUS w ciągu 7 dni.`,
      legalBasis: "R1316 § 3 ust. 1–2",
    })
  }
  if (benefitApplication && !value(ctx.fields, "eventDate") && value(ctx.fields, "expectedDueDate")) {
    findings.push({
      severity: "INFO",
      code: "ATTACHMENT_DUE_DATE_CERTIFICATE",
      message: "Za okres przed porodem dołącz zaświadczenie lekarskie o przewidywanej dacie porodu.",
      legalBasis: "R1316 § 13 ust. 1 pkt 1",
    })
  }
  if (ctx.form === "Z-3" || ctx.form === "Z-3a") {
    findings.push({
      severity: "INFO",
      code: "PAYER_CERTIFICATE_ONLY",
      message: "Zaświadczenie płatnika jest załącznikiem. Wniosek składa ubezpieczony (pracownik — u pracodawcy; pozostali — wniosek ZAM).",
      legalBasis: "R1316 § 3, § 12",
    })
  }
  return findings
}

export function validateExtractionQuality(ctx: ValidationContext): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  if (ctx.form === "UNKNOWN") {
    findings.push({ severity: "WARNING", code: "FORM_UNKNOWN", message: "Nie rozpoznano formularza ZUS w treści dokumentu. Uzupełnij pola ręcznie albo wgraj Z-3, Z-3a lub ZAM." })
  } else if (ctx.detectionFromFileNameOnly) {
    findings.push({ severity: "WARNING", code: "FORM_FROM_FILENAME", message: `Rodzaj formularza (${ctx.form}) wskazała tylko nazwa pliku — treść go nie potwierdza. Sprawdź dokument.` })
  }
  if (!ctx.hasTextLayer) {
    findings.push({
      severity: "WARNING",
      code: ctx.ocrAttempted ? "OCR_USED" : "NO_TEXT_LAYER",
      message: ctx.ocrAttempted
        ? "Dokument jest skanem — pola odczytano przez OCR z niższą pewnością. Sprawdź każde pole."
        : "Dokument nie ma warstwy tekstowej (skan). OCR jest w tej wersji wyłączony — uzupełnij pola ręcznie.",
    })
  }
  const ambiguous = ctx.fields.find((field) => field.key === "kwotaNiejednoznaczna" && field.value !== "")
  if (ambiguous && !value(ctx.fields, "monthlyBasisGrosze") && !value(ctx.fields, "grossMonthlyGrosze")) {
    findings.push({
      severity: "WARNING",
      code: "BASIS_AMBIGUOUS",
      fieldKey: ambiguous.key,
      message: "Odczytano kwotę, ale z opisu nie wynika, czy to wynagrodzenie brutto, czy podstawa wymiaru zasiłku. Nie przeniesiemy jej automatycznie — wpisz ją we właściwe pole.",
      legalBasis: "U art. 36, art. 3 pkt 4 (podstawa po odliczeniu składek, art. 36 ust. 1)",
    })
  }
  const review = ctx.fields.filter((field) => field.value !== "" && field.needsReview)
  if (review.length > 0) {
    findings.push({ severity: "INFO", code: "FIELDS_NEED_REVIEW", message: `Pola do sprawdzenia (niższa pewność odczytu): ${review.map((field) => field.label).join(", ")}.` })
  }
  if (ctx.form === "ZAS-53" || ctx.form === "ZAS-12" || ctx.form === "POSWIADCZENIE") {
    findings.push({ severity: "INFO", code: "FORM_NOT_MAPPED", message: `${FORM_TITLES[ctx.form]}: odczytujemy dane pomocnicze, ale ten dokument nie zawiera podstawy wymiaru do kalkulatora.` })
  }
  return findings
}

const ORDER = { ERROR: 0, WARNING: 1, INFO: 2 } as const

export function validateExtraction(ctx: ValidationContext): ValidationFinding[] {
  return [
    ...validateFormVersion(ctx),
    ...validateRequired(ctx),
    ...validateDates(ctx),
    ...validateAttachments(ctx),
    ...validateExtractionQuality(ctx),
  ].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])
}
