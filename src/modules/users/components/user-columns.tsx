"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { KeyRound, Mail, Phone, ShieldCheck } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { generateUserAvatar } from "../services/user-services"
import {
  getProviderLabel,
  type Role,
  type User,
  type UserRole,
} from "../services/types/user-types"

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "disabled", label: "Disabled" },
] as const

export const genderOptions = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
] as const

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800"
    case "pending":
      return "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800"
    case "disabled":
      return "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800"
    default:
      return "text-gray-700 bg-gray-50 border-gray-200"
  }
}

function getGenderLabel(gender: string) {
  return genderOptions.find((g) => g.value === gender)?.label ?? gender
}

interface UserColumnActions {
  onEditUser?: (user: User) => void
  onDeleteUser?: (uid: string) => void
  onAssignRoles?: (user: User) => void
  onResetPassword?: (user: User) => void
}

interface UserTableMeta {
  roles: Role[]
  userRoles: UserRole[]
}

export function getUserColumns({
  onEditUser,
  onDeleteUser,
  onAssignRoles,
  onResetPassword,
}: UserColumnActions = {}): ColumnDef<User>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5 cursor-pointer"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Họ và tên",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium">
                {generateUserAvatar(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">
                {getGenderLabel(user.gender)}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "gender",
      header: "Giới tính",
      // Filter-only column: hidden by default (see UserDataTable) because
      // gender is shown as a sub-label in the name column. Exact match is
      // required — "male" is a substring of "female", so the default
      // includesString filter would mis-match.
      filterFn: "equalsString",
      cell: ({ row }) => (
        <span className="text-sm">
          {getGenderLabel(row.getValue("gender") as string)}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string
        return (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-3.5 text-muted-foreground" />
            <span className="truncate max-w-55">{email}</span>
          </div>
        )
      },
    },
    {
      id: "providers",
      header: "Auth Provider",
      cell: ({ row }) => {
        const providers = row.original.providers ?? []

        if (providers.length === 0) {
          return <span className="text-xs text-muted-foreground italic">—</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {providers.map((providerId) => {
              const isPassword = providerId === "password"
              const Icon = isPassword ? KeyRound : Mail
              return (
                <Badge
                  key={providerId}
                  variant="secondary"
                  className="gap-1 font-normal"
                >
                  <Icon className="size-3" />
                  {getProviderLabel(providerId)}
                </Badge>
              )
            })}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const providers = row.original.providers ?? []
        if (!Array.isArray(value) || value.length === 0) return true
        return value.some((v: string) => providers.includes(v))
      },
      enableSorting: false,
    },
    {
      accessorKey: "phone",
      header: "Số điện thoại",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string
        if (!phone) {
          return <span className="text-xs text-muted-foreground italic">—</span>
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="size-3.5 text-muted-foreground" />
            <span>{phone}</span>
          </div>
        )
      },
    },
    {
      id: "lastSignIn",
      header: "Đăng nhập gần nhất",
      cell: ({ row }) => {
        const lastSignInTime = row.original.lastSignInTime
        if (!lastSignInTime) {
          return (
            <span className="text-xs text-muted-foreground italic">
              Chưa đăng nhập
            </span>
          )
        }
        const date = new Date(lastSignInTime)
        return (
          <span className="text-sm">
            {date.toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}{" "}
            <span className="text-muted-foreground">
              {date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </span>
        )
      },
      enableSorting: true,
    },
    {
      id: "roles",
      header: "Roles",
      cell: ({ row, table }) => {
        const meta = table.options.meta as UserTableMeta | undefined
        const user = row.original
        const assignedRoles =
          meta?.roles.filter((role) =>
            meta?.userRoles.some(
              (ur) => ur.uid === user.uid && ur.roleId === role.id
            )
          ) ?? []

        if (assignedRoles.length === 0) {
          return (
            <span className="text-xs text-muted-foreground italic">
              Chưa gán role
            </span>
          )
        }

        return (
          <div className="flex flex-wrap gap-1">
            {assignedRoles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                <ShieldCheck className="mr-1 size-3" />
                {role.name}
              </Badge>
            ))}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const label =
          statusOptions.find((s) => s.value === status)?.label ?? status
        return (
          <Badge
            variant="outline"
            className={cn("capitalize", getStatusColor(status))}
          >
            {label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: Row<User> }) => {
        const user = row.original
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
                  className="lucide lucide-ellipsis"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onEditUser?.(user)}
              >
                Chỉnh sửa thông tin
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onAssignRoles?.(user)}
              >
                Gán / bỏ role
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onResetPassword?.(user)}
              >
                Đặt lại mật khẩu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={() => onDeleteUser?.(user.uid)}
              >
                Xóa người dùng
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

export const userColumns = getUserColumns()
