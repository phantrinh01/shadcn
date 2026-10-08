"use client"

import * as React from "react"
import {
  AlertTriangle,
  ChevronRight,
  Files,
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  SquarePen,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

import type { Folder } from "@/modules/documents/services/types/folder-types"
import { FolderFormDialog } from "./folder-form-dialog"

type FolderDialogState =
  | { mode: "add"; parentId: string | null; parentName?: string }
  | { mode: "edit"; folder: Folder }
  | null

interface FolderTreeProps {
  folders: Folder[]
  /** Number of direct documents per folder id. */
  countByFolder: Record<string, number>
  totalDocuments: number
  /** `null` = "All documents" selected. */
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  canManage?: boolean
  onAddFolder: (name: string, parentId: string | null) => Promise<void>
  onUpdateFolder: (folder: Folder) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
}

interface TreeContext {
  childrenMap: Map<string | null, Folder[]>
  countByFolder: Record<string, number>
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
  canManage: boolean
  onAddSubfolder: (parent: Folder) => void
  onEditFolder: (folder: Folder) => void
  onAskDeleteFolder: (folder: Folder) => void
}

function FolderTreeNode({
  folder,
  depth,
  ctx,
}: {
  folder: Folder
  depth: number
  ctx: TreeContext
}) {
  const [expanded, setExpanded] = React.useState(true)
  const children = ctx.childrenMap.get(folder.id) ?? []
  const isSelected = ctx.selectedFolderId === folder.id
  const count = ctx.countByFolder[folder.id] ?? 0

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => ctx.onSelectFolder(folder.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            ctx.onSelectFolder(folder.id)
          }
        }}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          isSelected && "bg-muted font-medium text-foreground"
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Thu gọn" : "Mở rộng"}
            className="shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((prev) => !prev)
            }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate" title={folder.name}>
          {folder.name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{count}</span>

        {ctx.canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Thao tác thư mục"
                className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[170px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => ctx.onAddSubfolder(folder)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Thêm thư mục con
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => ctx.onEditFolder(folder)}
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Đổi tên
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => ctx.onAskDeleteFolder(folder)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {expanded &&
        children.map((child) => (
          <FolderTreeNode
            key={child.id}
            folder={child}
            depth={depth + 1}
            ctx={ctx}
          />
        ))}
    </div>
  )
}

export function FolderTree({
  folders,
  countByFolder,
  totalDocuments,
  selectedFolderId,
  onSelectFolder,
  canManage = false,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [dialogState, setDialogState] = React.useState<FolderDialogState>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Folder | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const childrenMap = React.useMemo(() => {
    const map = new Map<string | null, Folder[]>()
    for (const folder of folders) {
      const key = folder.parentId ?? null
      const siblings = map.get(key) ?? []
      siblings.push(folder)
      map.set(key, siblings)
    }
    for (const [, siblings] of map) {
      siblings.sort((a, b) => a.name.localeCompare(b.name, "vi"))
    }
    return map
  }, [folders])

  const roots = childrenMap.get(null) ?? []

  const ctx: TreeContext = {
    childrenMap,
    countByFolder,
    selectedFolderId,
    onSelectFolder,
    canManage,
    onAddSubfolder: (parent) =>
      setDialogState({
        mode: "add",
        parentId: parent.id,
        parentName: parent.name,
      }),
    onEditFolder: (folder) => setDialogState({ mode: "edit", folder }),
    onAskDeleteFolder: (folder) => setDeleteTarget(folder),
  }

  async function handleFormSubmit(name: string) {
    if (!dialogState) return
    try {
      setIsSubmitting(true)
      if (dialogState.mode === "add") {
        await onAddFolder(name, dialogState.parentId)
      } else {
        await onUpdateFolder({ ...dialogState.folder, name })
      }
      setDialogState(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await onDeleteFolder(deleteTarget.id)
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3">
        <CardTitle className="text-sm font-semibold">Thư mục</CardTitle>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-pointer"
            title="Thêm thư mục gốc"
            onClick={() => setDialogState({ mode: "add", parentId: null })}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {/* All documents */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectFolder(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onSelectFolder(null)
            }
          }}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
            selectedFolderId === null && "bg-muted font-medium text-foreground"
          )}
        >
          <Files className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">Tất cả tài liệu</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {totalDocuments}
          </span>
        </div>

        {/* Folder tree */}
        <div className="mt-0.5 space-y-0.5">
          {roots.map((folder) => (
            <FolderTreeNode
              key={folder.id}
              folder={folder}
              depth={0}
              ctx={ctx}
            />
          ))}
        </div>

        {folders.length === 0 && (
          <p className="mt-2 px-2 text-xs text-muted-foreground italic">
            Chưa có thư mục nào.
          </p>
        )}
      </CardContent>

      {/* Add / Rename folder dialog */}
      <FolderFormDialog
        open={dialogState !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDialogState(null)
        }}
        title={
          dialogState?.mode === "edit"
            ? "Đổi tên thư mục"
            : dialogState?.mode === "add" && dialogState.parentName
              ? "Thêm thư mục con"
              : "Thêm thư mục"
        }
        description={
          dialogState?.mode === "edit"
            ? `Đổi tên thư mục "${dialogState.folder.name}".`
            : dialogState?.mode === "add" && dialogState.parentName
              ? `Tạo thư mục con bên trong "${dialogState.parentName}".`
              : "Tạo thư mục mới ở cấp cao nhất."
        }
        initialName={
          dialogState?.mode === "edit" ? dialogState.folder.name : ""
        }
        isSubmitting={isSubmitting}
        onSubmit={handleFormSubmit}
      />

      {/* Delete folder confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Xác nhận xóa thư mục</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa thư mục{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deleteTarget?.name}&rdquo;
              </span>
              ? Chỉ có thể xóa thư mục không chứa tài liệu hoặc thư mục con.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Xóa thư mục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
