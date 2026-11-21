import type {
  TimelineBasis,
  TimelineCategory,
  TimelineOwner,
} from "@/lib/timeline"

export const ownerLabel: Record<TimelineOwner, string> = {
  MAMA: "Mama",
  TATA: "Tata",
  OBOJE: "Wspólnie",
}

export const ownerShortLabel: Record<TimelineOwner, string> = {
  MAMA: "Mama",
  TATA: "Tata",
  OBOJE: "Oboje",
}

export const categoryLabel: Record<TimelineCategory, string> = {
  LEAVE: "Urlop",
  BENEFIT: "Zasiłek",
  DOCUMENT: "Formalność",
  DEADLINE: "Termin",
}

export const basisLabel: Record<TimelineBasis, string> = {
  STATUTORY: "Termin ustawowy",
  RECOMMENDED: "Zalecane działanie",
  PLAN: "Wynika z planu",
}

/** Solid dot / accent for each parent. Never the only signal — a label follows. */
export const ownerDot: Record<TimelineOwner, string> = {
  MAMA: "bg-success",
  TATA: "bg-info",
  OBOJE: "bg-accent-foreground/70",
}

export const ownerText: Record<TimelineOwner, string> = {
  MAMA: "text-success-foreground",
  TATA: "text-info-foreground",
  OBOJE: "text-accent-foreground",
}

export const ownerSurface: Record<TimelineOwner, string> = {
  MAMA: "border-success/35 bg-success/12 text-success-foreground",
  TATA: "border-info/35 bg-info/12 text-info-foreground",
  OBOJE: "border-accent-foreground/25 bg-accent/70 text-accent-foreground",
}

export const ownerBar: Record<"MAMA" | "TATA", string> = {
  MAMA: "border-success/45 bg-success/18 text-success-foreground hover:bg-success/26",
  TATA: "border-info/45 bg-info/18 text-info-foreground hover:bg-info/26",
}

export const periodSurface: Record<"MAMA" | "TATA", string> = {
  MAMA: "border-success/50 bg-success/10",
  TATA: "border-info/50 bg-info/10",
}

export const categorySurface: Record<TimelineCategory, string> = {
  LEAVE: "border-primary/35 bg-primary/10 text-foreground",
  BENEFIT: "border-success/35 bg-success/10 text-success-foreground",
  DOCUMENT: "border-info/35 bg-info/10 text-info-foreground",
  DEADLINE: "border-warning/40 bg-warning/12 text-warning-foreground",
}

export const categoryDot: Record<TimelineCategory, string> = {
  LEAVE: "bg-primary",
  BENEFIT: "bg-success",
  DOCUMENT: "bg-info",
  DEADLINE: "bg-warning",
}

export const documentPreparedBy: Record<string, string> = {
  YOU: "Ty",
  OTHER_PARENT: "Drugi rodzic",
  HOSPITAL: "Szpital",
  COURT: "Sąd",
  ZUS: "ZUS",
  EMPLOYER: "Pracodawca",
  PAYER: "Płatnik",
  DOCTOR: "Lekarz",
  CIVIL_REGISTRY: "Urząd stanu cywilnego",
}

export const documentSubmitTo: Record<string, string> = {
  EMPLOYER: "Pracodawca",
  ZUS: "ZUS",
  EMPLOYER_OR_ZUS: "Pracodawca lub ZUS",
  PAYER: "Płatnik",
  PAYER_OR_ZUS: "Płatnik lub ZUS",
  NONE: "Nie wymaga złożenia",
}

export const borderTone: Record<TimelineOwner, string> = {
  MAMA: "border-l-success",
  TATA: "border-l-info",
  OBOJE: "border-l-accent-foreground/50",
}
