import { Card, CardContent } from "@/components/ui/card"
import { Users, UserCheck, ShieldCheck, Clock5 } from "lucide-react"

interface StatCardsProps {
  totalUsers: number
  activeUsers: number
  totalRoles: number
  pendingUsers: number
}

export function StatCards({
  totalUsers,
  activeUsers,
  totalRoles,
  pendingUsers,
}: StatCardsProps) {
  const metrics = [
    {
      title: "Tổng người dùng",
      value: totalUsers,
      icon: Users,
      description: "Tài khoản Firebase Auth",
    },
    {
      title: "Đang hoạt động",
      value: activeUsers,
      icon: UserCheck,
      description: "Tài khoản active",
    },
    {
      title: "Chờ kích hoạt",
      value: pendingUsers,
      icon: Clock5,
      description: "Đang chờ xử lý",
    },
    {
      title: "Tổng số role",
      value: totalRoles,
      icon: ShieldCheck,
      description: "Định nghĩa trong hệ thống",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="border">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <metric.icon className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {metric.title}
              </p>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-muted-foreground text-xs">
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}