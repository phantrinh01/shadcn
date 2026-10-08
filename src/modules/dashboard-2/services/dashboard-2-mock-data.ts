import { Dashboard2DataSchema, type Dashboard2Data } from "./types/dashboard-2-types"
import dashboardDataJson from "./data/dashboard-data.json"

// Validate at module load time — fails fast if JSON drifts from schema
export const dashboard2MockData: Dashboard2Data = Dashboard2DataSchema.parse(dashboardDataJson)