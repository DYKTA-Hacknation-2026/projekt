# Knowledge sources: adding and updating official sources

Status: v1.0 · 2026-11-21 · Package: `@zpr/rag` · Related: [rag-architecture.md](rag-architecture.md), [legal-assumptions.md](legal-assumptions.md) (Q-19, Q-23)

The knowledge base is defined in code. Every source and every document version is registered in [`packages/rag/src/sources/manifest.ts`](../packages/rag/src/sources/manifest.ts), so access policy, effective dates and provenance are reviewed in a pull request like any other change.

## 1. Concepts

| Term | Meaning |
|------|---------|
| **Source** | A publisher or a legal act: `ustawa-zasilkowa`, `kodeks-pracy`, `zus-formularze`, … It has a `sourceType`, an `authorityRank` and an access policy. |
| **Document** | One logical text in a source, identified by `documentKey`. |
| **Version** | `version` label plus `effectiveFrom` / `effectiveTo` (ISO dates, `effectiveTo` exclusive). `(source, documentKey, version)` is the identity used for deduplication and re-ingestion. |
| **Origin** | `curated`: a committed file in `packages/rag/knowledge/`. `local`: a file provided on disk (never committed), found in `KB_LOCAL_SOURCES_DIR` by file name or by `detect` phrases in its title block. |
| **Chunk** | A retrievable passage, with page range, heading path, legal reference, effective window and benefit tags. Chunks never cross an article or guide-section boundary. |

Source types: `LEGAL_ACT`, `OFFICIAL_GUIDANCE`, `BENEFIT_TABLE`, `GOVERNMENT_PAGE`, `FORM_INSTRUCTION`, `GUIDE` (parent and caregiver guides), `CHARITY_RESOURCE`, `TASK_DOCUMENT`, `WEB_PAGE`, `FORM_TEMPLATE`, `INTERNAL`.

Authority (used as a small ranking prior and for conflict resolution): statute 100, regulation 90, benefit table 80, ZUS form instructions 70, guides and gov.pl 60, task document 40, charity list 20.

## 2. Access and redistribution

Each source declares, and each document may tighten, two policies. The effective policy is the most restrictive of the two.

| `accessLevel` | Who can retrieve it |
|---------------|---------------------|
| `PUBLIC` | Any caller of the retrieval API. |
| `INTERNAL` | Only callers configured with `KB_RETRIEVAL_ACCESS_LEVELS=PUBLIC,INTERNAL` (the HackNation demo, scripts). A public deployment sets `PUBLIC`. |
| `RESTRICTED` | Nobody. The pipeline **refuses** to ingest it (`REFUSED`) before reading a single byte, and `kb:verify` fails if any such chunk exists. |

| `redistribution` | How the UI and the assistant may use it |
|------------------|------------------------------------------|
| `ALLOWED` | Quote freely (public law, our own tables). |
| `ATTRIBUTION` | Quote with the source named (ZUS and gov.pl pages, our summaries). |
| `CITATION_ONLY` | Cite by reference (document, article, page) and never quote. The assistant prints "Zob. …" instead of an excerpt. |
| `PROHIBITED` | Never retrievable (same as RESTRICTED). |

Rules for this project:

- **Statutes and regulations** are not covered by copyright (art. 4 of the Polish copyright act). Our curated excerpts are `PUBLIC` / `ALLOWED`. Do not copy editorial additions of commercial databases, such as Legalis bracket titles (`Art. 29 [Prawo do zasiłku]`).
- **Competition PDFs** provided by ZUS ("przeznaczone wyłącznie na użytek HackNation … nie wolno kopiować ani rozpowszechniać") are `INTERNAL` / `CITATION_ONLY`. They live only in `fixtures/private/sources/` (git- and docker-ignored) or another `KB_LOCAL_SOURCES_DIR`.
- **ZUS sample cases** (`zus-przykladowe-sprawy`) are `RESTRICTED`. Never add a document for them. They may be used only by tests and the demo loader, outside the knowledge base.
- **Charity resources** only list charitable or public bodies. Keep `metadata.verificationStatus` up to date and confirm contact details on the organisation's own page before marking an entry verified.

## 3. Add a new source

1. **Choose the origin.**
   - If the text may be redistributed, write it to `packages/rag/knowledge/curated/<name>.md`. Use our own words or public-law text, and add `<!-- page: N -->` markers to keep page references to the official PDF.
   - Otherwise, put the file in `fixtures/private/sources/` and use `origin: { kind: "local", fileName, detect: [...] }`. The `detect` phrases must appear in the first ~600 characters of page 1 (the title block).
2. **Register the source** in `SOURCES` (`slug`, `title`, `publisher`, `sourceType`, official `url`, `accessLevel`, `redistribution`, `authorityRank`).
3. **Register the document** in `DOCUMENTS`:

   ```ts
   {
     sourceSlug: "zus-formularze",
     documentKey: "zas-53",
     title: "Formularz ZAS-53 — instrukcja",
     version: "2026-11",
     documentType: "FORM_INSTRUCTION",
     effectiveFrom: "2026-10-24",
     parser: "guide",                       // "legal" for acts with Art./§/ust./pkt
     legal: undefined,                      // { citationPrefix: "U", superscripts?, footnotes? }
     origin: { kind: "curated", path: "curated/zas-53.md" },
     tags: ["FORMS", "MATERNITY"],          // optional; benefit tags are also detected
   }
   ```

   Legal acts use `parser: "legal"` and a short `citationPrefix` (it becomes `U art. 29 ust. 1`). Set `superscripts: true` for Kodeks pracy PDFs, which print "Art. 182¹a" as "Art. 1821a". Set `footnotes: true` for Legalis extracts, so amendment notes become provision-level effective dates.
