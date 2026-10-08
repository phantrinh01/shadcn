"use client"

import * as React from "react"
import type { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  priorities,
  services,
  statuses,
} from "@/modules/customers/services/customer-mock-data"
import {
  customerSchema,
  type Customer,
} from "@/modules/customers/services/types/customer-types"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onUpdateCustomer?: (customer: Customer) => void | Promise<void>
  onDeleteCustomer?: (customerId: string) => void | Promise<void>
  onDuplicateCustomer?: (customer: Customer) => void | Promise<void>
}

export function DataTableRowActions<TData>({
  row,
  onUpdateCustomer,
  onDeleteCustomer,
  onDuplicateCustomer,
}: DataTableRowActionsProps<TData>) {
  const parsed = customerSchema.safeParse(row.original)
  const [editOpen, setEditOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<Customer | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!parsed.success) {
    return null
  }

  const customer = parsed.data

  function openEditDialog() {
    setDraft(customer)
    setError(null)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!draft?.fullName.trim()) {
      setError("Full name is required")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onUpdateCustomer?.({ ...draft, fullName: draft.fullName.trim() })
      setEditOpen(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update customer"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted cursor-pointer"
          >
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem className="cursor-pointer" onClick={openEditDialog}>
            Edit Customer
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onDuplicateCustomer?.(customer)}
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            variant="destructive"
            onClick={() => onDeleteCustomer?.(customer.id)}
          >
            Delete
            <DropdownMenuShortcut className="text-destructive">
              ⌘⌫
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer details and save them to Firestore.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-5">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`customer-name-${customer.id}`}>
                  Full Name
                </Label>
                <Input
                  id={`customer-name-${customer.id}`}
                  value={draft.fullName}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, fullName: event.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, email: event.target.value }
                          : current
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={draft.phoneNumber}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, phoneNumber: event.target.value }
                          : current
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select
                    value={draft.serviceName}
                    onValueChange={(value) =>
                      setDraft((current) =>
                        current ? { ...current, serviceName: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.value} value={service.value}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((current) =>
                        current ? { ...current, status: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(value) =>
                    setDraft((current) =>
                      current ? { ...current, priority: value } : current
                    )
                  }
                >
                  <SelectTrigger className="w-full md:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
