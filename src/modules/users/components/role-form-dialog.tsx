"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  createRole,
  generateRoleId,
  updateRole,
} from "../services/role-services"
import {
  roleFormSchema,
  type Role,
  type RoleFormValues,
} from "../services/types/user-types"

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  onSuccess?: (role: Role) => void
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = Boolean(role)

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description ?? "",
      })
    } else {
      form.reset({ name: "", description: "" })
    }
  }, [role, form, open])

  const onSubmit = async (data: RoleFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEdit && role) {
        const updated: Role = {
          ...role,
          name: data.name,
          description: data.description ?? "",
        }
        await updateRole(updated)
        toast.success("Đã cập nhật role")
        onSuccess?.(updated)
        onOpenChange(false)
      } else {
        const id = generateRoleId(data.name)
        const now = new Date().toISOString()
        const newRole: Role = {
          id,
          name: data.name,
          description: data.description ?? "",
          createdAt: now,
          updatedAt: now,
        }
        await createRole(newRole)
        toast.success("Đã tạo role mới")
        onSuccess?.(newRole)
        form.reset()
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Failed to save role:", error)
      toast.error("Lưu role thất bại")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa role" : "Thêm role mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật tên và mô tả của role."
              : "Tạo role mới - bạn có thể gán role này cho người dùng sau."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên role *</FormLabel>
                  <FormControl>
                    <Input placeholder="VD: Super Admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mô tả ngắn về vai trò này..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isEdit ? (
                  <Save className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {isEdit ? "Lưu thay đổi" : "Tạo role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}