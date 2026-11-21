import { calculationRequestSchema } from "@zpr/contracts/calculator"
import { paginationSchema } from "@zpr/contracts/common"

import { getContainer } from "@/server/container"
import { apiRoute, json, parseSearchParams, readJson } from "@/server/http/route"
import { runCalculation } from "@/server/services/calculations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = apiRoute(async (request) => {
  const input = await readJson(request, calculationRequestSchema)
  const result = await runCalculation(input)
  return json(result, { status: 201 })
})

export const GET = apiRoute(async (request) => {
  const { limit } = parseSearchParams(request, paginationSchema)
  const { repositories } = getContainer()
  const calculations = await repositories.benefits.listRecentCalculations(limit)

  return json({ calculations, simulated: true })
})
