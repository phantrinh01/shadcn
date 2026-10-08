"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { ShieldCheck, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { Role, UserRole } from "../services/types/user-types"

interface RoleColumnActions {
  onEditRole?: (role: Role) => void
  onDeleteRole?: (roleId: string) => void
}

interface RoleTableMeta {
  userRoles: UserRole[]
}

export function getRoleColumns({
  onEditRole,
  onDeleteRole,
}: RoleColumnActions = {}): ColumnDef<Role>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id = row.getValue("id") as string
        return (
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            <span className="font-mono text-xs">{id}</span>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Tên role",
      cell: ({ row }) => {
        const role = row.original
        return (
          <div className="flex flex-col">
            <span className="font-medium">{role.name}</span>
            {role.description ? (
              <span className="text-xs text-muted-foreground">
                {role.description}
              </span>
            ) : null}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      id: "userCount",
      header: "Số người dùng",
      cell: ({ row, table }) => {
        const role = row.original
        const meta = table.options.meta as RoleTableMeta | undefined
        const count =
          meta?.userRoles.filter((ur) => ur.roleId === role.id).length ?? 0
        return (
          <Badge variant="outline" className="gap-1.5">
            <Users className="size-3" />
            {count} người dùng
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: "Ngày tạo",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string | undefined
        if (!createdAt) return <span className="text-muted-foreground">—</span>
        const date = new Date(createdAt)
        return (
          <span className="text-sm">
            {date.toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: Row<Role> }) => {
        const role = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
              >
                <span className="sr-only">Mở menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onEditRole?.(role)}
              >
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => onDeleteRole?.(role.id)}
              >
                Xóa role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

export const roleColumns = getRoleColumns()
