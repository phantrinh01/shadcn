"use client"

import { useCallback, useRef, useState } from "react"
import { AlertTriangle, FileText, Plus, Upload, X } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { documentStatuses } from "@/modules/documents/services/document-mock-data"
import { uploadFilesToDocument } from "@/modules/documents/services/document-file-services"
import {
  documentFormSchema,
  isExtensionAllowed,
  MAX_FILE_SIZE_BYTES,
  type Document,
  type DocumentFormData,
} from "@/modules/documents/services/types/document-types"
import {
  flattenFoldersForSelect,
  type Folder,
} from "@/modules/documents/services/types/folder-types"

interface AddDocumentModalProps {
  /**
   * Create the document in Firestore. Should return the created document
   * (with its Firestore-assigned `id`) so attachments can be uploaded
   * under that id in the same submit action.
   */
  onAddDocument?: (
    document: Omit<Document, "id">
  ) => Promise<Document | void> | void
  /**
   * Called after attachments have been uploaded so the parent can
   * refresh its attachments cache for the given document.
   */
  onFilesUploaded?: (documentId: string) => void | Promise<void>
  /** Available folders for the folder selector. */
  folders?: Folder[]
  /** Folder pre-selected when the dialog opens. */
  defaultFolderId?: string | null
  trigger?: React.ReactNode
}

interface FileEntry {
  file: File
  progress: number
  state: "pending" | "uploading" | "success" | "error"
  error?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = parseFloat((bytes / 1024 ** i).toFixed(1))
  return `${size} ${units[i]}`
}

function validateFile(file: File): string | null {
  if (!isExtensionAllowed(file.name)) {
    return `Định dạng "${file.name.split(".").pop() ?? "unknown"}" không được phép.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File "${file.name}" vượt quá ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`
  }
  return null
}

