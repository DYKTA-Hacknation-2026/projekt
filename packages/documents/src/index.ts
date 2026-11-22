/**
 * @zpr/documents — PDF parsing, form detection, field templates, validators
 * and the mapping of confirmed fields to engine facts (FR-PRD-06, AD-08).
 * No Next.js dependency; no logging of document content.
 */
export { detectForm, matchFormCode, type DetectionInput, type DetectionResult } from "./detect"
export { extractFromPdf, applyFieldUpdates, type ExtractOptions, type FieldUpdate } from "./extract"
export { mapDocumentFacts } from "./mapping"
export { applyCaseProfile, compareDocumentWithProfile } from "./profile"
export { validateExtraction, type ValidationContext } from "./validate"
export { TEMPLATES, templateFor, type FieldSpec, type FormTemplate } from "./forms/templates"
export { scrubDocumentText, type FieldSuggester, type FieldSuggestion, type FieldSuggestionRequest, type OcrEngine } from "./ports"
export { createTesseractOcr } from "./ocr-tesseract"
export { readPdf, hasPdfSignature, PdfReadError, type PdfContent } from "./pdf/reader"
export { foldText } from "./text"
