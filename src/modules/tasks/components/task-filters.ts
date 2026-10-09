import type { Task } from "@/modules/tasks/services/types/task-types"

export interface TaskFilters {
  search: string
  status: string // "all" | TaskStatus
  priority: string // "all" | TaskPriority
}

export const defaultTaskFilters: TaskFilters = {
  search: "",
  status: "all",
  priority: "all",
}

export function isTaskFiltered(filters: TaskFilters) {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all"
  )
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const keyword = filters.search.trim().toLowerCase()

  return tasks.filter(
    (task) =>
      (filters.status === "all" || task.status === filters.status) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (!keyword || task.title.toLowerCase().includes(keyword))
  )
}
