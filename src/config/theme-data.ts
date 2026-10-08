import { themePresets } from "@/utils/theme-presets"
import type { ColorTheme } from "@/types/theme-customizer"

// Curated theme presets for the customizer dropdown (single unified list)
export const themes: ColorTheme[] = Object.entries(themePresets).map(
  ([key, preset]) => ({
    name: preset.label || key,
    value: key,
    preset: preset,
  })
)
