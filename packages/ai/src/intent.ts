import type { AssistantToolName } from "./types"

/**
 * Deterministic intent classification for Polish questions.
 *
 * It drives the tool policy: whatever the language model decides, an
 * eligibility question gets `checkBenefitEligibility`, an amount question
 * gets `calculateBenefit`, and every legal question gets retrieval first.
 * Patterns use stems so that inflected forms match (zasiłek / zasiłku).
 */

export type Intent =
  | "ELIGIBILITY"
  | "NEXT_STEPS"
  | "AMOUNT"
  | "SCENARIOS"
  | "DOCUMENTS"
  | "SUBMISSION"
  | "DEADLINES"
  | "TIMELINE"
  | "DURATION"
  | "WORK_DURING_LEAVE"
  | "RISKS"
  | "SPECIAL_SITUATION"
  | "PROFILE"
  | "GENERAL_LEGAL"

export interface IntentClassification {
  intents: Intent[]
  /** Tools the policy requires this turn, in the order they should run. */
  requiredTools: AssistantToolName[]
  /** The question concerns entitlements or law — retrieval is mandatory. */
  legal: boolean
  /** Loss, illness or another sensitive situation — answer with extra care. */
  sensitive: boolean
  outOfScope: boolean
}

const PATTERNS: Record<Intent, RegExp> = {
  ELIGIBILITY:
    /(czy\s+(mi\s+|mnie\s+)?(przys[lł]ug|dostan|nale[zż]|b[eę]d[eę]\s+mia[lł]|mog[eę]\s+dosta|mam\s+prawo)|przys[lł]uguje\s+mi|mam\s+prawo|uprawnion|uprawnie[nń]|kwalifikuj|co\s+(mi\s+)?(przys[lł]uguje|nale[zż]y))/i,
  NEXT_STEPS:
    /(co\s+(powinn\w*|musz\w*|mam|trzeba)\s+(teraz\s+)?(zrobi|za[lł]atwi)|jakie\s+kroki|od\s+czego\s+zacz|co\s+dalej|krok\s+po\s+kroku|na\s+co\s+uwa[zż]a)/i,
  AMOUNT:
    /(\bile\b[^?]{0,40}(dostan|b[eę]d[eę]\s+dostawa|wynosi|wyniesie|wynios|pieni[eę]|z[lł]\b|z[lł]otych|kasy|zap[lł]ac|wyp[lł]a)|jak[aą]\s+kwot|wysoko[sś][cć]\s+(zasi[lł]k|[sś]wiadcz)|kwot[aęy]|wylicz|policz|oblicz|na\s+r[eę]k[eę]|brutto|netto)/i,
  SCENARIOS:
    /(podzieli[cć]|podzia[lł]|rozdzieli|przej[aą][cć]|przejmie|przejmowa|wariant|scenariusz|por[oó]wna|81[,.]5|lepiej\s+(wzi[aą][cć]|wybra)|tata\s+(mo[zż]e\s+)?(wzi|przej)|ojciec\s+(mo[zż]e\s+)?(wzi|przej)|m[aą][zż]\s+(chce\s+)?(wzi|przej)|oboje\s+rodzic)/i,
  DOCUMENTS:
    /(dokument|formularz|druk|wnios(ek|ku|ki)|za[sś]wiadcze|\bZ-?3[ab]?\b|\bZAM\b|\bZUR\b|\bZAO\b|\bZAS-?53\b|odpis\s+aktu|e-?ZLA|co\s+(musz[eę]|trzeba)\s+(z[lł]o[zż]y|przygotowa|dostarczy))/i,
  SUBMISSION:
    /(gdzie\s+(mam\s+)?(wys[lł]a|z[lł]o[zż]y|z[lł]o[zż]|zanie[sś]|przes[lł]a|dostarczy)|komu\s+(z[lł]o[zż]y|da[cć]|przekaza)|kto\s+wyp[lł]aca|do\s+kogo|przez\s+(pue|ezus)|w\s+jaki\s+spos[oó]b\s+z[lł]o[zż])/i,
  DEADLINES:
    /(termin|do\s+kiedy|kiedy\s+(musz[eę]|trzeba|nale[zż]y|najp[oó][zź]niej|z[lł]o[zż]y)|ile\s+(mam\s+)?czasu|najp[oó][zź]niej|przedawni|spó[zź]ni|deadline)/i,
  TIMELINE:
    /(o[sś]\s+czasu|harmonogram|kalendarz|plan\s+urlop|kiedy\s+(zaczyna|ko[nń]czy|sko[nń]czy|wr[oó]c)|od\s+kiedy\s+do\s+kiedy|rozpisz|zaplanowa)/i,
  DURATION:
    /(jak\s+d[lł]ugo|ile\s+(trwa|tygodni|dni|miesi[eę]cy)|przez\s+ile|d[lł]ugo[sś][cć]|wymiar)/i,
  WORK_DURING_LEAVE:
    /(p[oó][lł]\s+etatu|po[lł]ow[eę]\s+etatu|cz[eę][sś][cć]\s+etatu|pracowa[cć]\s+(podczas|w\s+trakcie|na)|[lł][aą]czy[cć]\s+(z\s+)?prac|[lł][aą]czenie\s+(urlopu\s+)?z\s+prac|praca\s+(podczas|w\s+trakcie|na)\s+urlop|dorabia)/i,
  RISKS:
    /(ryzyk|utrat|straci[cć]|strac[eę]|odebra|wstrzyma|zaleg[lł]o[sś]|zad[lł]u[zż]|kontrol|nie\s+wyp[lł]ac|odmow|pu[lł]apk)/i,
  SPECIAL_SITUATION:
    /(martw|poroni|zmar[lł]|[sś]mier[cć]|zgon|wcze[sś]niak|przedwczesn|hospitaliz|szpital|niepe[lł]nospraw|za\s+[zż]yciem|adopc|przysposob|rodzin[aęy]\s+zast[eę]pcz|bli[zź]ni|tr[oó]jacz|samotn|szczeg[oó]ln|trudn[aej]\s+sytuac|ci[eę][zż]k[aio]\s+chor)/i,
  PROFILE:
    /(moje\s+dane|m[oó]j\s+profil|moim\s+profilu|co\s+o\s+mnie\s+wiesz|moja\s+sprawa|moich\s+danych|z\s+kreatora)/i,
  GENERAL_LEGAL:
    /(zasi[lł]e?k|urlop|macierzy[nń]sk|rodzicielsk|ojcowsk|wychowawcz|\bzus\b|[sś]wiadcze|ubezpiecz|sk[lł]adk|\bl-?4\b|zwolnieni[ea]\s+lekarsk|ci[aą][zż]|porod|por[oó]d|dzieck|kodeks\s+pracy|ustaw[aeyi]\b|ustawie|przepis(y|[oó]w|ami|ach)\b|art\.\s*\d|pracodaw|b2b|dzia[lł]alno[sś]|zleceni|etat)/i,
}

