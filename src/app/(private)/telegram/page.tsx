"use client"

import { useState } from "react"
import { Loader2, Send, User, Users, Megaphone } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type Destination = "personal" | "group" | "channel"

const destinationConfig: Record<
  Destination,
  {
    label: string
    icon: typeof User
    placeholder: string
    hint: string
  }
> = {
  personal: {
    label: "Cá nhân",
    icon: User,
    placeholder: "123456789",
    hint: "Chat ID người dùng (số dương). Lấy từ @userinfobot.",
  },
  group: {
    label: "Group",
    icon: Users,
    placeholder: "-123456789",
    hint: "Chat ID nhóm (số âm). Bot phải là thành viên của group.",
  },
  channel: {
    label: "Channel",
    icon: Megaphone,
    placeholder: "@ten_kenh hoặc -1001234567890",
    hint: "Username kênh (@ten_kenh) hoặc Chat ID kênh. Bot phải là admin của channel.",
  },
}

export default function TelegramTestPage() {
  const [destination, setDestination] = useState<Destination>("personal")
  const [chatIds, setChatIds] = useState<Record<Destination, string>>({
    personal: "",
    group: "",
    channel: "",
  })
  const [messages, setMessages] = useState<Record<Destination, string>>({
    personal: "Xin chào! Đây là tin nhắn test gửi tới cá nhân.",
    group: "Xin chào cả nhóm! Đây là tin nhắn test gửi tới group.",
    channel: "📢 Đây là tin nhắn test gửi tới channel.",
  })
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const config = destinationConfig[destination]
  const chatId = chatIds[destination]
  const message = messages[destination]
  const isFormValid = chatId.trim() !== "" && message.trim() !== ""

  const handleSend = async () => {
    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMessage =
          data.message || "Gửi tin nhắn thất bại, vui lòng thử lại"
        setResult({ success: false, message: errorMessage })
        toast.error(errorMessage)
        return
      }

      setResult({ success: true, message: data.message })
      toast.success(data.message ?? "Gửi tin nhắn thành công")
    } catch {
      const errorMessage = "Không thể kết nối tới server"
      setResult({ success: false, message: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Test gửi tin nhắn (Telegram)
        </h1>
        <p className="text-muted-foreground text-sm">
          Trang thử nghiệm cho API <code>/api/telegram</code> — gửi tin nhắn
          tới cá nhân, group hoặc channel thông qua Telegram Bot API.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" />
            Soạn tin nhắn
          </CardTitle>
          <CardDescription>
            Chọn loại đích gửi, nhập Chat ID và nội dung rồi bấm gửi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={destination}
            onValueChange={(value) => {
              setDestination(value as Destination)
              setResult(null)
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              {(
                Object.entries(destinationConfig) as [
                  Destination,
                  (typeof destinationConfig)[Destination],
                ][]
              ).map(([key, cfg]) => (
                <TabsTrigger key={key} value={key}>
                  <cfg.icon className="size-4" />
                  {cfg.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(destinationConfig) as Destination[]).map((key) => (
              <TabsContent key={key} value={key} className="mt-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`chatId-${key}`}>Chat ID</Label>
                    <Input
                      id={`chatId-${key}`}
                      placeholder={destinationConfig[key].placeholder}
                      value={chatIds[key]}
                      onChange={(event) =>
                        setChatIds((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    <p className="text-muted-foreground text-xs">
                      {destinationConfig[key].hint}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`message-${key}`}>Nội dung</Label>
                    <Textarea
                      id={`message-${key}`}
                      rows={6}
                      placeholder="Nội dung tin nhắn..."
                      value={messages[key]}
                      onChange={(event) =>
                        setMessages((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <Button
            onClick={handleSend}
            disabled={!isFormValid || isSending}
            className="mt-4 w-fit"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Gửi tin nhắn tới {config.label}
          </Button>

          {result && (
            <p
              className={
                result.success
                  ? "mt-3 text-sm text-green-600 dark:text-green-500"
                  : "mt-3 text-sm text-destructive"
              }
            >
              {result.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
