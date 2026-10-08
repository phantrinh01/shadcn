"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ShieldCheck, Users } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { AssignRolesDialog } from "@/modules/users/components/assign-roles-dialog"
import { getRoleColumns } from "@/modules/users/components/role-columns"
import { RoleDataTable } from "@/modules/users/components/role-data-table"
import { RoleFormDialog } from "@/modules/users/components/role-form-dialog"
import { StatCards } from "@/modules/users/components/stat-cards"
import { getUserColumns } from "@/modules/users/components/user-columns"
import { UserDataTable } from "@/modules/users/components/user-data-table"
import { UserFormDialog } from "@/modules/users/components/user-form-dialog"
import { deleteRole, getRoles, seedRolesWithClient } from "@/modules/users/services/role-services"
import {
  getUserRoles,
  removeAllAssignmentsForRole,
} from "@/modules/users/services/user-role-services"
import { deleteUserViaApi, getUsers } from "@/modules/users/services/user-services"
import type {
  Role,
  User,
} from "@/modules/users/services/types/user-types"

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userRoles, setUserRoles] = useState<
    Awaited<ReturnType<typeof getUserRoles>>
  >([])
  const [loading, setLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)

  // User dialogs
  const [userFormOpen, setUserFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Role dialogs
  const [roleFormOpen, setRoleFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  // Assign-roles dialog
  const [assignRolesOpen, setAssignRolesOpen] = useState(false)
  const [assigningUser, setAssigningUser] = useState<User | null>(null)

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "user"; uid: string; name: string }
    | { kind: "role"; roleId: string; name: string }
    | null
  >(null)

  const refreshAll = useCallback(async () => {
    const [userList, roleList, urList] = await Promise.all([
      getUsers(),
      getRoles(),
      getUserRoles(),
    ])
    setUsers(userList)
    setRoles(roleList)
    setUserRoles(urList)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        await refreshAll()
      } catch (error) {
        console.error("Failed to load users page data:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshAll])

  const handleSeedRoles = useCallback(async () => {
    try {
      setIsSeeding(true)
      await seedRolesWithClient()
      await refreshAll()
      toast.success("Đã seed 5 roles mẫu")
    } catch (error) {
      console.error("Seed roles failed:", error)
      toast.error("Seed roles thất bại")
    } finally {
      setIsSeeding(false)
    }
  }, [refreshAll])

  // =====================================================
  // User actions
  // =====================================================

  const handleAddUser = () => {
    setEditingUser(null)
    setUserFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserFormOpen(true)
  }

  const handleDeleteUser = (uid: string) => {
    const u = users.find((x) => x.uid === uid)
    setPendingDelete({
      kind: "user",
      uid,
      name: u?.name ?? uid,
    })
  }

  const confirmDeleteUser = async () => {
    if (!pendingDelete || pendingDelete.kind !== "user") return
    try {
      const result = await deleteUserViaApi(pendingDelete.uid)
      if (!result.success) {
        toast.error(result.message ?? "Xóa thất bại")
        return
      }
      toast.success("Đã xóa người dùng khỏi Firebase Auth")
      await refreshAll()
    } catch (error) {
      console.error(error)
      toast.error("Xóa thất bại")
    } finally {
      setPendingDelete(null)
    }
  }

  const handleAssignRoles = (user: User) => {
    setAssigningUser(user)
    setAssignRolesOpen(true)
  }

  const handleResetPassword = (user: User) => {
    setEditingUser(user)
    setUserFormOpen(true)
  }

  const handleUserSaved = async () => {
    await refreshAll()
  }

  // =====================================================
  // Role actions
  // =====================================================

  const handleAddRole = () => {
    setEditingRole(null)
    setRoleFormOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleFormOpen(true)
  }

  const handleDeleteRole = (roleId: string) => {
    const r = roles.find((x) => x.id === roleId)
    setPendingDelete({
      kind: "role",
      roleId,
      name: r?.name ?? roleId,
    })
  }

  const confirmDeleteRole = async () => {
    if (!pendingDelete || pendingDelete.kind !== "role") return
    try {
      await removeAllAssignmentsForRole(pendingDelete.roleId)
      await deleteRole(pendingDelete.roleId)
      toast.success("Đã xóa role")
      await refreshAll()
    } catch (error) {
      console.error(error)
      toast.error("Xóa role thất bại")
    } finally {
      setPendingDelete(null)
    }
  }

  // =====================================================
  // Column definitions (memoised)
  // =====================================================

  const userColumns = useMemo(
    () =>
      getUserColumns({
        onEditUser: handleEditUser,
        onDeleteUser: handleDeleteUser,
        onAssignRoles: handleAssignRoles,
        onResetPassword: handleResetPassword,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, roles, userRoles]
  )

  const roleColumns = useMemo(
    () =>
      getRoleColumns({
        onEditRole: handleEditRole,
        onDeleteRole: handleDeleteRole,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roles, userRoles]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    disabled: users.filter((u) => u.status === "disabled").length,
    totalRoles: roles.length,
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Người dùng & Phân quyền</h1>
        <p className="text-muted-foreground">
          Quản lý tài khoản Firebase Auth và gán role cho người dùng trong hệ thống.
        </p>
      </div>

      <div className="px-4 md:px-6">
        <StatCards
          totalUsers={stats.total}
          activeUsers={stats.active}
          totalRoles={stats.totalRoles}
          pendingUsers={stats.pending}
        />
      </div>

      <div className="px-4 md:px-6">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="cursor-pointer">
              <Users className="mr-2 size-4" />
              Người dùng ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="roles" className="cursor-pointer">
              <ShieldCheck className="mr-2 size-4" />
              Roles ({stats.totalRoles})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý người dùng</CardTitle>
                <CardDescription>
                  Danh sách được lấy trực tiếp từ Firebase Auth và ghép với profile
                  trong Firestore. Mỗi người dùng có một tài khoản Auth với uid tương
                  ứng.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserDataTable
                  data={users}
                  columns={userColumns}
                  roles={roles}
                  userRoles={userRoles}
                  onAddUser={handleAddUser}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý Role</CardTitle>
                <CardDescription>
                  Định nghĩa các role trong hệ thống. Mỗi role có thể được gán cho nhiều
                  người dùng thông qua tab Người dùng.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleDataTable
                  data={roles}
                  columns={roleColumns}
                  userRoles={userRoles}
                  onAddRole={handleAddRole}
                  onSeedRoles={handleSeedRoles}
                  isSeeding={isSeeding}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <UserFormDialog
        open={userFormOpen}
        onOpenChange={setUserFormOpen}
        user={editingUser}
        onSuccess={handleUserSaved}
      />

      <RoleFormDialog
        open={roleFormOpen}
        onOpenChange={setRoleFormOpen}
        role={editingRole}
        onSuccess={handleUserSaved}
      />

      <AssignRolesDialog
        open={assignRolesOpen}
        onOpenChange={setAssignRolesOpen}
        user={assigningUser}
        roles={roles}
        onSuccess={handleUserSaved}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "user"
                ? "Xóa người dùng"
                : "Xóa role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "user" ? (
                <>
                  Bạn có chắc muốn xóa người dùng{" "}
                  <span className="font-semibold">{pendingDelete.name}</span>?
                  Hành động này sẽ xóa tài khoản Firebase Auth, profile Firestore và mọi
                  role đã gán.
                </>
              ) : (
                <>
                  Bạn có chắc muốn xóa role{" "}
                  <span className="font-semibold">{pendingDelete?.name}</span>?
                  Mọi gán role cho người dùng cũng sẽ bị xóa.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault()
                if (pendingDelete?.kind === "user") {
                  confirmDeleteUser()
                } else if (pendingDelete?.kind === "role") {
                  confirmDeleteRole()
                }
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
