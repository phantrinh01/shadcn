import type { Task } from "@/modules/tasks/services/types/task-types"

/** Quá hạn được tính theo ngày lịch ở múi giờ này (GMT+7), không theo timestamp. */
export const TASK_TIME_ZONE = "Asia/Ho_Chi_Minh"

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TASK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** `yyyy-MM-dd` của thời điểm `input` ở múi giờ Asia/Ho_Chi_Minh; null nếu ngày không hợp lệ. */
export function toTaskDayKey(input: string | Date): string | null {
  const date = typeof input === "string" ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return null
  return dayFormatter.format(date)
}

function dayKeyToUtc(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return Date.UTC(year, month - 1, day)
}

type OverdueInput = Pick<Task, "due_date" | "status">

/** Số ngày quá hạn (>= 1) hoặc 0 nếu chưa quá hạn / đã done / không có hạn. */
export function getDaysOverdue(task: OverdueInput, now: Date = new Date()) {
  if (!task.due_date || task.status === "done") return 0

  const dueKey = toTaskDayKey(task.due_date)
  const todayKey = toTaskDayKey(now)
  if (!dueKey || !todayKey) return 0

  const diff = Math.round((dayKeyToUtc(todayKey) - dayKeyToUtc(dueKey)) / 86_400_000)
  return diff > 0 ? diff : 0
}

export function isTaskOverdue(task: OverdueInput, now?: Date) {
  return getDaysOverdue(task, now) > 0
}

export function getOverdueLabel(days: number) {
  return `Quá hạn ${days} ngày`
}