4. **Dry-run the split** before touching the database:

   ```bash
   pnpm --filter @zpr/rag kb:inspect packages/rag/knowledge/curated/zas-53.md --document zus-formularze/zas-53@2026-11
   pnpm --filter @zpr/rag kb:inspect ./fixtures/private/sources/akt.pdf --parser legal --prefix R1316 --footnotes
   ```

   Check that headings, articles, pages and effective dates look right and that no enumeration is cut from its lead-in.
5. **Ingest and verify:**

   ```bash
   pnpm --filter @zpr/rag kb:ingest --document zus-formularze/zas-53@2026-11
   pnpm kb:verify
   ```

6. **Add eval cases** to `packages/rag/evals/retrieval.jsonl` for the questions the source should answer, and for at least one question it must not answer. `kb:verify` fails below 80 % recall.
7. If the source introduces a new code or term (e.g. a form `ZAS-53`), add it to `DOMAIN_TERMS` in `src/text/vocabulary.ts` so it gets exact-match handling.

## 4. Update an existing source

| Situation | What to do | Result |
|-----------|------------|--------|
| Typo or editorial fix, same legal state | Edit the file, keep `version`, run `kb:ingest --document …` | `UPDATED`. Unchanged chunks keep their ids and vectors; changed ones are re-embedded; removed ones are deactivated (chat evidence keeps pointing at what users saw). |
| **New legal state** (amendment, new consolidated text) | Add a **new version** entry with its own `effectiveFrom`. Leave the old one. | Both stay queryable. If the old version was open-ended, its window is closed at the new `effectiveFrom`, and retrieval serves whichever version is valid on `asOf`. |
| Replacement edition (old one should disappear) | New version with `supersedesPrevious: true` | Older versions get `SUPERSEDED` and are no longer retrievable. |
| One provision changes on a later date (e.g. „art. 9 ust. 4 dodany … wchodzi w życie 1.01.2027 r.”) | With `footnotes: true` this is automatic for Legalis PDFs. For curated text, publish a dated version as in `ustawa-zasilkowa-2026-07.md` / `-2027-01.md`. | That provision becomes its own chunk, valid from its date. |
| Source withdrawn | Remove the document from the manifest and set its status to `ARCHIVED` (SQL or admin), or mark it `supersedesPrevious` in a replacement. | Not retrievable; history kept. |

Re-running `pnpm kb:seed` is always safe. Unchanged documents report `UNCHANGED`, and a failed re-ingestion rolls back to the previous live version: verification runs inside the store transaction.

## 5. Competition PDFs (local)

```bash
mkdir -p fixtures/private/sources
cp ~/Downloads/*.pdf fixtures/private/sources/        # any file names
pnpm kb:seed -- --with-local                         # or --local-dir <dir>
```

Files are matched to manifest entries by name (`ustawa-zasilkowa-2026-854.pdf`, …) or by the `detect` phrases in their title block. A file that matches nothing is reported and **never** ingested, so an unexpected document, such as a sample case, cannot reach the index.

## 6. Changing the embedding model

```bash
EMBEDDING_PROVIDER=ollama EMBEDDING_MODEL=bge-m3 EMBEDDING_DIMENSIONS=1024 \
EMBEDDING_BASE_URL=http://localhost:11434/v1 pnpm --filter @zpr/rag kb:reembed
```

Every configuration (provider, model, dimensions, prefixes, normalisation) gets its own fingerprinted model row and partial HNSW index. Retrieval looks up the model matching the runtime configuration. Until it is fully embedded, vector search reports `UNAVAILABLE` and keyword search still works. After switching, tune `RETRIEVAL_VECTOR_FLOOR` / `RETRIEVAL_VECTOR_CEILING` to the model's cosine range and run `pnpm kb:verify`.

## 7. Pipeline reference

| Stage | Implementation |
|-------|----------------|
| 1 Register | `KnowledgeStore.upsertSource`, restricted-source refusal, embedding-model registration |
| 2 Extract | `extractDocument` (PDF via `unpdf`, HTML, Markdown/text with page markers) |
| 3 Boundaries | Page of every line; `parseLegalDocument` / `parseGuideDocument` |
| 4 Normalise | `normalizeDocument`: running headers, folios, hyphenation, glued „nie”, bullets, TOC, Legalis footnotes |
| 5 Chunk | `chunkUnits`: per article / ust. / §, enumerations split between points with lead-in and closing repeated, guide sections packed with overlap (`KB_CHUNK_*`) |
| 6 Embed | `EmbeddingProvider.embedDocument`, only for chunks without a current vector |
| 7 Store | One transaction with an advisory lock: chunks, metadata, vectors |
| 8 Index | Generated `tsvector` columns; `kb.ensure_embedding_index(model)` |
| 9 Verify | Chunk/vector counts and a query-vs-document embedding probe before commit; `kb:verify` for the whole KB |

`PIPELINE_VERSION` in `src/ingest/pipeline.ts` is part of every document hash. Bump it when extraction or chunking rules change, so that `kb:seed` reprocesses everything; vectors of unchanged text are reused.
