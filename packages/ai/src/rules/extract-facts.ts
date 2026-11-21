import type { CaseFactsInput } from "@zpr/contracts/assistant-tools"
import { addMonths, isIsoDate } from "@zpr/domain"

/**
 * Deterministic extraction of case facts from the user's own messages, used
 * by the offline rules model. Messages are processed oldest first, so a later
 * statement overrides an earlier one (conversational continuity). Only what
 * the user explicitly wrote is extracted — nothing is inferred from tone.
 */

export interface ExtractedFacts {
  facts: CaseFactsInput
  grossMonthlyIncomePln?: number
  prefersFlatRate?: boolean
  secondParentWeeks?: number
  parentalWorkFraction?: number
}

const MONTHS: Record<string, number> = {
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, wrzesnia: 9, września: 9, pazdziernika: 10,
  października: 10, listopada: 11, grudnia: 12,
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function toIso(day: number, month: number, year: number): string | undefined {
  const iso = `${year}-${pad(month)}-${pad(day)}`
  return isIsoDate(iso) ? iso : undefined
}

/** Finds a date right after a keyword: ISO, dd.mm.yyyy or "10 marca 2027". */
function dateAfter(text: string, keyword: RegExp): string | undefined {
  const source = new RegExp(
    `${keyword.source}[^0-9]{0,25}(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}|\\d{1,2}\\s+[a-ząćęłńóśźż]+\\s+\\d{4})`,
    "i"
  )
  const match = text.match(source)
  const raw = match?.[match.length - 1]
  if (!raw) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isIsoDate(raw) ? raw : undefined
  const numeric = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (numeric) return toIso(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]))
  const named = raw.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})$/i)
  if (named) {
    const month = MONTHS[named[2]!.toLowerCase()]
    if (month) return toIso(Number(named[1]), month, Number(named[3]))
  }
  return undefined
}

function income(text: string): number | undefined {
  const context = /(zarabiam|zarobk|wynagrodzeni|pensj|przych[oó]d|brutto|pobieram|dostaj[eę]|podstaw)/i
  if (!context.test(text)) return undefined
  const thousands = text.match(/(\d{1,3}(?:[,.]\d)?)\s*(tys\.?|tysi[eę]c\w*|k)\b/i)
  if (thousands) return Math.round(Number(thousands[1]!.replace(",", ".")) * 1000)
  const amount = text.match(/(\d[\d\s ]{2,9}(?:[,.]\d{1,2})?)\s*(z[lł]|pln|z[lł]otych)/i)
  if (amount) {
    const value = Number(amount[1]!.replace(/[\s ]/g, "").replace(",", "."))
    return Number.isFinite(value) && value > 0 ? value : undefined
  }
  return undefined
}

