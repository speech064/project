// 날짜 도구 — 모두 한국 시간(KST) 기준
export const FORECAST_RANGE = { back: 92, ahead: 15 } // Open-Meteo 예보 API 가 제공하는 범위(일)

export const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const isDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))

// 'YYYY-MM-DD' 문자열은 사전순 비교가 곧 날짜 비교
export function inForecastRange(date) {
  const t = todayKst()
  return date >= addDays(t, -FORECAST_RANGE.back) && date <= addDays(t, FORECAST_RANGE.ahead)
}

export function dayOfYear(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5)
}

export const hm = (minutes) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
