"use client"

import * as React from "react"
import type { Row } from "@tanstack/react-table"
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  SquarePen,
} from "lucide-react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { documentStatuses } from "@/modules/documents/services/document-mock-data"
import {
  documentSchema,
  type Document,
  type DocumentAttachment,
} from "@/modules/documents/services/types/document-types"
import type { Folder } from "@/modules/documents/services/types/folder-types"
import { EditDocumentModal } from "./edit-document-modal"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = parseFloat((bytes / 1024 ** i).toFixed(1))
  return `${size} ${units[i]}`
}

function formatDate(value: unknown): string {
  if (!value) return "—"
  try {
    if (typeof value === "object" && value !== null && "toDate" in value) {
      return (value as { toDate: () => Date })
        .toDate()
        .toLocaleDateString("vi-VN")
    }
    const date = new Date(value as string)
    if (isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("vi-VN")
  } catch {
    return "—"
  }
}

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  attachments?: DocumentAttachment[]
  folders?: Folder[]
  canManage?: boolean
  onUpdateDocument?: (document: Document) => void | Promise<void>
  onDeleteDocument?: (documentId: string) => void | Promise<void>
  onFilesUploaded?: (documentId: string) => void | Promise<void>
}

export function DataTableRowActions<TData>({
  row,
  attachments = [],
  folders = [],
  canManage = false,
  onUpdateDocument,
  onDeleteDocument,
  onFilesUploaded,
}: DataTableRowActionsProps<TData>) {
  const parsed = documentSchema.safeParse(row.original)
  const [editOpen, setEditOpen] = React.useState(false)
  const [viewOpen, setViewOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  if (!parsed.success) {
    return null
  }

  const documentItem = parsed.data

  async function handleDelete() {
    try {
      await onDeleteDocument?.(documentItem.id)
      toast.success("Xóa thành công", {
        description: `Tài liệu "${documentItem.name}" đã được xóa.`,
      })
      setDeleteOpen(false)
    } catch {
      toast.error("Lỗi khi xóa", {
        description: "Không thể xóa tài liệu. Vui lòng thử lại sau.",
      })
    }
  }

  const statusLabel = documentStatuses.find(
    (s) => s.value === documentItem.status
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setViewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          {canManage && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setEditOpen(true)}
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận xóa tài liệu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài liệu{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{documentItem.name}&rdquo;
              </span>
              ? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Xóa tài liệu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Sheet */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Chi tiết tài liệu</SheetTitle>
            <SheetDescription>
              Thông tin chi tiết về tài liệu này.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tên</p>
              <p className="text-sm font-semibold">{documentItem.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Trạng thái
              </p>
              <Badge variant="outline">
                {statusLabel?.label ?? documentItem.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Người tạo
                </p>
                <p className="text-sm">{documentItem.createdBy || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Ngày tạo
                </p>
                <p className="text-sm">
                  {formatDate(documentItem.createdDate)}
                </p>
              </div>
            </div>
            {documentItem.summary ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Tóm tắt
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {documentItem.summary}
                </p>
              </div>
            ) : null}

            {/* Attachments section */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                File đính kèm{" "}
                {attachments.length > 0 ? `(${attachments.length})` : ""}
              </p>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Chưa có file đính kèm nào.
                </p>
              ) : (
                <AttachmentGroup className="flex-col">
                  {attachments.map((att) => (
                    <Attachment
                      key={att.name}
                      size="sm"
                      state="done"
                      className="w-full"
                    >
                      <AttachmentMedia>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>{att.name}</AttachmentTitle>
                        <AttachmentDescription>
                          {formatFileSize(att.size)}
                        </AttachmentDescription>
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          aria-label={`Tải xuống ${att.name}`}
                          onClick={() =>
                            window.open(
                              att.url,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          <Download className="h-4 w-4" />
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  ))}
                </AttachmentGroup>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog (single-step: info + add/remove attachments) */}
      <EditDocumentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        document={documentItem}
        attachments={attachments}
        folders={folders}
        onUpdateDocument={onUpdateDocument}
        onFilesUploaded={onFilesUploaded}
      />
    </>
  )
}
