/**
 * Prompt-injection defences.
 *
 * Retrieved passages and user messages are data. These helpers (1) detect
 * instruction-like text so the orchestrator can add a reminder and log the
 * attempt, and (2) neutralise retrieved text so it cannot close or forge the
 * delimiters the model is told to trust. Detection never grants or removes
 * tool permissions — those are fixed in code.
 */

const INSTRUCTION_PATTERNS: RegExp[] = [
  /\b(zignoruj|pomi[nń]|zapomnij|nie\s+stosuj)\b[^.\n]{0,60}\b(instrukcj|polece[nń]|zasad|regu[lł]|wcze[sś]niejsz|powy[zż]sz)/i,
  /\bignore\b[^.\n]{0,40}\b(previous|prior|above|all|earlier)\b[^.\n]{0,20}\b(instructions?|rules|prompts?)/i,
  /\b(disregard|override)\b[^.\n]{0,40}\b(instructions?|rules|system)/i,
  /\b(system\s*prompt|prompt\s+systemowy|instrukcj[aęi]\s+systemow)/i,
  /\b(jeste[sś]\s+teraz|you\s+are\s+now|act\s+as|udawaj|wciel\s+si[eę])\b/i,
  /\b(tryb\s+deweloper|developer\s+mode|jailbreak|DAN\b)/i,
  /\b(potwierd[zź]|napisz|powiedz)\b[^.\n]{0,40}\b(że\s+)?(mam|masz|przys[lł]uguje)\b[^.\n]{0,40}\b(prawo|100\s?%|ca[lł]y\s+rok)/i,
  /\b(wykonaj|uruchom|execute|run)\b[^.\n]{0,30}\b(sql|zapytanie|query|polecenie|command|kod|code)\b/i,
  /\b(drop|delete|truncate|update|insert)\s+(table|from|into)\b/i,
  /<\/?\s*(system|assistant|instructions?|source|evidence|tool)[^>]*>/i,
  /^\s*(system|assistant)\s*:/im,
]

export interface InjectionScan {
  flagged: boolean
  matches: string[]
}

export function detectInjection(text: string): InjectionScan {
  const matches = INSTRUCTION_PATTERNS.filter((pattern) => pattern.test(text)).map(
    (pattern) => pattern.source.slice(0, 40)
  )
  return { flagged: matches.length > 0, matches }
}

/**
 * Neutralises a retrieved passage: strips markup that imitates our
 * delimiters or chat roles and flags instruction-like content. The text
 * stays readable for the model and the citation view.
 */
export function neutralizeEvidence(text: string): {
  text: string
  flagged: boolean
} {
  const flagged = detectInjection(text).flagged
  const cleaned = text
    // Remove anything that looks like our own tags or chat-role markup.
    .replace(/<\/?\s*(system|assistant|user|instructions?|source|evidence|tool|untrusted)[^>]*>/gi, " ")
    .replace(/^\s*(system|assistant|user)\s*:/gim, "")
    // Control characters and zero-width characters used to hide instructions.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏⁠﻿]/g, "")
    .trim()
  return { text: cleaned, flagged }
}
