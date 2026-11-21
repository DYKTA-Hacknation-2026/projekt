import type { DataSourceId } from "@zpr/contracts/data-import"

import type { DataSourceProvider } from "../types"
import { employerProvider } from "./employer"
import { ezlaProvider } from "./ezla"
import { pueProvider } from "./pue"
import { uscProvider } from "./usc"
import { zusProvider } from "./zus"

export const PROVIDERS: Record<DataSourceId, DataSourceProvider> = {
  ZUS: zusProvider,
  EMPLOYER: employerProvider,
  EZLA: ezlaProvider,
  USC: uscProvider,
  PUE: pueProvider,
}

export const PROVIDER_ORDER: readonly DataSourceId[] = [
  "ZUS",
  "EMPLOYER",
  "EZLA",
  "USC",
  "PUE",
]

export {
  employerProvider,
  ezlaProvider,
  pueProvider,
  uscProvider,
  zusProvider,
}
