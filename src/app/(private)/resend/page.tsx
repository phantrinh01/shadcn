"use client"

import { useState } from "react"
import { Loader2, Mail, Send } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"

export default function ResendTestPage() {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("Email test từ Resend")
  const [message, setMessage] = useState(
    "<p>Đây là email test được gửi từ trang <strong>/resend</strong>.</p>"
  )
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleSend = async () => {
    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch("/api/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          html: message,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMessage =
          data.message || "Gửi email thất bại, vui lòng thử lại"
        setResult({ success: false, message: errorMessage })
        toast.error(errorMessage)
        return
      }

      setResult({ success: true, message: data.message })
      toast.success(data.message ?? "Gửi email thành công")
    } catch {
      const errorMessage = "Không thể kết nối tới server"
      setResult({ success: false, message: errorMessage })
      toast.error(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  const isFormValid = to.trim() !== "" && subject.trim() !== "" && message.trim() !== ""

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Test gửi email (Resend)
        </h1>
        <p className="text-muted-foreground text-sm">
          Trang thử nghiệm cho API <code>/api/resend</code> — gửi email trực
          tiếp từ server thông qua Resend.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4" />
            Soạn email
          </CardTitle>
          <CardDescription>
            Điền thông tin bên dưới và bấm gửi để kiểm tra API resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="to">Người nhận</Label>
            <Input
              id="to"
              type="email"
              placeholder="example@email.com"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subject">Tiêu đề</Label>
            <Input
              id="subject"
              placeholder="Tiêu đề email"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="message">Nội dung (hỗ trợ HTML)</Label>
            <Textarea
              id="message"
              rows={8}
              placeholder="Nội dung email..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!isFormValid || isSending}
            className="w-fit"
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Gửi email
          </Button>

          {result && (
            <p
              className={
                result.success
                  ? "text-sm text-green-600 dark:text-green-500"
                  : "text-sm text-destructive"
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
