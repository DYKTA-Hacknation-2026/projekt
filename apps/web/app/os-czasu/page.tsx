import type { Metadata } from "next"

import { warsawToday } from "@zpr/ai"
import type { RuleSet } from "@zpr/domain"
import { DbOffline } from "@/components/db-offline"
import { PageHeader } from "@/components/page-header"
import { TimelinePlanner } from "@/components/timeline-planner"
import { timeline } from "@/messages/pl"
import {
  buildTimelineSeed,
  DEMO_SEED,
} from "@/lib/plan-seed"
import {
  getActiveRuleSet,
  getLatestImportForUser,
} from "@/server/api-client"

export const metadata: Metadata = { title: "Plan Rodzicielstwa" }
export const dynamic = "force-dynamic"

export default async function TimelinePage() {
  let ruleSet: RuleSet
  try {
    ruleSet = await getActiveRuleSet()
  } catch (error) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <PageHeader
          eyebrow="Planer"
          title={timeline.title}
          lead={timeline.lead}
        />
        <DbOffline error={error} />
      </div>
    )
  }

  // Prefill from the last accepted data import when one exists. Without it the
  // planner starts with an explicitly labelled demo scenario.
  let seed = DEMO_SEED
  try {
    const latest = await getLatestImportForUser()
    if (latest) {
      seed = buildTimelineSeed(latest.preview.data, latest.scenarioLabel)
    }
  } catch {
    seed = DEMO_SEED
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <TimelinePlanner ruleSet={ruleSet} today={warsawToday()} initial={seed} />
    </div>
  )
}
