import { z } from "zod"

// Customer schema with RLS (Row-Level Security) userId field.
// Each customer record is owned by the authenticated user who created it.
export const customerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  serviceName: z.string(),
  status: z.string(),
  priority: z.string(),
  userId: z.string(),
  createdAt: z.string().optional(),
})

export type Customer = z.infer<typeof customerSchema>
