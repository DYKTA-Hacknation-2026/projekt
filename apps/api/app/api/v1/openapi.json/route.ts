import { z } from "zod"

import {
  assistantChatSchema,
  assistantReplySchema,
  assistantStreamRequestSchema,
} from "@zpr/contracts/assistant"
import {
  assessmentInputSchema,
  scenarioComparisonSchema,
} from "@zpr/contracts/engine"

import { apiRoute, json } from "@/server/http/route"

export const dynamic = "force-static"

const engineRequestBody = {
  required: true,
  content: {
    "application/json": {
      schema: z.toJSONSchema(assessmentInputSchema, { io: "input" }),
    },
  },
}

function engineResponses(description: string) {
  return {
    "200": { description },
    "422": {
      description: "Błąd walidacji lub niespójne dane wejściowe",
      content: {
        "application/problem+json": {
          schema: { $ref: "#/components/schemas/Problem" },
        },
      },
    },
    "429": { description: "Limit żądań" },
  }
}

const document = {
  openapi: "3.1.0",
  info: {
    title: "Zasiłkowy Przewodnik — REST API",
    version: "1.0.0",
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
        summary:
          "Asystent — strumień wiadomości (AI SDK UI message stream, SSE)",
        description:
          "Treść: { id: uuid rozmowy, message: { id, role: 'user', parts: [{ type: 'text', text }] }, options?: { useProfile, asOf }, trigger? }. Historia jest wczytywana z bazy; klient wysyła tylko najnowszą wiadomość. Części strumienia: text-delta, tool-* (wyniki narzędzi), data-evidence, data-grounding, data-followups.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: z.toJSONSchema(assistantStreamRequestSchema),
            },
          },
        },
        responses: {
          "200": { description: "text/event-stream" },
          "404": {
            description: "Rozmowa należy do innej sesji lub nie istnieje",
          },
          "422": { description: "Nieprawidłowa treść żądania" },
          "429": { description: "Limit żądań" },
        },
      },
    },
    "/assistant/messages": {
      post: {
        summary: "Asystent — odpowiedź REST (bez strumienia)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: z.toJSONSchema(assistantChatSchema) },
          },
        },
        responses: {
          "200": {
            description:
              "Odpowiedź, źródła, wyniki narzędzi i raport ugruntowania",
            content: {
              "application/json": {
                schema: z.toJSONSchema(assistantReplySchema),
              },
            },
          },
          "429": { description: "Limit żądań" },
          "503": { description: "Model lub baza wiedzy chwilowo niedostępne" },
        },
      },
    },
    "/assistant/conversations": {
      get: { summary: "Rozmowy bieżącej sesji" },
      delete: {
        summary:
          "Usunięcie wszystkich rozmów bieżącej sesji (z cytatami i wywołaniami narzędzi)",
      },
    },
    "/assistant/conversations/{id}": {
      get: {
        summary: "Historia rozmowy z wynikami narzędzi i źródłami",
        responses: { "404": { description: "Brak lub cudza rozmowa" } },
      },
      delete: {
        summary: "Usunięcie rozmowy",
        responses: {
          "204": { description: "Usunięto" },
          "404": { description: "Brak lub cudza rozmowa" },
        },
      },
    },
    "/assistant/session": {
      get: {
        summary:
          "Dostępność profilu dla asystenta i tryb odpowiedzi (bez danych osobowych)",
      },
    },
    "/eligibility/evaluate": {
      post: {
        summary: "Ocena uprawnień (silnik deterministyczny)",
        description:
          "Ustalenia per rodzic i świadczenie (ELIGIBLE, CONDITIONAL, NOT_ELIGIBLE, NEEDS_INPUT, MANUAL_REVIEW) z przyczynami, warunkami, brakującymi informacjami, ryzykami, zastosowanymi regułami i źródłami. Szacunek, nie decyzja ZUS.",
        requestBody: engineRequestBody,
        responses: engineResponses("Ocena uprawnień"),
      },
    },
    "/benefits/calculate": {
      post: {
        summary:
          "Pełne wyliczenie świadczeń (okresy, kwoty, podział między rodziców)",
        description:
          "Dokładna arytmetyka wymierna, jedno zaokrąglenie na pozycję (do grosza, połówki w górę). Brak podstawy wymiaru → kwota `null` i status BASIS_UNKNOWN zamiast szacunku.",
        requestBody: engineRequestBody,
        responses: engineResponses(
          "Pełna ocena: breakdown, totals, periods, allocation, appliedRules, sources, assumptions, missingEvidence, warnings, nextSteps"
        ),
      },
    },
    "/scenarios/compare": {
      post: {
        summary: "Porównanie planów urlopowych dla tych samych faktów",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: z.toJSONSchema(scenarioComparisonSchema, { io: "input" }),
            },
          },
        },
        responses: engineResponses(
          "Wyniki scenariuszy z różnicą względem pierwszego"
        ),
      },
    },
    "/timeline": {
      post: {
        summary: "Oś czasu: okresy świadczeń i terminy z datami",
        requestBody: engineRequestBody,
        responses: engineResponses("Okresy, terminy i podział między rodziców"),
      },
    },
    "/documents/required": {
      post: {
        summary:
          "Wymagane dokumenty i miejsce złożenia dla każdego świadczenia",
        requestBody: engineRequestBody,
        responses: engineResponses(
          "Lista dokumentów (R1316, R322), płatnik i wersja formularzy"
        ),
      },
    },
    "/rulesets": {
      get: {
        summary:
          "Wersje reguł, parametry ze statusem weryfikacji, katalog reguł ze źródłami, założenia i scenariusze nieobsługiwane",
        responses: { "200": { description: "OK" } },
      },
    },
    "/onboarding": {
      post: {
        summary: "Utworzenie sprawy z kreatora startowego",
        responses: { "201": { description: "Sprawa utworzona" } },
      },
    },
    "/data-import/sources": {
      get: {
        summary: "Dostępne symulowane źródła, zakresy zgody i kroki pobierania",
        responses: {
          "200": { description: "Katalog źródeł bez danych osobowych" },
        },
      },
    },
    "/data-import/sessions": {
      post: {
        summary: "Rozpoczęcie pobierania po zgodzie na wybrane zakresy danych",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["scopes"],
                properties: {
                  scopes: {
                    type: "array",
                    minItems: 1,
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Sesja pobierania i puste wyniki źródeł" },
          "401": { description: "Brak sesji mObywatel (symulacja)" },
        },
      },
    },
    "/data-import/sessions/{sessionId}": {
      get: {
        summary: "Stan sesji, wyniki źródeł i podsumowanie",
        responses: {
          "200": { description: "Sesja z wynikami i proweniencją" },
          "404": { description: "Brak lub cudza sesja" },
        },
      },
    },
    "/data-import/sessions/{sessionId}/summary": {
      get: {
        summary:
          "Podsumowanie pobrania: pobrane, niedostępne, ręczne, niespójności",
        responses: { "200": { description: "Raport podsumowania" } },
      },
    },
    "/data-import/sessions/{sessionId}/sources/{sourceId}": {
      post: {
        summary: "Pobranie danych z jednego symulowanego źródła",
        responses: {
          "200": { description: "Wynik źródła i zaktualizowana sesja" },
          "409": { description: "Sesja już zakończona" },
          "422": { description: "Zakres zgody nie obejmuje źródła" },
        },
      },
    },
    "/data-import/sessions/{sessionId}/preview": {
      post: {
        summary:
          "Mapowanie danych, analiza uprawnień i podgląd kalkulacji bez zapisu",
        responses: { "200": { description: "Podgląd danych i wyników reguł" } },
      },
    },
    "/data-import/sessions/{sessionId}/accept": {
      post: {
        summary:
          "Zapis zaakceptowanych danych i przygotowanie prefillu formularza",
        responses: {
          "200": {
            description: "Zaakceptowana sesja, prefill i wynik analizy",
          },
          "422": { description: "Brak wymaganych pól" },
        },
      },
    },
    "/data-import/sessions/{sessionId}/skip": {
      post: {
        summary: "Rezygnacja z pobierania i przejście do ręcznego formularza",
        responses: { "200": { description: "Sesja oznaczona jako pominięta" } },
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
    "/sim/mobywatel/personas": {
      get: {
        summary: "Profile testowe do symulacji logowania przez mObywatel",
        responses: {
          "200": { description: "Lista syntetycznych profili i zakres danych" },
        },
      },
    },
    "/sim/mobywatel/authorize": {
      post: {
        summary: "Symulowane potwierdzenie logowania i ustawienie sesji",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/MobywatelAuthorizeRequest",
              },
            },
          },
        },
        responses: {
          "200": { description: "Sesja symulowana i przekierowanie do /start" },
          "404": { description: "Nieznany profil testowy" },
          "422": { description: "Błąd walidacji (zgoda, PIN)" },
        },
      },
    },
    "/sim/mobywatel/logout": {
      post: {
        summary: "Usunięcie symulowanej sesji mObywatel",
        responses: { "200": { description: "Sesja usunięta" } },
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
              monthlyBasisOverrideGrosze: { type: "integer", minimum: 0 },
              childrenCount: { type: "integer", minimum: 1, maximum: 20 },
              hasZaZyciem: { type: "boolean" },
              paymentOption: {
                type: "string",
                enum: ["STANDARD_100_70", "FLAT_81_5"],
              },
              maternityWeeksBeforeBirth: {
                type: "integer",
                minimum: 0,
                maximum: 52,
              },
              secondParentParentalWeeks: {
                type: "integer",
                minimum: 0,
                maximum: 104,
              },
              parentalWorkFraction: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              paternityDays: { type: "integer", minimum: 0, maximum: 365 },
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
      MobywatelAuthorizeRequest: {
        type: "object",
        required: ["personaId", "method", "consent"],
        properties: {
          personaId: { type: "string" },
          method: { type: "string", enum: ["PIN", "BIOMETRY"] },
          pin: {
            type: "string",
            description: "Wymagany dla metody PIN; dowolne 4 cyfry w demo.",
            pattern: "^\\d{4}$",
          },
          consent: { type: "boolean", const: true },
        },
      },
    },
  },
} as const

export const GET = apiRoute(async () => json(document))
