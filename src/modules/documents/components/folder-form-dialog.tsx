"use client"

import { useEffect, useState } from "react"
import { FolderPlus, Save } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { folderFormSchema } from "@/modules/documents/services/types/folder-types"

interface FolderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dialog title, e.g. "Thêm thư mục" or "Đổi tên thư mục". */
  title: string
  description?: string
  /** Pre-filled name (edit mode). */
  initialName?: string
  isSubmitting?: boolean
  onSubmit: (name: string) => void | Promise<void>
}

export function FolderFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initialName = "",
  isSubmitting = false,
  onSubmit,
}: FolderFormDialogProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const validated = folderFormSchema.parse({ name: name.trim() })
      await onSubmit(validated.name)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setError(validationError.issues[0]?.message ?? "Tên không hợp lệ")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">
              Tên thư mục <span className="text-destructive">*</span>
            </Label>
            <Input
              id="folder-name"
              placeholder="Nhập tên thư mục..."
              maxLength={100}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              className={error ? "border-destructive" : ""}
            />
            <div className="flex items-center justify-between">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {name.length}/100
              </span>
            </div>
          </div>

          <DialogFooter>
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
              {initialName ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Đang lưu..." : "Lưu"}
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Đang tạo..." : "Tạo thư mục"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
