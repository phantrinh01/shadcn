import { dashboardMockData } from "./dashboard-mock-data"

export async function getDashboardData() {
  return {
    data: dashboardMockData.data,
    pastPerformanceData: dashboardMockData.pastPerformanceData,
    keyPersonnelData: dashboardMockData.keyPersonnelData,
    focusDocumentsData: dashboardMockData.focusDocumentsData,
  }
}