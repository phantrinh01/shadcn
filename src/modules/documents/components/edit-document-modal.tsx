"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  FileText,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react"
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
import { cn } from "@/lib/utils"

import { documentStatuses } from "@/modules/documents/services/document-mock-data"
import {
  deleteDocumentFile,
  uploadFilesToDocument,
} from "@/modules/documents/services/document-file-services"
import {
  documentFormSchema,
  isExtensionAllowed,
  MAX_FILE_SIZE_BYTES,
  type Document,
  type DocumentAttachment,
  type DocumentFormData,
} from "@/modules/documents/services/types/document-types"
import {
  flattenFoldersForSelect,
  type Folder,
} from "@/modules/documents/services/types/folder-types"

interface EditDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Document being edited (snapshot taken when the dialog opens). */
  document: Document
  /** Existing attachments of the document. */
  attachments?: DocumentAttachment[]
  /** Available folders for the folder selector. */
  folders?: Folder[]
  /** Persist the updated document info. */
  onUpdateDocument?: (document: Document) => void | Promise<void>
  /** Called after attachments change so the parent can refresh its cache. */
  onFilesUploaded?: (documentId: string) => void | Promise<void>
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

/**
 * Single-step edit dialog: update document info, stage new attachments and
 * stage removals of existing ones — everything is applied in one save action.
 */
