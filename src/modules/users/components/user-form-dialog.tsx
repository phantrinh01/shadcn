"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  createUserViaApi,
  updateUserViaApi,
} from "../services/user-services"
import {
  userFormSchema,
  type User,
  type UserFormValues,
} from "../services/types/user-types"

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the dialog runs in "edit" mode against this user. */
  user?: User | null
  /** Trigger element to open the dialog when in uncontrolled mode. */
  trigger?: React.ReactNode
  onSuccess?: (user: User) => void
}

const EMPTY_DEFAULTS: UserFormValues = {
  name: "",
  email: "",
  gender: "male",
  phone: "",
  status: "active",
  password: "",
}

function defaultsFor(user: User | null | undefined): UserFormValues {
  if (!user) return { ...EMPTY_DEFAULTS }
  return {
    name: user.name ?? "",
    email: user.email ?? "",
    gender: user.gender ?? "male",
    phone: user.phone ?? "",
    status: user.status ?? "active",
    password: "",
  }
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  trigger,
  onSuccess,
}: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      {/*
        Re-mount the inner form every time the target user changes so the
        form always starts from a known state (existing user data, or empty
        for create). This is more reliable than resetting in useEffect.
      */}
      <UserFormDialogBody
        key={user?.uid ?? "__new__"}
        user={user ?? null}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </Dialog>
  )
}

interface UserFormDialogBodyProps {
  user: User | null
  onClose: () => void
  onSuccess?: (user: User) => void
}

function UserFormDialogBody({ user, onClose, onSuccess }: UserFormDialogBodyProps) {
  const isEdit = Boolean(user)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultsFor(user),
  })

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEdit && user) {
        const result = await updateUserViaApi(user.uid, {
          name: data.name,
          gender: data.gender,
          phone: data.phone,
          status: data.status,
          ...(data.password ? { password: data.password } : {}),
        })

        if (!result.success) {
          toast.error(result.message ?? "Cập nhật thất bại")
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
              if (messages?.[0]) {
                form.setError(field as keyof UserFormValues, {
                  type: "server",
                  message: messages[0],
                })
              }
            })
          }
          return
        }

        toast.success(result.message ?? "Đã cập nhật người dùng")
        onSuccess?.({
          ...user,
          name: data.name,
          gender: data.gender,
          phone: data.phone ?? "",
          status: data.status,
          disabled: data.status === "disabled",
        })
        onClose()
      } else {
        if (!data.password) {
          form.setError("password", { message: "Mật khẩu là bắt buộc" })
          return
        }

        const result = await createUserViaApi({
          name: data.name,
          email: data.email,
          gender: data.gender,
          phone: data.phone,
          status: data.status,
          password: data.password,
        })

        if (!result.success) {
          toast.error(result.message ?? "Tạo thất bại")
          if (result.errors) {
            Object.entries(result.errors).forEach(([field, messages]) => {
              if (messages?.[0]) {
                form.setError(field as keyof UserFormValues, {
                  type: "server",
                  message: messages[0],
                })
              }
            })
          }
          return
        }

        toast.success(result.message ?? "Đã tạo người dùng")
        onSuccess?.({
          uid: result.data?.uid ?? "",
          name: data.name,
          email: data.email,
          gender: data.gender,
          phone: data.phone ?? "",
          status: data.status,
          address: user?.address ?? "",
          disabled: data.status === "disabled",
          emailVerified: false,
          photoURL: user?.photoURL ?? null,
          creationTime: new Date().toISOString(),
          lastSignInTime: null,
          providers: ["password"],
          profileCreatedAt: new Date().toISOString(),
          profileUpdatedAt: new Date().toISOString(),
        })
        onClose()
      }
    } catch (error) {
      console.error(error)
      toast.error("Đã xảy ra lỗi không mong muốn")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[525px]">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        </DialogTitle>
        <DialogDescription>
          {isEdit ? (
            <>
              Đang chỉnh sửa tài khoản{" "}
              <span className="font-medium text-foreground">
                {user?.email}
              </span>
              . Email không thể thay đổi.
            </>
          ) : (
            "Tạo tài khoản Firebase Auth mới cùng với profile Firestore."
          )}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+84 ..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giới tính</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Nam</SelectItem>
                      <SelectItem value="female">Nữ</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trạng thái</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isEdit
                    ? "Mật khẩu mới (để trống nếu không đổi)"
                    : "Mật khẩu *"}
                </FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
              {isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}