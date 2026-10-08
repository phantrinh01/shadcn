import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const SendTelegramSchema = z.object({
  chatId: z.string().min(1, "Chat ID không được để trống").optional(),
  message: z
    .string()
    .min(1, "Nội dung không được để trống")
    .max(4096, "Nội dung không được vượt quá 4096 ký tự"),
  parseMode: z.enum(["HTML", "Markdown", "MarkdownV2"]).optional(),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Thiếu cấu hình TELEGRAM_BOT_TOKEN trên server",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, message: "Body không phải JSON hợp lệ" },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const parsed = SendTelegramSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const { message, parseMode } = parsed.data
  const chatId = parsed.data.chatId

  if (!chatId) {
    return NextResponse.json(
      {
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: {
          chatId: ["Cần cung cấp chatId"],
        },
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const telegramResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        ...(parseMode ? { parse_mode: parseMode } : {}),
      }),
    }
  )

  const telegramData = await telegramResponse.json()

  if (!telegramResponse.ok || !telegramData.ok) {
    return NextResponse.json(
      {
        success: false,
        message: telegramData.description ?? "Gửi tin nhắn Telegram thất bại",
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(
    {
      success: true,
      message: "Gửi tin nhắn thành công",
      data: { messageId: telegramData.result?.message_id },
    },
    { status: 201, headers: CORS_HEADERS }
  )
}
