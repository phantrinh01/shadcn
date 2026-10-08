"use client"

import type { Table } from "@tanstack/react-table"
import { DatabaseZap, Plus, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

interface RoleDataTableToolbarProps<TData> {
  table: Table<TData>
  onAddRole?: () => void
  onSeedRoles?: () => void
  isSeeding?: boolean
}

export function RoleDataTableToolbar<TData>({
  table,
  onAddRole,
  onSeedRoles,
  isSeeding = false,
}: RoleDataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Tìm role..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="w-[200px] lg:w-[300px]"
        />
        <Button
          variant="outline"
          onClick={() => table.resetColumnFilters()}
          className="cursor-pointer px-3"
          disabled={!isFiltered}
        >
          <RefreshCcw data-icon="inline-start" />
          <span className="hidden lg:block">Đặt lại</span>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onSeedRoles}
          disabled={!onSeedRoles || isSeeding}
        >
          {isSeeding ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <DatabaseZap data-icon="inline-start" />
          )}
          {isSeeding ? "Đang seed..." : "Seed roles"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="cursor-pointer"
          onClick={onAddRole}
          disabled={!onAddRole}
        >
          <Plus data-icon="inline-start" />
          <span className="hidden lg:block">Thêm role</span>
        </Button>
      </div>
    </div>
  )
}
