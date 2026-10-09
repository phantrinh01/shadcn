"use client"

import { Database, RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { priorities, statuses } from "@/modules/tasks/services/task-options"
import type {
  TaskAssignee,
  TaskInput,
} from "@/modules/tasks/services/types/task-types"
import { AddTaskModal } from "./add-task-modal"
import {
  defaultTaskFilters,
  isTaskFiltered,
  type TaskFilters,
} from "./task-filters"
import { ViewSwitcher, type TaskView } from "./view-switcher"

interface TaskToolbarProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  view: TaskView
  onViewChange: (view: TaskView) => void
  onAddTask?: (task: TaskInput) => void | Promise<void>
  assignees?: TaskAssignee[]
  onSeedTasks?: () => void | Promise<void>
  isSeedingTasks?: boolean
}

/** Toolbar dùng chung cho cả 4 view: filter, search, view switcher, add. */
export function TaskToolbar({
  filters,
  onFiltersChange,
  view,
  onViewChange,
  onAddTask,
  assignees,
  onSeedTasks,
  isSeedingTasks,
}: TaskToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select
          value={filters.status}
          onValueChange={(status) => onFiltersChange({ ...filters, status })}
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Status
            </SelectItem>
            {statuses.map((status) => (
              <SelectItem
                key={status.value}
                value={status.value}
                className="cursor-pointer"
              >
                <div className="flex items-center">
                  <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {status.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(priority) =>
            onFiltersChange({ ...filters, priority })
          }
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="cursor-pointer">
              All Priorities
            </SelectItem>
            {priorities.map((priority) => (
              <SelectItem
                key={priority.value}
                value={priority.value}
                className="cursor-pointer"
              >
                <div className="flex items-center">
                  <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {priority.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search Task"
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            className="w-[200px] cursor-text lg:w-[300px]"
          />
          <Button
            variant="outline"
            onClick={() => onFiltersChange(defaultTaskFilters)}
            className="cursor-pointer px-3"
            disabled={!isTaskFiltered(filters)}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden lg:block">Reset Filters</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onSeedTasks}
            disabled={!onSeedTasks || isSeedingTasks}
          >
            <Database className="h-4 w-4" />
            <span className="hidden lg:block">
              {isSeedingTasks ? "Seeding..." : "Seed Data"}
            </span>
          </Button>
          <ViewSwitcher value={view} onChange={onViewChange} />
          <AddTaskModal onAddTask={onAddTask} assignees={assignees} />
        </div>
      </div>
    </div>
  )
}
