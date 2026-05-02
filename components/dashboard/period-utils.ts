export function parsePeriodParam(raw: string | string[] | undefined) {
  if (!raw) return "mes"

  const value = Array.isArray(raw) ? raw[0] : raw

  if (value === "semana" || value === "mes" || value === "ano") {
    return value
  }

  return "mes"
}