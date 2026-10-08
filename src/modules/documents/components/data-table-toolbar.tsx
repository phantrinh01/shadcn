"use client"

import type { Table } from "@tanstack/react-table"
import { Database, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { documentStatuses } from "@/modules/documents/services/document-mock-data"
import type { Document } from "@/modules/documents/services/types/document-types"
import type { Folder } from "@/modules/documents/services/types/folder-types"
import { AddDocumentModal } from "./add-document-modal"
import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  canManage?: boolean
  folders?: Folder[]
  defaultFolderId?: string | null
  onAddDocument?: (
    document: Omit<Document, "id">
  ) => Promise<Document | void> | void
  onFilesUploaded?: (documentId: string) => void | Promise<void>
  onSeedDocuments?: () => void | Promise<void>
  isSeedingDocuments?: boolean
}

export function DataTableToolbar<TData>({
  table,
  canManage = false,
  folders = [],
  defaultFolderId = null,
  onAddDocument,
  onFilesUploaded,
  onSeedDocuments,
  isSeedingDocuments,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleStatusChange = (value: string) => {
    const column = table.getColumn("status")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const statusFilter = table.getColumn("status")?.getFilterValue() as
    | string
    | undefined

  return (
    <div className="space-y-4">
      {/* Filter + Actions Section */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-1 items-center space-x-2 flex-wrap">
          <Select
            value={statusFilter || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full sm:w-[200px] cursor-pointer">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                Tất cả trạng thái
              </SelectItem>
              {documentStatuses.map((status) => (
                <SelectItem
                  key={status.value}
                  value={status.value}
                  className="cursor-pointer"
                >
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

          <Input
            placeholder="Tìm tài liệu..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="w-full sm:w-[250px] lg:w-[300px] cursor-text"
          />

          <Button
            variant="outline"
            onClick={() => table.resetColumnFilters()}
            className="px-3 cursor-pointer"
            disabled={!isFiltered}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden lg:block">Xóa bộ lọc</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={onSeedDocuments}
              disabled={!onSeedDocuments || isSeedingDocuments}
            >
              <Database className="h-4 w-4" />
              <span className="hidden lg:block">
                {isSeedingDocuments ? "Đang seed..." : "Seed Data"}
              </span>
            </Button>
          )}
          <DataTableViewOptions table={table} />
          {canManage && (
            <AddDocumentModal
              onAddDocument={onAddDocument}
              onFilesUploaded={onFilesUploaded}
              folders={folders}
              defaultFolderId={defaultFolderId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
