import { generateBenefitTimeline } from "@zpr/domain/engine"
import { DEMO_DUE_DATE } from "@/lib/plan-seed"

export interface HomePlanItem {
  id: string
  owner: "MOTHER" | "FATHER" | "BOTH"
  title: string
  start: string
  end?: string
  days?: number
  description: string
  kind: "maternity" | "parental" | "paternity" | "deadline"
}

/** A public, synthetic example using the planner's demo date and initial choices. */
export function homePlanExample(): HomePlanItem[] {
  const report = generateBenefitTimeline({
    asOf: DEMO_DUE_DATE,
    event: {
      kind: "PREGNANCY",
      expectedDueDate: DEMO_DUE_DATE,
      childrenCount: 1,
    },
    parents: [
      { role: "MOTHER", insurance: { title: "EMPLOYMENT" } },
      { role: "FATHER", insurance: { title: "EMPLOYMENT" } },
    ],
    plan: {
      maternityWeeksBeforeBirth: 2,
      parentalSegments: [
        { parent: "MOTHER", weeks: 32 },
        { parent: "FATHER", weeks: 9 },
      ],
      paternity: [{ days: 14 }],
    },
  })
  const periods: HomePlanItem[] = []
  for (const period of report.periods) {
    const kind =
      period.benefit === "MATERNITY"
        ? "maternity"
        : period.benefit === "PARENTAL"
          ? "parental"
          : "paternity"
    // Maternity is split at birth by the engine; display it as one continuous leave.
    const previous = periods.find(
      (item) => item.owner === period.parent && item.kind === kind
    )
    if (previous) {
      previous.end = period.end
      previous.days = (previous.days ?? 0) + period.days
      continue
    }
    periods.push({
      id: period.id,
      owner: period.parent,
      title:
        kind === "maternity"
          ? "Macierzyński"
          : kind === "parental"
            ? "Rodzicielski"
            : "Ojcowski",
      start: period.start,
      end: period.end,
      days: period.days,
      kind,
      description:
        kind === "maternity"
          ? "W tym przykładzie mama rozpoczyna urlop 2 tygodnie przed przewidywanym porodem. Pozostałą część wykorzystuje po narodzinach."
          : kind === "paternity"
            ? "W tym przykładzie tata bierze 2 tygodnie urlopu ojcowskiego po narodzinach dziecka, równolegle z urlopem mamy."
            : period.parent === "MOTHER"
              ? "Po macierzyńskim mama wykorzystuje 32 tygodnie ze wspólnej puli urlopu rodzicielskiego."
              : "Po urlopie mamy tata przejmuje opiekę na 9 tygodni. To część urlopu rodzicielskiego, której nie można przekazać drugiemu rodzicowi.",
    })
  }
  const deadlines: HomePlanItem[] = report.timeline
    .filter((entry) => entry.kind === "DEADLINE")
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      owner: entry.parent ?? "BOTH",
      title: entry.title,
      start: entry.date,
      description: entry.detail,
      kind: "deadline",
    }))
  return [...periods, ...deadlines]
}
