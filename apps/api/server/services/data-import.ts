import {
  DATA_IMPORT_CATALOG,
  PROVIDERS,
  buildInitialCaseData,
  buildSummary,
  findScenarioForPersona,
  previewImportData,
  toCalculatorInput,
  type FieldSources,
  type PreviewResult,
  type ScenarioContext,
} from "@zpr/data-sources"
import {
  importedCaseDataSchema,
  sourceDataSchema,
  type DataScope,
  type DataSourceCatalog,
  type DataSourceId,
  type ImportSession,
  type ImportSessionView,
  type ImportedCaseData,
  type SourceFetchResult,
  type SourceIssue,
} from "@zpr/contracts/data-import"
import type { MobywatelPersona } from "@zpr/contracts/mobywatel"
import type {
  ImportSessionRecord,
  ImportSnapshotRecord,
} from "@zpr/db/repositories"

import { findMobywatelPersona } from "@/server/sim/mobywatel"
import { AppError } from "@zpr/contracts/problem"
import { getContainer } from "@/server/container"

import { getActiveRuleSet } from "@/server/services/rule-set"

const ENGINE_VERSION = "1.0.0-sim"

export interface DataImportAcceptance {
  session: ImportSession
  prefill: ImportedCaseData
  fieldSources: FieldSources
  calculationInput: ReturnType<typeof toCalculatorInput>
  eligibility: PreviewResult["eligibility"]
  sickLeave: PreviewResult["sickLeave"]
  onboardingUrl: "/start?import=accepted"
}

export function getDataImportCatalog(): DataSourceCatalog {
  return DATA_IMPORT_CATALOG
}

function requirePersona(personaId: string): MobywatelPersona {
  const persona = findMobywatelPersona(personaId)
  if (!persona) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono profilu testowego. Zaloguj się ponownie przez mObywatel."
    )
  }
  return persona
}

function scenarioContext(
  session: ImportSessionRecord,
  persona: MobywatelPersona,
  results: readonly SourceFetchResult[]
): ScenarioContext {
  const scenario = findScenarioForPersona(persona.id)
  if (!scenario) {
    throw new AppError(
      409,
      "CONFLICT",
      "Ten profil nie ma przygotowanego scenariusza danych demonstracyjnych."
    )
  }
  return {
    scenario,
    persona,
    results,
    scopes: session.scopes as DataScope[],
    now: new Date().toISOString(),
  }
}

function sourceResultFromSnapshot(
  snapshot: ImportSnapshotRecord,
  scopes: readonly DataScope[],
  scenarioId: string
): SourceFetchResult {
  const provider = PROVIDERS[snapshot.sourceId]
  const requestedScopes = scopes.filter((scope) =>
    provider.supportedScopes.includes(scope)
  )
  const parsed = sourceDataSchema.safeParse(snapshot.payload)
  const data =
    snapshot.status === "ERROR" ? null : parsed.success ? parsed.data : null
  const activities = provider.activities
    .filter((activity) =>
      activity.scopes.some((scope) => requestedScopes.includes(scope))
    )
    .map((activity) => ({
      id: activity.id,
      label: activity.label,
      status:
        snapshot.status === "ERROR"
          ? ("ERROR" as const)
          : snapshot.status === "EMPTY"
            ? ("EMPTY" as const)
            : ("SUCCESS" as const),
    }))

  return {
    source: snapshot.sourceId,
    label: provider.label,
    institution: provider.institution,
    requestedScopes,
    status: snapshot.status,
    activities,
    data,
    issues: (snapshot.issues as SourceIssue[]) ?? [],
    provenance: {
      institution: provider.institution,
      transport: "SIMULATED",
      scenarioId,
      fetchedAt: (snapshot.fetchedAt ?? snapshot.createdAt).toISOString(),
    },
  }
}

function buildSessionView(input: {
  session: ImportSessionRecord
  persona: MobywatelPersona
  results: readonly SourceFetchResult[]
  data: ImportedCaseData
  fieldSources: FieldSources
}): ImportSessionView {
  const scenario = findScenarioForPersona(input.persona.id)
  const context = scenarioContext(input.session, input.persona, input.results)
  const summary = buildSummary(context, input.data, input.fieldSources)

  const session: ImportSession = {
    id: input.session.id,
    personaId: input.session.personaId,
    personaName: `${input.persona.firstName} ${input.persona.lastName}`,
    scenarioId: scenario?.id ?? input.session.scenarioId,
    scenarioLabel: scenario?.label ?? "Scenariusz demonstracyjny",
    status: input.session.status,
    scopes: input.session.scopes as DataScope[],
    sources: [...input.results],
    summary,
    createdAt: input.session.createdAt.toISOString(),
    acceptedAt: input.session.acceptedAt?.toISOString() ?? null,
  }

  return {
    session,
    initialData: input.data,
    fieldSources: input.fieldSources,
  }
}

