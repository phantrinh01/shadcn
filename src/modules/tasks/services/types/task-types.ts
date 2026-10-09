import { z } from "zod"

export const TASK_TITLE_MAX_LENGTH = 200

export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const BLOCKED_EXTENSIONS = ["exe", "sh", "bat"]

export const taskPriorityEnum = z.enum(["low", "medium", "high"])
export type TaskPriority = z.infer<typeof taskPriorityEnum>

export const taskStatusEnum = z.enum(["todo", "in_progress", "done"])
export type TaskStatus = z.infer<typeof taskStatusEnum>

/**
 * File đính kèm của task. Lưu trong mảng `attachments` của `tasks/{taskId}`;
 * `uploadedAt` là Firestore `Timestamp` (serverTimestamp() không dùng được
 * trong mảng) và được service chuyển thành ISO string.
 */
export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  contentType: z.string(),
  /** `tasks/{taskId}/{fileId}-{safeName}` */
  storagePath: z.string(),
  downloadUrl: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
})

export type Attachment = z.infer<typeof attachmentSchema>

/**
 * Task as used in the UI. Firestore `Timestamp` fields are converted to ISO
 * strings by the service layer so the object stays JSON-serializable.
 *
 * Firestore document: `tasks/{id}` — `id` is the document id, not a field.
 */
export const taskSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(
      TASK_TITLE_MAX_LENGTH,
      `Tiêu đề tối đa ${TASK_TITLE_MAX_LENGTH} ký tự`
    ),
  priority: taskPriorityEnum,
  status: taskStatusEnum,
  /** User id (uid) of the responsible member. */
  assignee: z.string().nullable().optional(),
  /** Deadline (ISO string). */
  due_date: z.string().nullable().optional(),
  description: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Task = z.infer<typeof taskSchema>

/** Fields the user fills in; `id` and timestamps are system-managed. */
export const taskInputSchema = taskSchema.omit({
  id: true,
  attachments: true,
  created_at: true,
  updated_at: true,
})

export type TaskInput = z.infer<typeof taskInputSchema>

/** Minimal member info used to render / pick an assignee. */
export interface TaskAssignee {
  uid: string
  name: string
  photoURL?: string | null
}