export function AddDocumentModal({
  onAddDocument,
  onFilesUploaded,
  folders = [],
  defaultFolderId = null,
  trigger,
}: AddDocumentModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<DocumentFormData>({
    name: "",
    status: "draft",
    summary: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setFormData({ name: "", status: "draft", summary: "" })
    setErrors({})
    setFileEntries([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSubmitting) return
      if (!nextOpen) resetState()
      if (nextOpen) {
        // Pre-select the folder the user is currently browsing.
        setFormData((prev) => ({ ...prev, folderId: defaultFolderId ?? null }))
      }
      setOpen(nextOpen)
    },
    [defaultFolderId, isSubmitting, resetState]
  )

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles = Array.from(incoming)
    setFileEntries((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        file,
        progress: 0,
        state: "pending" as const,
      })),
    ])
  }, [])

  const removeFileEntry = useCallback((index: number) => {
    setFileEntries((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  /**
   * Single-step submit: validate form + files → create document → upload
   * attachments (if any) → close.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // 1. Validate form fields
    let validatedData: DocumentFormData
    try {
      validatedData = documentFormSchema.parse(formData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
      }
      return
    }

    // 2. Validate attached files
    const validationErrors: string[] = []
    const validatedEntries = fileEntries.map((entry) => {
      const err = validateFile(entry.file)
      if (err) {
        validationErrors.push(err)
        return { ...entry, state: "error" as const, error: err }
      }
      return entry
    })

    if (validationErrors.length > 0) {
      setFileEntries(validatedEntries)
      toast.error("Có file không hợp lệ", {
        description: validationErrors[0],
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 3. Create the document
      const newDocument: Omit<Document, "id"> = {
        name: validatedData.name,
        status: validatedData.status,
        summary: validatedData.summary ?? "",
        folderId: validatedData.folderId ?? null,
      }

      const created = await onAddDocument?.(newDocument)

      // 4. Upload attachments if files were selected
      const pendingFiles = fileEntries.map((entry) => entry.file)

      if (pendingFiles.length > 0 && created?.id) {
        setFileEntries((prev) =>
          prev.map((entry) => ({ ...entry, state: "uploading" as const }))
        )

        await uploadFilesToDocument(
          created.id,
          pendingFiles,
          (fileName, pct) => {
            setFileEntries((prev) =>
              prev.map((entry) =>
                entry.file.name === fileName
                  ? { ...entry, progress: pct }
                  : entry
              )
            )
          }
        )

        setFileEntries((prev) =>
          prev.map((entry) => ({
            ...entry,
            state: "success" as const,
            progress: 100,
          }))
        )

        // Notify parent so it refreshes the attachments cache for this doc.
        await onFilesUploaded?.(created.id)
      }

      // 5. Success — close dialog
      toast.success("Tạo tài liệu thành công", {
        description:
          pendingFiles.length > 0
            ? `Tài liệu "${validatedData.name}" đã được tạo cùng ${pendingFiles.length} file đính kèm.`
            : `Tài liệu "${validatedData.name}" đã được tạo.`,
      })

      setTimeout(
        () => {
          resetState()
          setOpen(false)
        },
        pendingFiles.length > 0 ? 600 : 0
      )
    } catch (error) {
      setFileEntries((prev) =>
        prev.map((entry) =>
          entry.state === "uploading"
            ? { ...entry, state: "error" as const, error: "Lỗi upload" }
            : entry
        )
      )
      setErrors({
        root: error instanceof Error ? error.message : "Không thể tạo tài liệu",
      })
      toast.error("Lỗi khi tạo tài liệu", {
        description:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi không xác định.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetState()
    setOpen(false)
  }

  const isUploading = fileEntries.some((e) => e.state === "uploading")
  const fileCount = fileEntries.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm tài liệu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-131.25">
        <DialogHeader>
          <DialogTitle>Thêm tài liệu mới</DialogTitle>
          <DialogDescription>
            Tạo tài liệu mới và đính kèm file (nếu có) trong một bước.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.root ? (
            <p className="text-sm text-destructive">{errors.root}</p>
          ) : null}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="doc-name">
              Tên tài liệu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doc-name"
              placeholder="Nhập tên tài liệu..."
              maxLength={100}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className={errors.name ? "border-destructive" : ""}
            />
            <div className="flex items-center justify-between">
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {formData.name.length}/100
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="doc-status">Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "draft" | "published") =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {documentStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center">
                      {status.icon && (
                        <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder */}
          <div className="space-y-2">
            <Label htmlFor="doc-folder">Thư mục</Label>
            <Select
              value={formData.folderId ?? "none"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  folderId: value === "none" ? null : value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn thư mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">
                    — Không có thư mục —
                  </span>
                </SelectItem>
                {flattenFoldersForSelect(folders).map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <div style={{ paddingLeft: `${option.depth * 14}px` }}>
                      {option.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="doc-summary">Tóm tắt</Label>
            <Textarea
              id="doc-summary"
              placeholder="Nhập tóm tắt tài liệu (không bắt buộc)..."
              value={formData.summary ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  summary: e.target.value,
                }))
              }
              rows={3}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>File đính kèm</Label>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Kéo thả file vào đây hoặc{" "}
                <span className="font-medium text-primary">chọn file</span>
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT, … — tối đa 20
                MB/file
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              title="Chọn file đính kèm"
              aria-label="Chọn file đính kèm"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.md,.csv,.json,.xml"
              onChange={(e) => {
                if (e.target.files?.length) {
                  addFiles(e.target.files)
                  e.target.value = ""
                }
              }}
            />

            {/* File list */}
            {fileEntries.length > 0 ? (
              <AttachmentGroup className="max-h-[160px] flex-col overflow-y-auto">
                {fileEntries.map((entry, idx) => {
                  const stateMap: Record<
                    FileEntry["state"],
                    "idle" | "uploading" | "error" | "done"
                  > = {
                    pending: "idle",
                    uploading: "uploading",
                    error: "error",
                    success: "done",
                  }
                  return (
                    <Attachment
                      key={`${entry.file.name}-${idx}`}
                      size="sm"
                      state={stateMap[entry.state]}
                      className="w-full"
                    >
                      <AttachmentMedia>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>{entry.file.name}</AttachmentTitle>
                        <AttachmentDescription>
                          {formatFileSize(entry.file.size)}
                          {entry.state === "error"
                            ? ` — ${entry.error}`
                            : entry.state === "uploading" ||
                                entry.state === "success"
                              ? ` · ${entry.progress}%`
                              : ""}
                        </AttachmentDescription>
                        {entry.state === "uploading" ||
                        entry.state === "success" ? (
                          <Progress
                            className="mt-1 h-1.5"
                            value={entry.progress}
                          />
                        ) : null}
                      </AttachmentContent>
                      {!isSubmitting || entry.state === "pending" ? (
                        <AttachmentActions>
                          <AttachmentAction
                            aria-label={`Xóa ${entry.file.name}`}
                            onClick={() => removeFileEntry(idx)}
                          >
                            <X className="h-4 w-4" />
                          </AttachmentAction>
                        </AttachmentActions>
                      ) : null}
                    </Attachment>
                  )
                })}
              </AttachmentGroup>
            ) : null}

            {fileEntries.some((e) => e.state === "error") ? (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Một hoặc nhiều file không hợp lệ. Kiểm tra lại định dạng.
                </span>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {isUploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting
                    ? "Đang tạo..."
                    : fileCount > 0
                      ? `Tạo + Upload ${fileCount} file`
                      : "Tạo tài liệu"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
