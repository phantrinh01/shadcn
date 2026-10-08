import { FileEdit, FileText } from "lucide-react"

import { documentSchema } from "./types/document-types"

export const documentStatuses = [
  {
    value: "draft",
    label: "Draft",
    icon: FileEdit,
  },
  {
    value: "published",
    label: "Published",
    icon: FileText,
  },
] as const

/**
 * Mock data without `id` — Firestore auto-generates document IDs via `addDoc`.
 * The `id` field is resolved from `documentRef.id` when reading from Firestore.
 */
const documentsData = [
  {
    name: "Product Roadmap 2026",
    status: "published",
    summary:
      "Roadmap covering all major product initiatives planned for 2026, including the new analytics dashboard, mobile app rewrite, and AI-assisted workflows.",
    createdBy: "Nguyễn Văn An",
    createdDate: "2026-01-05T09:00:00.000Z",
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-06-12T10:30:00.000Z",
    deletedAt: null,
  },
  {
    name: "Engineering Handbook",
    status: "published",
    summary:
      "Internal handbook for engineers covering coding standards, code review process, deployment workflow, and on-call expectations.",
    createdBy: "Trần Thị Bình",
    createdDate: "2026-01-08T14:00:00.000Z",
    createdAt: "2026-01-08T14:00:00.000Z",
    updatedAt: "2026-05-20T08:15:00.000Z",
    deletedAt: null,
  },
  {
    name: "Q2 Marketing Plan",
    status: "draft",
    summary:
      "Draft of the Q2 marketing plan, including paid acquisition budgets, content calendar, and partnership experiments.",
    createdBy: "Lê Minh Cường",
    createdDate: "2026-03-21T11:00:00.000Z",
    createdAt: "2026-03-21T11:00:00.000Z",
    updatedAt: "2026-06-30T17:45:00.000Z",
    deletedAt: null,
  },
  {
    name: "Customer Onboarding Guide",
    status: "published",
    summary:
      "Step-by-step onboarding guide sent to new customers, including setup checklist, video walkthroughs, and FAQ.",
    createdBy: "Nguyễn Văn An",
    createdDate: "2026-02-02T08:30:00.000Z",
    createdAt: "2026-02-02T08:30:00.000Z",
    updatedAt: "2026-04-18T13:20:00.000Z",
    deletedAt: null,
  },
  {
    name: "Privacy Policy v3",
    status: "draft",
    summary:
      "Revised privacy policy draft pending legal review. Adds disclosures around new analytics tooling and third-party AI services.",
    createdBy: "Phạm Thu Dung",
    createdDate: "2026-05-10T10:00:00.000Z",
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-06-28T09:50:00.000Z",
    deletedAt: null,
  },
  {
    name: "Incident Response Runbook",
    status: "published",
    summary:
      "Runbook detailing how to triage, communicate, and resolve production incidents — including severity levels and escalation paths.",
    createdBy: "Trần Thị Bình",
    createdDate: "2026-01-15T16:00:00.000Z",
    createdAt: "2026-01-15T16:00:00.000Z",
    updatedAt: "2026-03-04T12:10:00.000Z",
    deletedAt: null,
  },
  {
    name: "Brand Style Guide",
    status: "published",
    summary:
      "Brand colors, typography, logo usage rules, voice & tone examples, and approved marketing copy snippets.",
    createdBy: "Lê Minh Cường",
    createdDate: "2026-02-19T13:00:00.000Z",
    createdAt: "2026-02-19T13:00:00.000Z",
    updatedAt: "2026-02-19T13:00:00.000Z",
    deletedAt: null,
  },
  {
    name: "Hiring Scorecard Template",
    status: "draft",
    summary:
      "Reusable scorecard template for evaluating engineering candidates across system design, coding, and collaboration.",
    createdBy: "Phạm Thu Dung",
    createdDate: "2026-04-05T07:30:00.000Z",
    createdAt: "2026-04-05T07:30:00.000Z",
    updatedAt: "2026-06-15T11:00:00.000Z",
    deletedAt: null,
  },
  {
    name: "API Authentication Guide",
    status: "published",
    summary:
      "Public-facing documentation explaining how to authenticate against the REST API using OAuth2, including code samples.",
    createdBy: "Nguyễn Văn An",
    createdDate: "2026-03-12T10:00:00.000Z",
    createdAt: "2026-03-12T10:00:00.000Z",
    updatedAt: "2026-05-29T15:45:00.000Z",
    deletedAt: null,
  },
  {
    name: "Quarterly OKRs — Q3",
    status: "draft",
    summary:
      "Working draft of Q3 OKRs across product, growth, and platform teams. Pending leadership sign-off.",
    createdBy: "Trần Thị Bình",
    createdDate: "2026-06-01T09:00:00.000Z",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-01T08:30:00.000Z",
    deletedAt: null,
  },
  {
    name: "Sales Playbook",
    status: "published",
    summary:
      "Playbook for the sales team covering discovery questions, objection handling, competitive positioning, and deal stages.",
    createdBy: "Lê Minh Cường",
    createdDate: "2026-01-29T11:30:00.000Z",
    createdAt: "2026-01-29T11:30:00.000Z",
    updatedAt: "2026-04-09T14:00:00.000Z",
    deletedAt: null,
  },
  {
    name: "Data Retention Policy",
    status: "draft",
    summary:
      "Draft policy covering how long user data, logs, and backups are retained across production environments.",
    createdBy: "Phạm Thu Dung",
    createdDate: "2026-05-22T12:00:00.000Z",
    createdAt: "2026-05-22T12:00:00.000Z",
    updatedAt: "2026-06-25T16:30:00.000Z",
    deletedAt: null,
  },
  {
    name: "Mobile App Changelog",
    status: "published",
    summary:
      "Public changelog for the mobile app, with release notes grouped by version and known issues section.",
    createdBy: "Nguyễn Văn An",
    createdDate: "2026-02-08T09:00:00.000Z",
    createdAt: "2026-02-08T09:00:00.000Z",
    updatedAt: "2026-06-30T18:00:00.000Z",
    deletedAt: null,
  },
  {
    name: "Security Whitepaper",
    status: "published",
    summary:
      "Whitepaper outlining the platform's security model, encryption-at-rest, audit logging, and compliance posture.",
    createdBy: "Trần Thị Bình",
    createdDate: "2026-03-30T10:00:00.000Z",
    createdAt: "2026-03-30T10:00:00.000Z",
    updatedAt: "2026-03-30T10:00:00.000Z",
    deletedAt: null,
  },
  {
    name: "Internal Release Notes — June",
    status: "draft",
    summary:
      "Draft of internal release notes summarizing the June production deploys, feature flags rolled out, and follow-up tasks.",
    createdBy: "Lê Minh Cường",
    createdDate: "2026-06-28T14:00:00.000Z",
    createdAt: "2026-06-28T14:00:00.000Z",
    updatedAt: "2026-07-02T11:30:00.000Z",
    deletedAt: null,
  },
]

/**
 * Mock data parsed through zod — `id` will be assigned by Firestore on seed/create.
 * The schema allows `id` as an optional field for this purpose; Firestore assigns it at write time.
 */
export const documentMockData = documentSchema
  .omit({ id: true })
  .array()
  .parse(documentsData)
