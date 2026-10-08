import { z } from "zod"

// Metrics
export const MetricSchema = z.object({
  title: z.string(),
  value: z.string(),
  description: z.string(),
  change: z.string(),
  trend: z.enum(["up", "down"]),
  iconKey: z.enum(["DollarSign", "Users", "ShoppingCart", "BarChart3"]),
  footer: z.string(),
  subfooter: z.string(),
})
export type Metric = z.infer<typeof MetricSchema>

// Sales chart
export const SalesDataPointSchema = z.object({
  month: z.string(),
  sales: z.number(),
  target: z.number(),
})
export type SalesDataPoint = z.infer<typeof SalesDataPointSchema>

// Revenue breakdown
export const RevenueBreakdownItemSchema = z.object({
  category: z.enum(["subscriptions", "sales", "services", "partnerships"]),
  label: z.string(),
  value: z.number(),
  amount: z.number(),
})
export type RevenueBreakdownItem = z.infer<typeof RevenueBreakdownItemSchema>

// Transactions
export const TransactionSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerAvatar: z.string().url(),
  amount: z.string(),
  status: z.enum(["completed", "pending", "failed"]),
  date: z.string(),
})
export type Transaction = z.infer<typeof TransactionSchema>

// Top products
export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sales: z.number(),
  revenue: z.string(),
  growth: z.string(),
  rating: z.number(),
  stock: z.number(),
  category: z.string(),
})
export type Product = z.infer<typeof ProductSchema>

// Customer growth
export const CustomerGrowthPointSchema = z.object({
  month: z.string(),
  new: z.number(),
  returning: z.number(),
  churn: z.number(),
})
export type CustomerGrowthPoint = z.infer<typeof CustomerGrowthPointSchema>

// Demographics
export const DemographicRowSchema = z.object({
  ageGroup: z.string(),
  customers: z.number(),
  percentage: z.string(),
  growth: z.string(),
  growthColor: z.string(),
})
export type DemographicRow = z.infer<typeof DemographicRowSchema>

// Regions
export const RegionRowSchema = z.object({
  region: z.string(),
  customers: z.number(),
  revenue: z.string(),
  growth: z.string(),
  growthColor: z.string(),
})
export type RegionRow = z.infer<typeof RegionRowSchema>

// Customer insights key metrics
export const CustomerInsightMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.string(),
  trendDirection: z.enum(["up", "down"]),
})
export type CustomerInsightMetric = z.infer<typeof CustomerInsightMetricSchema>

// Aggregate root
export const Dashboard2DataSchema = z.object({
  metrics: z.array(MetricSchema),
  salesData: z.array(SalesDataPointSchema),
  revenueBreakdown: z.array(RevenueBreakdownItemSchema),
  transactions: z.array(TransactionSchema),
  products: z.array(ProductSchema),
  customerGrowth: z.array(CustomerGrowthPointSchema),
  demographics: z.array(DemographicRowSchema),
  regions: z.array(RegionRowSchema),
  customerInsightMetrics: z.array(CustomerInsightMetricSchema),
  lastUpdated: z.string(),
})
export type Dashboard2Data = z.infer<typeof Dashboard2DataSchema>