export function EditDocumentModal({
  open,
  onOpenChange,
  document,
  attachments = [],
  folders = [],
  onUpdateDocument,
  onFilesUploaded,
}: EditDocumentModalProps) {
  const [draft, setDraft] = useState<Document | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Snapshot the document each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDraft(document)
      setErrors({})
      setFileEntries([])
      setPendingRemovals([])
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const resetState = useCallback(() => {
    setDraft(null)
    setErrors({})
    setFileEntries([])
    setPendingRemovals([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isSaving) return
      if (!nextOpen) resetState()
      onOpenChange(nextOpen)
    },
    [isSaving, onOpenChange, resetState]
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

  const toggleRemoval = useCallback((fileName: string) => {
    setPendingRemovals((prev) =>
      prev.includes(fileName)
        ? prev.filter((name) => name !== fileName)
        : [...prev, fileName]
    )
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
   * Single-step save: validate → update info → delete staged removals →
   * upload staged files → refresh cache → close.
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    setErrors({})

    // 1. Validate form fields
    let validatedData: DocumentFormData
    try {
      validatedData = documentFormSchema.parse({
        name: draft.name,
        status: draft.status,
        summary: draft.summary ?? "",
        folderId: draft.folderId ?? null,
      })
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

    // 2. Validate newly attached files
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

    setIsSaving(true)

    try {
      // 3. Update document info
      await onUpdateDocument?.({
        ...draft,
        name: validatedData.name,
        status: validatedData.status,
        summary: validatedData.summary ?? "",
        folderId: validatedData.folderId ?? null,
      })

      // 4. Delete staged removals
      for (const fileName of pendingRemovals) {
        await deleteDocumentFile(document.id, fileName)
      }

      // 5. Upload newly staged files
      const pendingFiles = fileEntries.map((entry) => entry.file)

      if (pendingFiles.length > 0) {
        setFileEntries((prev) =>
          prev.map((entry) => ({ ...entry, state: "uploading" as const }))
        )

        await uploadFilesToDocument(
          document.id,
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
      }

      // 6. Refresh the parent's attachments cache if anything changed
      if (pendingRemovals.length > 0 || pendingFiles.length > 0) {
        await onFilesUploaded?.(document.id)
      }

      // 7. Success — close dialog
      const changes: string[] = []
      if (pendingFiles.length > 0)
        changes.push(`thêm ${pendingFiles.length} file`)
      if (pendingRemovals.length > 0)
        changes.push(`xóa ${pendingRemovals.length} file`)

      toast.success("Cập nhật thành công", {
        description:
          changes.length > 0
            ? `Tài liệu "${validatedData.name}" đã được cập nhật (${changes.join(", ")}).`
            : `Tài liệu "${validatedData.name}" đã được cập nhật.`,
      })

      setTimeout(
        () => {
          resetState()
          onOpenChange(false)
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
        root:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật tài liệu",
      })
      toast.error("Lỗi khi cập nhật", {
        description:
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi không xác định.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    resetState()
    onOpenChange(false)
  }

  const isUploading = fileEntries.some((entry) => entry.state === "uploading")
  const newFileCount = fileEntries.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-131.25">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa tài liệu</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin, thêm hoặc xóa file đính kèm trong một bước.
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <form onSubmit={handleSave} className="space-y-5">
            {errors.root ? (
              <p className="text-sm text-destructive">{errors.root}</p>
            ) : null}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor={`edit-doc-name-${document.id}`}>
                Tên tài liệu <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`edit-doc-name-${document.id}`}
                placeholder="Nhập tên tài liệu..."
                maxLength={100}
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
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
                  {draft.name.length}/100
                </span>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor={`edit-doc-status-${document.id}`}>
                Trạng thái
              </Label>
              <Select
                value={draft.status}
                onValueChange={(value: "draft" | "published") =>
                  setDraft((prev) => (prev ? { ...prev, status: value } : prev))
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
              <Label htmlFor={`edit-doc-folder-${document.id}`}>Thư mục</Label>
              <Select
                value={draft.folderId ?? "none"}
                onValueChange={(value) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          folderId: value === "none" ? null : value,
                        }
                      : prev
                  )
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
              <Label htmlFor={`edit-doc-summary-${document.id}`}>Tóm tắt</Label>
              <Textarea
                id={`edit-doc-summary-${document.id}`}
                placeholder="Nhập tóm tắt tài liệu (không bắt buộc)..."
                value={draft.summary ?? ""}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev ? { ...prev, summary: e.target.value } : prev
                  )
                }
                rows={3}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>File đính kèm</Label>

              {/* Existing attachments (removals are staged until save) */}
              {attachments.length > 0 ? (
                <AttachmentGroup className="max-h-[160px] flex-col overflow-y-auto">
                  {attachments.map((att) => {
                    const isRemoved = pendingRemovals.includes(att.name)
                    return (
                      <Attachment
                        key={att.name}
                        size="sm"
                        state="done"
                        className={cn("w-full", isRemoved && "opacity-50")}
                      >
                        <AttachmentMedia>
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle
                            className={cn(isRemoved && "line-through")}
                          >
                            {att.name}
                          </AttachmentTitle>
                          <AttachmentDescription>
                            {formatFileSize(att.size)}
                            {isRemoved ? " — sẽ xóa khi lưu" : ""}
                          </AttachmentDescription>
                        </AttachmentContent>
                        {!isSaving ? (
                          <AttachmentActions>
                            <AttachmentAction
                              aria-label={
                                isRemoved
                                  ? `Khôi phục ${att.name}`
                                  : `Xóa ${att.name}`
                              }
                              onClick={() => toggleRemoval(att.name)}
                            >
                              {isRemoved ? (
                                <RotateCcw className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </AttachmentAction>
                          </AttachmentActions>
                        ) : null}
                      </Attachment>
                    )
                  })}
                </AttachmentGroup>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Chưa có file đính kèm nào.
                </p>
              )}

              {/* Drop zone for new files */}
              {!isSaving ? (
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
                    PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT, … — tối đa
                    20 MB/file
                  </p>
                </div>
              ) : null}

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

              {/* Newly staged files */}
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
                        {!isSaving || entry.state === "pending" ? (
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

              {fileEntries.some((entry) => entry.state === "error") ? (
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
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSaving}
              >
                {isUploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving
                      ? "Đang lưu..."
                      : newFileCount > 0
                        ? `Lưu + Upload ${newFileCount} file`
                        : "Lưu thay đổi"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
