"use client"

import type { Table } from "@tanstack/react-table"

import { DataTableViewOptions } from "./data-table-view-options"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

/** Filter/search/add đã chuyển lên TaskToolbar; ở đây chỉ còn chọn cột hiển thị. */
export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-end">
      <DataTableViewOptions table={table} />
    </div>
  )
}
