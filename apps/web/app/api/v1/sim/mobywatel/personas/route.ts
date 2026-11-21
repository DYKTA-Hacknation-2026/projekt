import { MOBYWATEL_DISCLAIMER, listMobywatelPersonas } from "@/server/sim/mobywatel"
import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-static"

export const GET = apiRoute(async () => {
  return json({
    simulated: true,
    provider: "mObywatel",
    disclaimer: MOBYWATEL_DISCLAIMER,
    personas: listMobywatelPersonas(),
  })
})
