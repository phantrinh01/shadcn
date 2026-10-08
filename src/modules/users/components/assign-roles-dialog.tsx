"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import {
  getRolesForUser,
  removeRoleFromUser,
  setRolesForUser,
} from "../services/user-role-services"
import type { Role, User } from "../services/types/user-types"

interface AssignRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  onSuccess?: () => void
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  user,
  roles,
  onSuccess,
}: AssignRolesDialogProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set())
  const [initialRoleIds, setInitialRoleIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  // Load current assignments when the dialog opens
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const current = await getRolesForUser(user.uid)
        const ids = new Set(current.map((ur) => ur.roleId))
        if (!cancelled) {
          setSelectedRoleIds(new Set(ids))
          setInitialRoleIds(new Set(ids))
        }
      } catch (error) {
        console.error("Failed to load user roles:", error)
        if (!cancelled) {
          toast.error("Không thể tải danh sách role của người dùng")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (open && user) {
      load()
    } else if (!open) {
      setSelectedRoleIds(new Set())
      setInitialRoleIds(new Set())
      setSearch("")
    }

    return () => {
      cancelled = true
    }
  }, [open, user])

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles
    const lower = search.toLowerCase()
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower)
    )
  }, [roles, search])

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev)
      if (next.has(roleId)) next.delete(roleId)
      else next.add(roleId)
      return next
    })
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)

    try {
      // Determine adds and removes vs the initial state
      const toAdd = [...selectedRoleIds].filter((id) => !initialRoleIds.has(id))
      const toRemove = [...initialRoleIds].filter(
        (id) => !selectedRoleIds.has(id)
      )

      // Use setRolesForUser for atomic replace — keeps Firestore in sync.
      await setRolesForUser(user.uid, [...selectedRoleIds])

      if (toAdd.length > 0 || toRemove.length > 0) {
        toast.success(
          `Đã cập nhật ${toAdd.length} thêm / ${toRemove.length} bỏ role`
        )
      } else {
        toast.info("Không có thay đổi")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update user roles:", error)
      toast.error("Cập nhật role thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  // Convenience helper kept for reference - not used directly here.
  async function removeSingle(roleId: string) {
    if (!user) return
    await removeRoleFromUser(user.uid, roleId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            Gán role cho người dùng
          </DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                Quản lý các role của{" "}
                <span className="font-medium">{user.name}</span> (
                {user.email}).
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Tìm role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Separator />

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Đang tải...
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Không có role nào.
              </div>
            ) : (
              filteredRoles.map((role) => {
                const checked = selectedRoleIds.has(role.id)
                return (
                  <label
                    key={role.id}
                    htmlFor={`role-${role.id}`}
                    className="flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={checked}
                      onCheckedChange={() => toggleRole(role.id)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="text-sm font-medium">{role.name}</div>
                      {role.description ? (
                        <div className="text-xs text-muted-foreground">
                          {role.description}
                        </div>
                      ) : null}
                    </div>
                  </label>
                )
              })
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Đã chọn <strong>{selectedRoleIds.size}</strong> / {roles.length} role
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer"
            disabled={submitting || loading}
          >
            {submitting && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}