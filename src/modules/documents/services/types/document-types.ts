import { z } from "zod"

export const DOCUMENT_STATUS_VALUES = ["draft", "published"] as const

export const documentStatusSchema = z.enum(DOCUMENT_STATUS_VALUES)

export const documentSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  status: documentStatusSchema,
  summary: z.string().optional().default(""),
  /** Folder the document belongs to — `null` when uncategorized. */
  folderId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
  createdDate: z.unknown().optional(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  deletedAt: z.unknown().nullable().optional(),
})

export type Document = z.infer<typeof documentSchema>

export const documentFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  status: documentStatusSchema,
  summary: z.string().optional(),
  folderId: z.string().nullable().optional(),
})

export type DocumentFormData = z.infer<typeof documentFormSchema>

/**
 * Metadata for a single file uploaded to Firebase Storage under a document.
 * Stored alongside the document in Firestore under `attachments/{fileName}`.
 */
export const documentAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number(),
  contentType: z.string(),
  uploadedAt: z.unknown().optional(),
})

export type DocumentAttachment = z.infer<typeof documentAttachmentSchema>

/**
 * Allowed document extensions — files that are safe to upload.
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "txt",
  "md",
  "csv",
  "json",
  "xml",
] as const

/**
 * Blocked extensions — media (audio/video/image/executables) that we don't accept.
 */
export const BLOCKED_EXTENSIONS = [
  // Audio
  "mp3",
  "wav",
  "flac",
  "ogg",
  "wma",
  "aac",
  "m4a",
  "opus",
  // Video
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "flv",
  "wmv",
  "mpg",
  "mpeg",
  "m4v",
  "3gp",
  // Image
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "tiff",
  "tif",
  "raw",
  "heic",
  "heif",
  "ico",
  // Executables / scripts
  "exe",
  "msi",
  "bat",
  "sh",
  "cmd",
  "com",
  "scr",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "php",
  "jar",
  // Archives (block to prevent zip-bombs etc.)
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "iso",
] as const

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase()
}

export function isExtensionAllowed(fileName: string): boolean {
  const ext = getFileExtension(fileName)
  if (!ext) return false

  if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
    return false
  }

  return (ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)
}