async function loadSession(input: {
  sessionId: string
  ownerKey: string
}): Promise<{
  session: ImportSessionRecord
  persona: MobywatelPersona
  snapshots: ImportSnapshotRecord[]
  results: SourceFetchResult[]
}> {
  const { repositories } = getContainer()
  const session = await repositories.imports.getOwnedSession(
    input.sessionId,
    input.ownerKey
  )
  if (!session) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono sesji pobierania danych."
    )
  }
  const persona = requirePersona(session.personaId)
  const snapshots = await repositories.imports.listSnapshots(session.id)
  const results = snapshots.map((snapshot) =>
    sourceResultFromSnapshot(
      snapshot,
      session.scopes as DataScope[],
      session.scenarioId
    )
  )
  return { session, persona, snapshots, results }
}

export async function startImport(input: {
  personaId: string
  scopes: DataScope[]
  ownerKey: string
}): Promise<ImportSessionView> {
  const persona = requirePersona(input.personaId)
  const scenario = findScenarioForPersona(persona.id)
  if (!scenario) {
    throw new AppError(
      409,
      "CONFLICT",
      "Ten profil nie ma przygotowanego scenariusza danych demonstracyjnych."
    )
  }

  const { repositories } = getContainer()
  const session = await repositories.imports.createSession({
    ownerKey: input.ownerKey,
    personaId: persona.id,
    scenarioId: scenario.id,
    scopes: input.scopes,
    engineVersion: ENGINE_VERSION,
  })

  const initial = buildInitialCaseData({
    scenario,
    persona,
    results: [],
    scopes: input.scopes,
    now: new Date().toISOString(),
  })

  return buildSessionView({
    session,
    persona,
    results: [],
    data: initial.data,
    fieldSources: initial.fieldSources,
  })
}

export async function fetchImportSource(input: {
  sessionId: string
  ownerKey: string
  sourceId: DataSourceId
  now?: string
}): Promise<{ result: SourceFetchResult; session: ImportSessionView }> {
  const { repositories } = getContainer()
  const loaded = await loadSession(input)
  if (
    loaded.session.status === "ACCEPTED" ||
    loaded.session.status === "SKIPPED"
  ) {
    throw new AppError(
      409,
      "CONFLICT",
      "Ta sesja została już zakończona. Rozpocznij nowe pobieranie."
    )
  }

  const provider = PROVIDERS[input.sourceId]
  const scopes = loaded.session.scopes as DataScope[]
  if (!provider.supportedScopes.some((scope) => scopes.includes(scope))) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Wybrany zakres zgody nie obejmuje tego źródła."
    )
  }

  const scenario = findScenarioForPersona(loaded.persona.id)
  if (!scenario) {
    throw new AppError(409, "CONFLICT", "Brak scenariusza dla tego profilu.")
  }

  const result = provider.fetch({
    scenario,
    persona: loaded.persona,
    scopes,
    now: input.now ?? new Date().toISOString(),
  })

  await repositories.imports.saveSnapshot({
    sessionId: loaded.session.id,
    result,
    issues: result.issues,
  })

  const snapshots = await repositories.imports.listSnapshots(loaded.session.id)
  const expected = Object.values(PROVIDERS).filter((item) =>
    item.supportedScopes.some((scope) => scopes.includes(scope))
  )
  if (snapshots.length >= expected.length) {
    await repositories.imports.markCompleted(loaded.session.id)
  } else {
    await repositories.imports.markRunning(loaded.session.id)
  }

  const refreshed = await loadSession(input)
  const initial = buildInitialCaseData({
    scenario,
    persona: loaded.persona,
    results: refreshed.results,
    scopes,
    now: result.provenance.fetchedAt,
  })

  return {
    result,
    session: buildSessionView({
      session: refreshed.session,
      persona: loaded.persona,
      results: refreshed.results,
      data:
        refreshed.session.status === "ACCEPTED"
          ? importedCaseDataSchema.parse(refreshed.session.acceptedData)
          : initial.data,
      fieldSources:
        refreshed.session.status === "ACCEPTED"
          ? (refreshed.session.fieldSources as FieldSources)
          : initial.fieldSources,
    }),
  }
}

export async function getImportSessionView(input: {
  sessionId: string
  ownerKey: string
}): Promise<ImportSessionView> {
  const loaded = await loadSession(input)
  const scenario = findScenarioForPersona(loaded.persona.id)
  if (!scenario) {
    throw new AppError(409, "CONFLICT", "Brak scenariusza dla tego profilu.")
  }

  if (loaded.session.status === "ACCEPTED") {
    return buildSessionView({
      session: loaded.session,
      persona: loaded.persona,
      results: loaded.results,
      data: importedCaseDataSchema.parse(loaded.session.acceptedData),
      fieldSources: loaded.session.fieldSources as FieldSources,
    })
  }

  const initial = buildInitialCaseData({
    scenario,
    persona: loaded.persona,
    results: loaded.results,
    scopes: loaded.session.scopes as DataScope[],
    now: new Date().toISOString(),
  })

  return buildSessionView({
    session: loaded.session,
    persona: loaded.persona,
    results: loaded.results,
    data: initial.data,
    fieldSources: initial.fieldSources,
  })
}