const LOSS = /(martw|poroni|zmar[lł]|[sś]mier[cć]|zgon|ci[eę][zż]k[aio]\s+chor)/i

const TOOL_RULES: { intent: Intent; tools: AssistantToolName[] }[] = [
  { intent: "PROFILE", tools: ["getUserInsuranceProfile"] },
  { intent: "ELIGIBILITY", tools: ["checkBenefitEligibility"] },
  { intent: "RISKS", tools: ["checkBenefitEligibility"] },
  {
    intent: "NEXT_STEPS",
    tools: ["checkBenefitEligibility", "getRequiredDocuments", "getRelevantDeadlines"],
  },
  { intent: "AMOUNT", tools: ["calculateBenefit"] },
  { intent: "SCENARIOS", tools: ["compareLeaveScenarios"] },
  { intent: "DOCUMENTS", tools: ["getRequiredDocuments"] },
  { intent: "SUBMISSION", tools: ["getRequiredDocuments"] },
  { intent: "DEADLINES", tools: ["getRelevantDeadlines"] },
  { intent: "TIMELINE", tools: ["getBenefitTimeline"] },
  { intent: "WORK_DURING_LEAVE", tools: ["getRelevantDeadlines"] },
]

export function classifyIntent(text: string): IntentClassification {
  const intents = (Object.keys(PATTERNS) as Intent[]).filter((intent) =>
    PATTERNS[intent].test(text)
  )
  const specific = intents.filter((intent) => intent !== "GENERAL_LEGAL")
  const legal =
    intents.includes("GENERAL_LEGAL") ||
    specific.some((intent) => intent !== "PROFILE")

  const requiredTools: AssistantToolName[] = []
  if (legal) requiredTools.push("searchKnowledgeBase")
  for (const rule of TOOL_RULES) {
    if (intents.includes(rule.intent)) {
      for (const tool of rule.tools) {
        if (!requiredTools.includes(tool)) requiredTools.push(tool)
      }
    }
  }

  return {
    intents,
    requiredTools,
    legal,
    sensitive: LOSS.test(text),
    outOfScope: intents.length === 0,
  }
}
