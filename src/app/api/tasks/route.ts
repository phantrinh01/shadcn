import { NextResponse } from "next/server"

/**
 * Public mock API để chia sẻ danh sách công việc.
 * GET /api/tasks → trả về 100 công việc giả định (id, title, owner, startDate, dueDate, status, priority).
 *
 * Lưu ý: Route này bypass auth (proxy cho phép /api/*). CORS mở `*` cho phép consume từ bất kỳ domain nào.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

type TaskStatus = "to do" | "in progress" | "done"
type TaskPriority = "high" | "normal" | "low"

export interface Task {
  id: string
  title: string
  owner: string
  startDate: string
  dueDate: string
  status: TaskStatus
  priority: TaskPriority
}

// ─── Mock Data ──────────────────────────────────────────────

const TASK_TITLES = [
  "Thiết kế giao diện dashboard quản trị",
  "Phát triển API xác thực người dùng",
  "Tích hợp cổng thanh toán VNPay",
  "Tối ưu hiệu suất database queries",
  "Viết unit test cho module authentication",
  "Cập nhật tài liệu hướng dẫn sử dụng",
  "Refactor code module user management",
  "Tích hợp Firebase Authentication",
  "Xây dựng tính năng chat realtime",
  "Thiết kế database schema cho tasks",
  "Phát triển module báo cáo thống kê",
  "Tối ưu SEO cho landing page",
  "Viết unit test cho component DataTable",
  "Cấu hình CI/CD pipeline",
  "Triển khai ứng dụng lên production",
  "Xử lý lỗi memory leak trong React",
  "Tích hợp dịch vụ gửi email",
  "Thiết kế hệ thống phân quyền RBAC",
  "Phát triển mobile app React Native",
  "Tạo REST API cho module products",
  "Viết integration test cho checkout flow",
  "Cải thiện accessibility cho form components",
  "Triển khai caching layer với Redis",
  "Setup monitoring & alerting system",
  "Migr schema database sang PostgreSQL",
  "Tích hợp SDK Firebase Cloud Messaging",
  "Phát triển tính năng upload file",
  "Thiết kế system design cho microservices",
  "Code review cho pull request #42",
  "Fix bug navbar không responsive trên mobile",
  "Triển khai tính năng two-factor auth",
  "Phát triển plugin extensions marketplace",
  "Tối ưu bundle size cho production build",
  "Thiết kế API versioning strategy",
  "Viết E2E test cho user registration flow",
  "Cấu hình Elasticsearch cho full-text search",
  "Phát triển dashboard analytics realtime",
  "Tích hợp Google OAuth2 provider",
  "Refactor state management sang Zustand",
  "Xây dựng notification system push & email",
  "Thiết kế CI/CD cho multi-environment deploy",
  "Viết load test với k6 cho API gateway",
  "Phát triển admin panel cho content management",
  "Tích hợp CDN cho static assets",
  "Setup Docker compose cho local development",
  "Thiết kế event-driven architecture",
  "Phát triển webhook handler cho third-party",
  "Cải thiện Core Web Vitals cho landing page",
  "Viết A/B test framework cho frontend",
  "Tích hợp Sentry cho error tracking",
  "Phát triển feature dark mode cho app",
  "Thiết kế data pipeline cho analytics",
  "Tạo CLI tool cho code scaffolding",
  "Viết cron job cho scheduled tasks cleanup",
  "Phát triển plugin cho VS Code extension",
  "Tích hợp Slack bot cho team notifications",
  "Throttling rate limiter cho public APIs",
  "Xây dựng feedback widget cho end users",
  "Phát triển calendar integration với Google",
  "Tối ưu image processing pipeline",
  "Viết migration script cho legacy database",
  "Thiết kế logging strategy distributed system",
  "Phát triển chatbot AI cho customer support",
  "Tích hợp Zoom SDK cho video conferencing",
  "Cấu hình feature flags cho gradual rollout",
  "Viết API documentation với OpenAPI/Swagger",
  "Phát triển SSO integration cho enterprise",
  "Tối ưu SQL query N+1 problem",
  "Thiết kế multi-tenant architecture",
  "Xây dựng audit log system",
  "Phát triển PDF export cho reports",
  "Tích合 GitHub Actions cho auto deploy",
  "Viết pre-commit hooks cho code quality",
  "Thiết kế CAP theorem trade-offs cho system",
  "Phát triển WebSocket server cho realtime",
  "Cải thiện SEO meta tags cho từng page",
  "Setup Playwright cho E2E testing",
  "Thiết kế RESTful API best practices",
  "Phát triển drag-and-drop Kanban board",
  "Tích hợp Twilio cho SMS verification",
  "Viết data seeding script cho development",
  "Thiết kế caching strategy invalidate patterns",
  "Phát triển progressive web app features",
  "Tối ưu React rendering performance",
  "Setup Terraform cho infrastructure as code",
  "Thiết kế circuit breaker pattern cho calls",
  "Phát triển chart component với Recharts",
  "Tích hợp Hotjar cho user behavior tracking",
  "Viết developer onboarding documentation",
  "Phát triển theme customizer cho dashboard",
  "Tích hợp Firebase Analytics cho tracking",
  "Setup gray canary deployment strategy",
  "Thiết kế horizontal scaling architecture",
  "Phát triển print-friendly report view",
  "Tối ưu lazy loading cho routes & images",
]

const OWNERS = [
  "Nguyễn Văn An",
  "Trần Thị Bình",
  "Lê Hoàng Long",
  "Phạm Minh Châu",
  "Đỗ Thanh Hằng",
  "Vũ Đức Nam",
  "Bùi Thị Mai",
  "Hoàng Văn Đức",
  "Ngô Thanh Tùng",
  "Đặng Thị Lan",
]

const STATUSES: TaskStatus[] = ["to do", "in progress", "done"]
const PRIORITIES: TaskPriority[] = ["high", "normal", "low"]

// Seed-based pseudo-random cho dữ liệu ổn định giữa các request
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

function generateMockTasks(): Task[] {
  const tasks: Task[] = []

  for (let i = 0; i < 100; i++) {
    const r = seededRandom(i + 1)

    // startDate: ngẫu nhiên trong khoảng 2025-01-01 → 2025-12-31
    const startDayOffset = Math.floor(r * 364)
    const startDate = new Date(2025, 0, 1 + startDayOffset)

    // dueDate: 3–45 ngày sau startDate
    const durationDays = 3 + Math.floor(seededRandom(i + 200) * 43)
    const dueDate = new Date(startDate)
    dueDate.setDate(dueDate.getDate() + durationDays)

    tasks.push({
      id: `task-${String(i + 1).padStart(3, "0")}`,
      title: TASK_TITLES[i],
      owner: OWNERS[Math.floor(seededRandom(i + 100) * OWNERS.length)],
      startDate: startDate.toISOString().split("T")[0],
      dueDate: dueDate.toISOString().split("T")[0],
      status: STATUSES[Math.floor(seededRandom(i + 300) * STATUSES.length)],
      priority: PRIORITIES[Math.floor(seededRandom(i + 400) * PRIORITIES.length)],
    })
  }

  return tasks
}

const MOCK_TASKS = generateMockTasks()

// ─── Handlers ───────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "Lấy danh sách tasks thành công",
      data: MOCK_TASKS,
    },
    { status: 200, headers: CORS_HEADERS },
  )
}