export async function previewImport(input: {
  sessionId: string
  ownerKey: string
  data?: ImportedCaseData
}): Promise<PreviewResult> {
  const loaded = await loadSession(input)
  const context = scenarioContext(
    loaded.session,
    loaded.persona,
    loaded.results
  )
  return previewImportData(
    context,
    input.data,
    await getActiveRuleSet(context.now.slice(0, 10))
  )
}

function assertAcceptable(data: ImportedCaseData): void {
  const required: Array<keyof ImportedCaseData> = [
    "firstName",
    "lastName",
    "email",
    "eventType",
    "childrenCount",
    "employmentType",
    "employerName",
    "insuranceStartDate",
    "coverageMode",
    "grossMonthlyIncomePln",
  ]
  const missing = required.filter((key) => data[key] === undefined)
  if (!data.expectedDueDate && !data.eventDate) {
    missing.push("expectedDueDate")
  }

  if (missing.length > 0) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      `Uzupełnij brakujące dane przed zatwierdzeniem: ${missing.join(", ")}.`,
      {
        issues: missing.map((field) => ({
          path: field,
          message:
            "To pole jest wymagane przed przekazaniem danych do formularza.",
        })),
      }
    )
  }
}

export async function acceptImport(input: {
  sessionId: string
  ownerKey: string
  data: ImportedCaseData
}): Promise<DataImportAcceptance> {
  const preview = await previewImport(input)
  assertAcceptable(preview.data)

  const { repositories } = getContainer()
  const session = await repositories.imports.acceptSession({
    sessionId: input.sessionId,
    ownerKey: input.ownerKey,
    data: preview.data,
    fieldSources: preview.fieldSources as Record<string, unknown>,
    summary: preview.summary,
  })

  const view = await getImportSessionView({
    sessionId: session.id,
    ownerKey: input.ownerKey,
  })

  return {
    session: view.session,
    prefill: preview.data,
    fieldSources: preview.fieldSources,
    calculationInput: toCalculatorInput(preview.data),
    eligibility: preview.eligibility,
    sickLeave: preview.sickLeave,
    onboardingUrl: "/start?import=accepted",
  }
}

export async function skipImport(input: {
  sessionId: string
  ownerKey: string
}): Promise<{ skipped: true }> {
  const { repositories } = getContainer()
  const skipped = await repositories.imports.markSkipped(
    input.sessionId,
    input.ownerKey
  )
  if (!skipped) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Nie znaleziono sesji pobierania danych."
    )
  }
  return { skipped: true }
}

export async function applyImportToUser(input: {
  sessionId: string
  ownerKey: string
  userId: string
}): Promise<void> {
  const { repositories } = getContainer()
  const session = await repositories.imports.getOwnedSession(
    input.sessionId,
    input.ownerKey
  )
  if (!session || session.status !== "ACCEPTED") {
    throw new AppError(
      409,
      "CONFLICT",
      "Dane nie zostały wcześniej zaakceptowane."
    )
  }
  await repositories.imports.applyToUser({
    sessionId: session.id,
    userId: input.userId,
  })
}

export interface LatestImportForUser {
  sessionId: string
  scenarioId: string
  scenarioLabel: string
  acceptedAt: string | null
  preview: PreviewResult
}

export async function getLatestImportForUser(
  userId: string
): Promise<LatestImportForUser | null> {
  const { repositories } = getContainer()
  const session = await repositories.imports.findLatestAcceptedForUser(userId)
  if (!session) return null

  const persona = findMobywatelPersona(session.personaId)
  const scenario = persona ? findScenarioForPersona(persona.id) : null
  if (!persona || !scenario) return null

  const snapshots = await repositories.imports.listSnapshots(session.id)
  const results = snapshots.map((snapshot) =>
    sourceResultFromSnapshot(
      snapshot,
      session.scopes as DataScope[],
      session.scenarioId
    )
  )
  const data = importedCaseDataSchema.parse(session.acceptedData)
  const preview = previewImportData(
    {
      scenario,
      persona,
      results,
      scopes: session.scopes as DataScope[],
      now: new Date().toISOString(),
    },
    data,
    await getActiveRuleSet()
  )

  return {
    sessionId: session.id,
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    acceptedAt: session.acceptedAt?.toISOString() ?? null,
    preview,
  }
}