function applyMessage(state: ExtractedFacts, text: string, today: string): void {
  const facts = state.facts
  const lower = text.toLowerCase()

  // Insurance title — the most specific phrase wins.
  if (/(b2b|dzia[lł]alno[sś][cć]|jednoosobow|samozatrudni|przedsi[eę]biorc|w[lł]asn[aąej]+\s+firm)/i.test(lower)) {
    facts.employmentType = "SELF_EMPLOYMENT"
  } else if (/(zleceni|umow[aęy]\s+zlece)/i.test(lower)) {
    facts.employmentType = "MANDATE"
  } else if (/(umow[aęyie]+\s+o\s+prac|na\s+etacie|etat\b|jestem\s+pracownik|zatrudnion[aey]?\s+(na|w))/i.test(lower)) {
    facts.employmentType = "EMPLOYMENT"
  } else if (/(bezrobotn|nie\s+pracuj[eę]|nie\s+mam\s+(pracy|[zż]adnej\s+umowy)|bez\s+ubezpieczenia)/i.test(lower)) {
    facts.employmentType = "NONE"
  }

  if (/(nie\s+(op[lł]acam|p[lł]ac[eę]|mam|odprowadzam)\s+(dobrowoln\w*\s+)?(ubezpieczeni\w*\s+|sk[lł]adk\w*\s+)?chorobow|bez\s+(dobrowolnego\s+)?(ubezpieczenia\s+)?chorobowego)/i.test(lower)) {
    facts.sicknessInsurance = "NONE"
  } else if (/((op[lł]acam|p[lł]ac[eę]|mam|odprowadzam)\s+(te[zż]\s+)?(dobrowoln\w*\s+)?(ubezpieczeni\w*\s+|sk[lł]adk\w*\s+(na\s+)?)?chorobow|dobrowolne\s+(ubezpieczenie\s+)?chorobowe)/i.test(lower)) {
    facts.sicknessInsurance = "VOLUNTARY"
  }

  if (/(jestem\s+w\s+ci[aą][zż]y|w\s+ci[aą][zż]y|spodziewam\s+si[eę]|spodziewamy\s+si[eę]|ci[aą][zż]a\b)/i.test(lower)) {
    facts.familyEvent = facts.familyEvent ?? "PREGNANCY"
    if (/jestem\s+w\s+ci[aą][zż]y/i.test(lower)) facts.parentRole = "MOTHER"
  }
  if (/(urodzi[lł]a?\s+si[eę]|urodzi[lł]am|po\s+porodzie|poród\s+by[lł])/i.test(lower)) {
    facts.familyEvent = "BIRTH"
  }
  if (/adopc|przysposob/i.test(lower)) facts.familyEvent = "ADOPTION"
  if (/rodzin\w*\s+zast[eę]pcz/i.test(lower)) {
    facts.familyEvent = "FOSTER_CARE"
    if (/zawodow/i.test(lower)) facts.professionalFosterFamily = true
  }

  // Grammatical gender of first-person verbs is a reliable, explicit signal.
  if (/\b(jestem\s+(mam[aą]|matk[aą])|powinnam|mog[lł]abym|chcia[lł]abym|urodzi[lł]am|[a-ząćęńóśźż]+łam\b)/i.test(lower)) {
    facts.parentRole = "MOTHER"
  } else if (/\b(jestem\s+(tat[aą]|ojcem)|powinienem|m[oó]g[lł]bym|chcia[lł]bym|jako\s+(tata|ojciec)|[a-ząćęńóśźż]+łem\b)/i.test(lower)) {
    facts.parentRole = "FATHER"
  }

  const due = dateAfter(text, /(termin\w*(\s+porodu)?|przewidywan\w+\s+(dat\w+|termin\w*)|poród\s+(ma\s+by[cć]|planowany))/)
  if (due) facts.expectedDueDate = due
  const born = dateAfter(text, /(urodzi[lł]\w*(\s+si[eę])?|data\s+porodu|poród\s+by[lł])/)
  if (born) {
    facts.eventDate = born
    facts.familyEvent = facts.familyEvent === "ADOPTION" || facts.familyEvent === "FOSTER_CARE" ? facts.familyEvent : "BIRTH"
  }

  const since = lower.match(/od\s+(\d{1,2})\s+(miesi[eę]c\w*|lat\w*|rok\w*)/)
  if (since) {
    const amount = Number(since[1])
    const months = /miesi/.test(since[2]!) ? amount : amount * 12
    facts.insuranceStartDate = addMonths(today, -months)
  } else if (/od\s+(miesi[aą]ca|roku)\b/.test(lower)) {
    facts.insuranceStartDate = addMonths(today, /miesi/.test(lower) ? -1 : -12)
  }
  const sinceDate = dateAfter(text, /(ubezpiecz\w*|pracuj[eę]|zatrudnion\w*)\s+od/)
  if (sinceDate) facts.insuranceStartDate = sinceDate

  if (/bli[zź]ni[eę]t|bli[zź]niak|bli[zź]niacz/i.test(lower)) facts.childrenCount = 2
  if (/tr[oó]jacz/i.test(lower)) facts.childrenCount = 3
  if (/czworacz/i.test(lower)) facts.childrenCount = 4
  if (/pi[eę]cioracz/i.test(lower)) facts.childrenCount = 5

  if (/za\s+[zż]yciem/i.test(lower) && !/(bez|nie\s+mam\w*)\s+(za[sś]wiadczenia\s+)?["„]?za\s+[zż]yciem/i.test(lower)) {
    if (/(mam|mamy|otrzyma[lł]\w*|ma)\s+(za[sś]wiadczenie\s+)?["„]?za\s+[zż]yciem/i.test(lower)) {
      facts.hasZaZyciem = true
    }
  }

  if (/(nie\s+mam\s+([zż]adnych\s+)?zaleg[lł]|bez\s+zaleg[lł]|sk[lł]adki\s+(mam\s+)?op[lł]acone)/i.test(lower)) {
    facts.contributionArrears = false
  } else if (/(zaleg[lł]\w*|d[lł]ug\w*|zad[lł]u[zż]\w*)\s+(w\s+)?(sk[lł]adk|zus|wobec\s+zus)/i.test(lower)) {
    facts.contributionArrears = true
  }

  const staff = lower.match(/(\d{1,5})\s*(os[oó]b|pracownik\w*|ubezpieczon\w*)/)
  if (staff) facts.payerSize = Number(staff[1]) > 20 ? "OVER_20" : "UP_TO_20"
  if (/(wi[eę]cej\s+ni[zż]|ponad|powy[zż]ej)\s+20\s+(os[oó]b|pracownik)/i.test(lower)) facts.payerSize = "OVER_20"

  const pay = income(text)
  if (pay !== undefined) state.grossMonthlyIncomePln = pay
  if (/81[,.]5/.test(lower)) state.prefersFlatRate = true
  const fatherWeeks = lower.match(/(tata|ojciec|m[aą][zż]|partner)[^.?!]{0,40}?(\d{1,2})\s+tygodni/)
  if (fatherWeeks) state.secondParentWeeks = Math.min(9, Number(fatherWeeks[2]))
  if (/p[oó][lł]\s+etatu|po[lł]ow[eę]\s+etatu/i.test(lower)) state.parentalWorkFraction = 0.5
}

export function extractFacts(userTexts: readonly string[], today: string): ExtractedFacts {
  const state: ExtractedFacts = { facts: {} }
  for (const text of userTexts) applyMessage(state, text, today)
  if (state.facts.employmentType === "EMPLOYMENT") delete state.facts.sicknessInsurance
  return state
}
