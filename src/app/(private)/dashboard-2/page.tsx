import { MetricsOverview } from "@/modules/dashboard-2/components/metrics-overview"
import { SalesChart } from "@/modules/dashboard-2/components/sales-chart"
import { RevenueBreakdown } from "@/modules/dashboard-2/components/revenue-breakdown"
import { RecentTransactions } from "@/modules/dashboard-2/components/recent-transactions"
import { TopProducts } from "@/modules/dashboard-2/components/top-products"
import { CustomerInsights } from "@/modules/dashboard-2/components/customer-insights"
import { QuickActions } from "@/modules/dashboard-2/components/quick-actions"
import { getDashboard2Data } from "@/modules/dashboard-2/services/dashboard-2-services"

export default function Dashboard2() {
  const data = getDashboard2Data()

  return (
    <div className="flex-1 space-y-6 px-6 pt-0">
      {/* Enhanced Header */}

      <div className="flex md:flex-row flex-col md:items-center justify-between gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Business Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your business performance and key metrics in real-time
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Main Dashboard Grid */}
      <div className="@container/main space-y-6">
        {/* Top Row - Key Metrics */}

        <MetricsOverview metrics={data.metrics} />

        {/* Second Row - Charts in 6-6 columns */}
        <div className="grid gap-6 grid-cols-1 @5xl:grid-cols-2">
          <SalesChart salesData={data.salesData} />
          <RevenueBreakdown revenueBreakdown={data.revenueBreakdown} />
        </div>

        {/* Third Row - Two Column Layout */}
        <div className="grid gap-6 grid-cols-1 @5xl:grid-cols-2">
          <RecentTransactions transactions={data.transactions} />
          <TopProducts products={data.products} />
        </div>

        {/* Fourth Row - Customer Insights and Team Performance */}
        <CustomerInsights
          customerGrowth={data.customerGrowth}
          demographics={data.demographics}
          regions={data.regions}
          metrics={data.customerInsightMetrics}
        />
      </div>
    </div>
  )
}