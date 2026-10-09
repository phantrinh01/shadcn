"use client"

import * as React from "react"
import { Download, FileText, Loader2, Paperclip, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  deleteAttachment,
  uploadAttachment,
  validateFile,
} from "@/modules/tasks/services/task-attachment-services"
import {
  MAX_FILE_SIZE,
  type Attachment,
} from "@/modules/tasks/services/types/task-types"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Thông báo lỗi kèm mã Firebase (vd. storage/unauthorized) để dễ chẩn đoán. */
export function describeUploadError(name: string, error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  const detail = code ?? (error instanceof Error ? error.message : "")
  return `Không thể tải lên "${name}"${detail ? ` (${detail})` : ""}. Vui lòng thử lại.`
}

/** Lọc file hợp lệ; file không hợp lệ báo lỗi bằng toast. */
export function pickValidFiles(files: File[]): File[] {
  return files.filter((file) => {
    const error = validateFile(file)
    if (error) toast.error(error)
    return !error
  })
}

interface DropzoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

function Dropzone({ onFiles, disabled }: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) onFiles(Array.from(event.dataTransfer.files))
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center text-sm transition-colors hover:bg-muted/50",
        dragging && "border-primary bg-muted/50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <Paperclip className="size-5 text-muted-foreground" />
      <span>Kéo thả file vào đây hoặc bấm để chọn</span>
      <span className="text-xs text-muted-foreground">
        Tối đa {MAX_FILE_SIZE / 1024 / 1024}MB mỗi file. Không hỗ trợ .exe, .sh,
        .bat
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ""
        }}
      />
    </div>
  )
}

function FileRow({
  name,
  size,
  children,
}: {
  name: string
  size: number
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={name}>
        {name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatSize(size)}
      </span>
      {children}
    </li>
  )
}

interface TaskAttachmentsProps {
  taskId: string
  attachments: Attachment[]
  /** Gọi sau mỗi lần upload/xoá thành công để cập nhật state của cha. */
  onChange: (attachments: Attachment[]) => void
  className?: string
}

interface UploadingFile {
  key: string
  name: string
  size: number
  progress: number
}

/** Danh sách + upload/xoá file của một task đã tồn tại. */
export function TaskAttachments({
  taskId,
  attachments,
  onChange,
  className,
}: TaskAttachmentsProps) {
  // Nhiều upload chạy song song nên cần bản mới nhất, không phải closure cũ.
  const latest = React.useRef(attachments)
  latest.current = attachments

  const [uploading, setUploading] = React.useState<UploadingFile[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function handleFiles(files: File[]) {
    await Promise.all(
      pickValidFiles(files).map(async (file) => {
        const key = crypto.randomUUID()
        setUploading((prev) => [
          ...prev,
          { key, name: file.name, size: file.size, progress: 0 },
        ])
        try {
          const attachment = await uploadAttachment(taskId, file, (progress) =>
            setUploading((prev) =>
              prev.map((item) =>
                item.key === key ? { ...item, progress } : item
              )
            )
          )
          latest.current = [...latest.current, attachment]
          onChange(latest.current)
          toast.success(`Đã tải lên "${file.name}"`)
        } catch (error) {
          console.error("Failed to upload attachment:", error)
          toast.error(describeUploadError(file.name, error))
        } finally {
          setUploading((prev) => prev.filter((item) => item.key !== key))
        }
      })
    )
  }

  async function handleDelete(attachment: Attachment) {
    try {
      setDeletingId(attachment.id)
      await deleteAttachment(taskId, attachment)
      latest.current = latest.current.filter(
        (item) => item.id !== attachment.id
      )
      onChange(latest.current)
      toast.success(`Đã xoá "${attachment.name}"`)
    } catch (error) {
      console.error("Failed to delete attachment:", error)
      toast.error(`Không thể xoá "${attachment.name}". Vui lòng thử lại.`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Dropzone onFiles={handleFiles} />

      {attachments.length || uploading.length ? (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <FileRow
              key={attachment.id}
              name={attachment.name}
              size={attachment.size}
            >
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
              >
                <a
                  href={attachment.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachment.name}
                  aria-label={`Tải xuống ${attachment.name}`}
                >
                  <Download className="size-4" />
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-destructive hover:text-destructive"
                disabled={deletingId === attachment.id}
                onClick={() => handleDelete(attachment)}
                aria-label={`Xoá ${attachment.name}`}
              >
                {deletingId === attachment.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </FileRow>
          ))}
          {uploading.map((item) => (
            <FileRow key={item.key} name={item.name} size={item.size}>
              <Progress value={item.progress} className="w-20 shrink-0" />
              <span className="w-9 shrink-0 text-right text-xs tabular-nums">
                {item.progress}%
              </span>
            </FileRow>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

interface PendingAttachmentsProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
  className?: string
}

/** Hàng đợi file trong form tạo task; upload sau khi task đã được tạo. */
export function PendingAttachments({
  files,
  onFilesChange,
  disabled,
  className,
}: PendingAttachmentsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <Dropzone
        disabled={disabled}
        onFiles={(picked) => onFilesChange([...files, ...pickValidFiles(picked)])}
      />
      {files.length ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <FileRow key={`${file.name}-${index}`} name={file.name} size={file.size}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                disabled={disabled}
                onClick={() =>
                  onFilesChange(files.filter((_, i) => i !== index))
                }
                aria-label={`Bỏ ${file.name}`}
              >
                <X className="size-4" />
              </Button>
            </FileRow>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
