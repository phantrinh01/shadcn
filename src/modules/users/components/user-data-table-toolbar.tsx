"use client"

import type { Table } from "@tanstack/react-table"
import { Plus, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DataTableViewOptions } from "@/modules/tasks/components/data-table-view-options"

import { statusOptions } from "./user-columns"

interface UserDataTableToolbarProps<TData> {
  table: Table<TData>
  onAddUser?: () => void
}

export function UserDataTableToolbar<TData>({
  table,
  onAddUser,
}: UserDataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleStatusChange = (value: string) => {
    const column = table.getColumn("status")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue([value])
    }
  }

  const handleGenderChange = (value: string) => {
    const column = table.getColumn("gender")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const statusFilter = table.getColumn("status")?.getFilterValue() as
    | string[]
    | undefined
  const genderFilter = table.getColumn("gender")?.getFilterValue() as
    | string
    | undefined

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        {/* Status Filter */}
        <Select
          value={statusFilter?.[0] ?? "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-42.5 cursor-pointer">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              Tất cả trạng thái
            </SelectItem>
            {statusOptions.map((status) => (
              <SelectItem
                key={status.value}
                value={status.value}
                className="cursor-pointer"
              >
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Gender Filter */}
        <Select
          value={genderFilter ?? "all"}
          onValueChange={handleGenderChange}
        >
          <SelectTrigger className="w-40 cursor-pointer">
            <SelectValue placeholder="Giới tính" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              Tất cả giới tính
            </SelectItem>
            <SelectItem value="male" className="cursor-pointer">
              Nam
            </SelectItem>
            <SelectItem value="female" className="cursor-pointer">
              Nữ
            </SelectItem>
            <SelectItem value="other" className="cursor-pointer">
              Khác
            </SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Tìm theo tên hoặc email..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="w-50 lg:w-75"
        />
        <Button
          variant="outline"
          onClick={() => table.resetColumnFilters()}
          className="px-3 cursor-pointer"
          disabled={!isFiltered}
        >
          <RefreshCcw className="h-4 w-4" />
          <span className="hidden lg:block">Đặt lại</span>
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <DataTableViewOptions table={table} />
        <Button
          size="sm"
          className="cursor-pointer"
          onClick={onAddUser}
          disabled={!onAddUser}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden lg:block">Thêm người dùng</span>
        </Button>
      </div>
    </div>
  )
}
