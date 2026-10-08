import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const SendMailSchema = z.object({
  to: z.union([
    z.email("Email không hợp lệ"),
    z.array(z.email("Email không hợp lệ")).min(1),
  ]),
  subject: z
    .string()
    .min(1, "Tiêu đề không được để trống")
    .max(200, "Tiêu đề quá dài"),
  html: z.string().min(1, "Nội dung không được để trống").optional(),
  text: z.string().min(1, "Nội dung không được để trống").optional(),
  from: z.string().min(1, "Người gửi không được để trống").optional(),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "Thiếu cấu hình RESEND_API_KEY trên server" },
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

  const parsed = SendMailSchema.safeParse(body)
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

  const { to, subject, html, text, from } = parsed.data

  if (!html && !text) {
    return NextResponse.json(
      {
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors: { html: ["Cần cung cấp html hoặc text"] },
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: from ?? "claudecode@ngothanhtung.com",
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  } as Parameters<typeof resend.emails.send>[0])

  if (error) {
    return NextResponse.json(
      { success: false, message: error.message ?? "Gửi email thất bại" },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(
    { success: true, message: "Gửi email thành công", data: { id: data?.id } },
    { status: 201, headers: CORS_HEADERS }
  )
}
