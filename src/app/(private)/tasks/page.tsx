"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowUp,
  BarChart3,
  CheckCircle2,
  Clock,
  ListTodo,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { uploadAttachment } from "@/modules/tasks/services/task-attachment-services"
import { getUsers } from "@/modules/users/services/user-services"
import { getTaskColumns } from "@/modules/tasks/components/columns"
import { BoardView } from "@/modules/tasks/components/board-view"
import { CalendarView } from "@/modules/tasks/components/calendar-view"
import { DataTable } from "@/modules/tasks/components/data-table"
import { GridView } from "@/modules/tasks/components/grid-view"
import { isTaskOverdue } from "@/modules/tasks/components/task-badges"
import {
  defaultTaskFilters,
  filterTasks,
  type TaskFilters,
} from "@/modules/tasks/components/task-filters"
import { TaskToolbar } from "@/modules/tasks/components/task-toolbar"
import { TaskViewSkeleton } from "@/modules/tasks/components/task-view-states"
import {
  parseTaskView,
  ViewSwitcher,
  type TaskView,
} from "@/modules/tasks/components/view-switcher"
import { cn } from "@/lib/utils"
import {
  createTask,
  deleteTask,
  getTasks,
  getTaskStats,
  seedTasksWithClient,
  updateTask,
} from "@/modules/tasks/services/task-services"
import {
  TASK_TITLE_MAX_LENGTH,
  type Attachment,
  type Task,
  type TaskAssignee,
  type TaskInput,
} from "@/modules/tasks/services/types/task-types"

export default function TaskPage() {
  // useSearchParams cần Suspense boundary khi build.
  return (
    <Suspense fallback={null}>
      <TaskPageContent />
    </Suspense>
  )
}

function TaskPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = parseTaskView(searchParams.get("view"))
  const [filters, setFilters] = useState<TaskFilters>(defaultTaskFilters)
  const [tasks, setTasks] = useState<Task[]>([])
  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [isSeedingTasks, setIsSeedingTasks] = useState(false)

  const refreshTasks = useCallback(async () => {
    const taskList = await getTasks()
    setTasks(taskList)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [, users] = await Promise.all([
          refreshTasks(),
          getUsers().catch(() => []),
        ])
        setAssignees(
          users.map((user) => ({
            uid: user.uid,
            name: user.name || user.email,
            photoURL: user.photoURL,
          }))
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.startsWith("Chưa đăng nhập Firebase")) toast.error(message)
        else console.error("Failed to load tasks:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [refreshTasks])

  const handleAddTask = useCallback(
    async (input: TaskInput, files: File[] = []) => {
      const created = await createTask(input)
      setTasks((prev) => [created, ...prev])

      // Task đã tạo xong; file nào lỗi chỉ báo riêng, không làm hỏng việc tạo task.
      const attachments: Attachment[] = []
      for (const file of files) {
        try {
          attachments.push(await uploadAttachment(created.id, file))
        } catch (error) {
          console.error("Failed to upload attachment:", error)
          toast.error(
            `Không thể tải lên "${file.name}". Hãy thêm lại trong phần Edit Task.`
          )
        }
      }
      if (attachments.length) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === created.id ? { ...task, attachments } : task
          )
        )
      }
    },
    []
  )

  const handleAttachmentsChange = useCallback(
    (taskId: string, attachments: Attachment[]) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, attachments } : task))
      )
    },
    []
  )

  const handleUpdateTask = useCallback(async (task: Task) => {
    await updateTask(task)
    setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)))
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId)
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }, [])

  const handleDuplicateTask = useCallback(async (task: Task) => {
    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...input
    } = task
    const duplicate = await createTask({
      ...input,
      title: `${task.title} (Copy)`.slice(0, TASK_TITLE_MAX_LENGTH),
    })
    setTasks((prev) => [duplicate, ...prev])
  }, [])

  const handleSeedTasks = useCallback(async () => {
    try {
      setIsSeedingTasks(true)
      const seededTasks = await seedTasksWithClient(
        assignees.map((member) => member.uid)
      )
      setTasks(seededTasks)
    } catch (error) {
      console.error("Failed to seed tasks:", error)
    } finally {
      setIsSeedingTasks(false)
    }
  }, [assignees])

  const taskColumns = useMemo(
    () =>
      getTaskColumns({
        onUpdateTask: handleUpdateTask,
        onDeleteTask: handleDeleteTask,
        onDuplicateTask: handleDuplicateTask,
        onAttachmentsChange: handleAttachmentsChange,
        assignees,
      }),
    [assignees, handleAttachmentsChange, handleDeleteTask, handleDuplicateTask, handleUpdateTask]
  )

  const handleViewChange = useCallback(
    (next: TaskView) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === "table") params.delete("view")
      else params.set("view", next)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  const filteredTasks = useMemo(
    () => filterTasks(tasks, filters),
    [tasks, filters]
  )

  // Grid và Board dùng được trên mobile; Table và Calendar cần màn hình lớn.
  const mobileFriendly = view === "grid" || view === "board"

  const stats = getTaskStats(tasks)
  const getPercent = (value: number) =>
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          A powerful task and issue tracker built with Tanstack Table.
        </p>
      </div>

      {/* Mobile view placeholder - shows message instead of images */}
      {!mobileFriendly ? (
        <div className="md:hidden px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 h-96 border rounded-lg bg-muted/20">
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold mb-2">Tasks Dashboard</h3>
              <p className="text-muted-foreground">
                Please use a larger screen to view this view, or switch to Grid
                or Board.
              </p>
            </div>
            <ViewSwitcher value={view} onChange={handleViewChange} />
          </div>
        </div>
      ) : null}

      {/* Desktop view */}
      <div
        className={cn(
          "h-full flex-1 flex-col space-y-6 px-4 md:flex md:px-6",
          mobileFriendly ? "flex" : "hidden"
        )}
      >
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Total Tasks
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.total}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.done)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <ListTodo className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Done
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.done}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.done)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <CheckCircle2 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    In Progress
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {stats.inProgress}
                    </span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.inProgress)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <Clock className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    To Do
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.todo}</span>
                    <span className="flex items-center gap-0.5 text-sm text-orange-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.todo)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <BarChart3 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              stats.overdue > 0 && "border-red-500/70 bg-red-50/40 dark:bg-red-950/20"
            )}
          >
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Quá hạn
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-2xl font-bold",
                        stats.overdue > 0 && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {stats.overdue}
                    </span>
                  </div>
                </div>
                <div
                  className={cn(
                    "bg-secondary rounded-lg p-3",
                    stats.overdue > 0 &&
                      "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                  )}
                >
                  <AlertTriangle className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>
              View, filter, and manage all your project tasks in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TaskToolbar
                filters={filters}
                onFiltersChange={setFilters}
                view={view}
                onViewChange={handleViewChange}
                onAddTask={handleAddTask}
                assignees={assignees}
                onSeedTasks={handleSeedTasks}
                isSeedingTasks={isSeedingTasks}
              />
              {loading ? (
                <TaskViewSkeleton />
              ) : view === "table" ? (
                <DataTable
                  data={filteredTasks}
                  columns={taskColumns}
                  getRowClassName={(task) =>
                    isTaskOverdue(task)
                      ? "bg-red-50/50 dark:bg-red-950/20 [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-red-500"
                      : undefined
                  }
                />
              ) : view === "board" ? (
                <BoardView
                  tasks={filteredTasks}
                  assignees={assignees}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onDuplicateTask={handleDuplicateTask}
                  onAttachmentsChange={handleAttachmentsChange}
                />
              ) : view === "grid" ? (
                <GridView
                  tasks={filteredTasks}
                  assignees={assignees}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onDuplicateTask={handleDuplicateTask}
                  onAttachmentsChange={handleAttachmentsChange}
                />
              ) : (
                <CalendarView
                  tasks={filteredTasks}
                  assignees={assignees}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onAttachmentsChange={handleAttachmentsChange}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
