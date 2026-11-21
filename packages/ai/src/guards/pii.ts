/**
 * Removes identifiers the assistant never needs before a message is sent to
 * a model provider or stored: PESEL, bank account numbers, ID-card and
 * passport numbers, e-mail addresses and phone numbers. Amounts and dates are
 * kept — they are needed for guidance and the user typed them on purpose.
 */

export interface Redaction {
  kind: "PESEL" | "IBAN" | "ID_DOCUMENT" | "EMAIL" | "PHONE"
  count: number
}

const RULES: { kind: Redaction["kind"]; pattern: RegExp; replacement: string }[] = [
  {
    kind: "IBAN",
    pattern: /\b(?:PL\s?)?\d{2}(?:[ -]?\d{4}){6}\b/gi,
    replacement: "[numer konta usunięty]",
  },
  {
    kind: "PESEL",
    pattern: /\b\d{11}\b/g,
    replacement: "[PESEL usunięty]",
  },
  {
    kind: "ID_DOCUMENT",
    pattern: /\b[A-Z]{3}\s?\d{6}\b|\b[A-Z]{2}\s?\d{7}\b/g,
    replacement: "[numer dokumentu usunięty]",
  },
  {
    kind: "EMAIL",
    pattern: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g,
    replacement: "[e-mail usunięty]",
  },
  {
    kind: "PHONE",
    pattern: /(?:\+48[ -]?)?\b\d{3}[ -]\d{3}[ -]\d{3}\b|\+48\s?\d{9}\b/g,
    replacement: "[telefon usunięty]",
  },
]

export function scrubPii(text: string): { text: string; redactions: Redaction[] } {
  let output = text
  const redactions: Redaction[] = []
  for (const rule of RULES) {
    let count = 0
    output = output.replace(rule.pattern, () => {
      count += 1
      return rule.replacement
    })
    if (count > 0) redactions.push({ kind: rule.kind, count })
  }
  return { text: output, redactions }
}
