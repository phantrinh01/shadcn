"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"

import type {
  Attachment,
  Task,
  TaskAssignee,
} from "@/modules/tasks/services/types/task-types"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { DueDate, PriorityBadge, StatusLabel, TagBadges } from "./task-badges"

interface TaskColumnActions {
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
  onAttachmentsChange?: (taskId: string, attachments: Attachment[]) => void
  assignees?: TaskAssignee[]
}

export function getTaskColumns({
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
  onAttachmentsChange,
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
      cell: ({ row }) => (
        <StatusLabel status={row.original.status} className="w-[130px]" />
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          <PriorityBadge priority={row.original.priority} />
        </div>
      ),
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
      cell: ({ row }) => <DueDate task={row.original} />,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <TagBadges tags={row.original.tags} className="max-w-[200px]" />
      ),
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
          onAttachmentsChange={onAttachmentsChange}
          assignees={assignees}
        />
      ),
    },
  ]
}

export const columns = getTaskColumns()
