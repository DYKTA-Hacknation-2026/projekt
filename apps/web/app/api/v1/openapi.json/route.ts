import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-static"

const document = {
  openapi: "3.1.0",
  info: {
    title: "Zasiłkowy Przewodnik — REST API",
    version: "0.1.0-scaffold",
    description:
      "Kontrakt demonstracyjny. Wszystkie odpowiedzi z danymi rządowymi są oznaczone jako symulacja.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Stan aplikacji, bazy, migracji i pgvector",
        responses: {
          "200": { description: "OK" },
          "503": { description: "Degraded" },
        },
      },
    },
    "/calculations": {
      get: { summary: "Ostatnie obliczenia" },
      post: {
        summary: "Deterministyczne obliczenie zasiłków",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CalculationRequest" },
            },
          },
        },
        responses: {
          "201": { description: "Wynik obliczenia z pełnym śladem" },
          "422": { description: "Błąd walidacji" },
        },
      },
    },
    "/knowledge/search": {
      get: {
        summary:
          "Hybrydowe wyszukiwanie (pgvector + FTS + dokładne terminy, fuzja RRF)",
        description:
          "Zwraca fragmenty źródeł obowiązujące w dniu `asOf` (domyślnie dziś) z odwołaniem do strony/przepisu, URL i metadanymi trafności. Gdy brak wystarczających dowodów: `status: NO_EVIDENCE` i `noEvidence.reason`. Dane osobowe w pytaniu są usuwane przed wyszukiwaniem.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 2, maxLength: 500 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 20, default: 6 },
          },
          {
            name: "asOf",
            in: "query",
            description:
              "Data, na którą przepisy mają obowiązywać (np. termin porodu).",
            schema: { type: "string", format: "date" },
          },
          {
            name: "source",
            in: "query",
            description:
              "Slugi źródeł rozdzielone przecinkami, np. kodeks-pracy,ustawa-zasilkowa.",
            schema: { type: "string" },
          },
          {
            name: "sourceType",
            in: "query",
            description: "Typy źródeł, np. LEGAL_ACT,FORM_INSTRUCTION.",
            schema: { type: "string" },
          },
          {
            name: "tag",
            in: "query",
            description: "Tagi świadczeń, np. PARENTAL,MATERNITY.",
            schema: { type: "string" },
          },
          {
            name: "minRelevance",
            in: "query",
            description: "Minimalna skalibrowana trafność 0–1.",
            schema: { type: "number", minimum: 0, maximum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Status OK/NO_EVIDENCE, fragmenty źródeł z oceną",
          },
          "422": { description: "Błąd walidacji" },
        },
      },
    },
    "/assistant/chat": {
      post: {
        summary: "Asystent RAG z cytatami (bez wymyślania kwot)",
        responses: {
          "200": { description: "Odpowiedź, cytaty i ujawnienie AI" },
          "429": { description: "Limit żądań" },
        },
      },
    },
    "/onboarding": {
      post: {
        summary: "Utworzenie sprawy z kreatora startowego",
        responses: { "201": { description: "Sprawa utworzona" } },
      },
    },
    "/documents/analyze": {
      get: { summary: "Lista przykładów dokumentów" },
      post: {
        summary: "Analiza PDF (multipart) lub przykładu ZUS",
        responses: {
          "200": { description: "Pola do potwierdzenia" },
          "413": { description: "Plik powyżej 10 MB" },
        },
      },
    },
  },
  components: {
    schemas: {
      CalculationRequest: {
        type: "object",
        required: ["input"],
        properties: {
          input: {
            type: "object",
            properties: {
              grossMonthlyIncomeGrosze: { type: "integer", minimum: 0 },
              childrenCount: { type: "integer", minimum: 1, maximum: 5 },
              hasZaZyciem: { type: "boolean" },
              paymentOption: {
                type: "string",
                enum: ["STANDARD_100_70", "FLAT_81_5"],
              },
              maternityWeeksBeforeBirth: {
                type: "integer",
                minimum: 0,
                maximum: 6,
              },
              secondParentParentalWeeks: {
                type: "integer",
                minimum: 0,
                maximum: 9,
              },
              parentalWorkFraction: {
                type: "number",
                minimum: 0,
                maximum: 0.5,
              },
              paternityDays: { type: "integer", minimum: 0, maximum: 14 },
            },
          },
          caseId: { type: "string", format: "uuid" },
          save: { type: "boolean", default: true },
        },
      },
      Problem: {
        type: "object",
        required: ["type", "title", "status", "code", "detail"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          status: { type: "integer" },
          code: { type: "string" },
          detail: { type: "string" },
          instance: { type: "string" },
        },
      },
    },
  },
} as const

export const GET = apiRoute(async () => json(document))
