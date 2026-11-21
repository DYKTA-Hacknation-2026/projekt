export interface UserSummary<Timestamp = string> {
  id: string
  displayName: string
  email: string
  role: "USER" | "ADMIN"
  isDemo: boolean
  createdAt: Timestamp
}

export interface BenefitCaseSummary<Timestamp = string> {
  id: string
  caseNumber: string
  title: string
  status: "DRAFT" | "IN_REVIEW" | "READY" | "CLOSED"
  dueDate: string | null
  ownerName: string
  createdAt: Timestamp
}

export interface CalculationSummary<Timestamp = string> {
  id: string
  caseId: string | null
  totalAmountGrosze: number
  status: "OK" | "INDETERMINATE" | "ERROR"
  engineVersion: string
  createdAt: Timestamp
}

export interface LegalRuleSummary {
  id: string
  code: string
  title: string
  category: string
  legalReference: string
  verificationStatus: "VERIFIED" | "UNVERIFIED" | "PROPOSED"
  version: string
  effectiveFrom: string
}

export interface KnowledgeSourceSummary {
  id: string
  slug: string
  title: string
  publisher: string
  sourceType: string
  isConfidential: boolean
  documentCount: number
}

export interface KnowledgeDocumentSummary {
  id: string
  title: string
  version: string
  status: "PENDING" | "INDEXED" | "FAILED"
  sourceTitle: string
  chunkCount: number
}

export interface IngestionJobSummary<Timestamp = string> {
  id: string
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED"
  chunksCreated: number
  documentTitle: string
  createdAt: Timestamp
}

export interface EmbeddingModelSummary {
  id: string
  name: string
  provider: string
  dimensions: number
  isActive: boolean
}

export interface AdminData {
  rules: LegalRuleSummary[]
  sources: KnowledgeSourceSummary[]
  documents: KnowledgeDocumentSummary[]
  jobs: IngestionJobSummary[]
  embeddingModel: EmbeddingModelSummary | null
  users: UserSummary[]
  counts: {
    rules: number
    chunks: number
    users: number
    cases: number
  }
}

export interface DashboardData {
  generatedAt: string
  stats: {
    users: number
    cases: number
    calculations: number
    rules: number
    chunks: number
  }
  cases: BenefitCaseSummary[]
  calculations: CalculationSummary[]
  rules: LegalRuleSummary[]
  sources: KnowledgeSourceSummary[]
  documents: KnowledgeDocumentSummary[]
  embeddingModel: EmbeddingModelSummary | null
  demoUsers: UserSummary[]
}
