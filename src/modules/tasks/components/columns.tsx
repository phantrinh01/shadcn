"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { format, isPast } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import { priorities, statuses } from "@/modules/tasks/services/task-options"
import type {
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"

interface TaskColumnActions {
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
  assignees?: TaskAssignee[]
}

export function getTaskColumns({
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  assignees = [],
}: TaskColumnActions = {}): ColumnDef<Task>[] {
  const assigneeNames = new Map(assignees.map((m) => [m.uid, m.name]))

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
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="max-w-[500px] truncate font-medium">
              {row.getValue("title")}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = statuses.find(
          (status) => status.value === row.getValue("status")
        )

        if (!status) {
          return null
        }

        return (
          <div className="flex w-[130px] items-center">
            {status.icon && (
              <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">{status.label}</span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => {
        const priority = priorities.find(
          (priority) => priority.value === row.getValue("priority")
        )

        if (!priority) {
          return null
        }

        const priorityColors: Record<string, string> = {
          high: "border-red-700 text-red-700 dark:text-red-400",
          medium: "border-orange-500 text-orange-700 dark:text-orange-400",
          low: "border-gray-500 text-gray-700 dark:text-gray-400",
        }

        return (
          <div className="flex items-center">
            <Badge
              variant="outline"
              className={cn("pl-2", priorityColors[priority.value])}
            >
              <span className="text-sm">{priority.label}</span>
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "assignee",
      accessorFn: (task) =>
        task.assignee
          ? (assigneeNames.get(task.assignee) ?? task.assignee)
          : "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) => {
        const name = row.getValue<string>("assignee")

        return name ? (
          <span className="block max-w-[160px] truncate text-sm">{name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )
      },
    },
    {
      accessorKey: "due_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due date" />
      ),
      cell: ({ row }) => {
        const dueDate = row.original.due_date

        if (!dueDate) {
          return <span className="text-sm text-muted-foreground">—</span>
        }

        const date = new Date(dueDate)
        const overdue = row.original.status !== "done" && isPast(date)

        return (
          <span
            className={cn(
              "whitespace-nowrap text-sm",
              overdue && "font-medium text-red-600 dark:text-red-400"
            )}
          >
            {format(date, "dd/MM/yyyy")}
          </span>
        )
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? []
        if (!tags.length) return null

        return (
          <div className="flex max-w-[200px] flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline">+{tags.length - 3}</Badge>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onDuplicateTask={onDuplicateTask}
          assignees={assignees}
        />
      ),
    },
  ]
}

export const columns = getTaskColumns()
